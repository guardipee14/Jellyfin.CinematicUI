const { test, expect } = require('@playwright/test');

async function measure(page) {
  await page.addInitScript(() => {
    window.performanceFixture = { frames: 0, watchdogTicks: 0, created: 0, peak: 0, live: new Set() };
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = callback => raf.call(window, time => {
      window.performanceFixture.frames++;
      callback(time);
    });
    const interval = window.setInterval;
    window.setInterval = (callback, ms, ...args) => interval.call(window, () => {
      if (ms === 2500) window.performanceFixture.watchdogTicks++;
      callback(...args);
    }, ms);
    const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
    URL.createObjectURL = blob => {
      const url = create.call(URL, blob);
      window.performanceFixture.created++;
      window.performanceFixture.live.add(url);
      window.performanceFixture.peak = Math.max(window.performanceFixture.peak, window.performanceFixture.live.size);
      return url;
    };
    URL.revokeObjectURL = url => {
      window.performanceFixture.live.delete(url);
      revoke.call(URL, url);
    };
  });
}

async function ready(page, query = '') {
  await page.goto('/' + query + '#home');
  await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready', '1');
  await page.getByRole('button', { name: 'Outside hero' }).click();
}

test('idle Home settles instead of applying layouts every animation frame', async ({ page }, testInfo) => {
  await measure(page);
  await ready(page, '?hideNavigation=yes');
  // Let the initial artwork fade finish; measure real browser frames, not mocked time.
  await page.waitForTimeout(1100);
  const before = await page.evaluate(() => window.performanceFixture.frames);
  await page.waitForTimeout(1000);
  const frames = await page.evaluate(before => window.performanceFixture.frames - before, before);
  console.log(`${testInfo.project.name}: idle Home applied ${frames} animation frames in 1 second`);
  expect(frames).toBeLessThanOrEqual(4);
  await expect(page.getByRole('heading', { name: 'Recently Added in Movies' })).toBeVisible();
});

test('recent title revisits reuse artwork without repeating API enumeration', async ({ page }) => {
  await measure(page);
  let images = 0, metadata = 0;
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.includes('/Images/')) images++;
    if (path.endsWith('/Views') || path.endsWith('/Items') || path === '/Items/Latest') metadata++;
  });
  await ready(page);
  const original = await page.locator('.cinematicHeroTitle').textContent();
  const dot = page.getByRole('button', { name: 'Show ' + original, exact: true });
  const names = await page.locator('.cinematicHeroDot').evaluateAll(nodes => nodes.map(node => node.title));
  for (const name of names.filter(name => name !== original)) {
    await page.getByRole('button', { name: 'Show ' + name, exact: true }).click();
    await expect(page.locator('.cinematicHeroTitle')).toHaveText(name);
  }
  const firstPass = images, firstMetadata = metadata;
  await dot.click();
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(original);
  expect(images).toBe(firstPass);
  expect(metadata).toBe(firstMetadata);
  await page.waitForTimeout(1100);
  expect(await page.evaluate(() => window.performanceFixture.live.size)).toBeLessThanOrEqual(2);
});

test('a superseded title cancels its pending artwork and keeps the latest title', async ({ page }) => {
  await page.addInitScript(() => {
    window.artworkAborts = 0;
    const fetchOriginal = window.fetch;
    window.fetch = (path, options) => {
      if (String(path).includes('/Images/')) options.signal.addEventListener('abort', () => window.artworkAborts++, { once: true });
      return fetchOriginal(path, options);
    };
  });
  await ready(page);
  const names = await page.locator('.cinematicHeroDot').evaluateAll(nodes => nodes.map(node => node.title));
  const start = await page.locator('.cinematicHeroTitle').textContent();
  const [pendingName, nextName] = names.filter(name => name !== start);
  const pendingId = await page.getByRole('button', { name: 'Show ' + pendingName, exact: true }).getAttribute('data-item-id');
  let release, requested = false;
  const gate = new Promise(resolve => release = resolve);
  await page.route('**/Items/' + pendingId + '/Images/**', async route => {
    requested = true;
    await gate;
    try { await route.continue(); } catch {}
  });
  await page.getByRole('button', { name: 'Show ' + pendingName, exact: true }).click();
  await expect.poll(() => requested).toBeTruthy();
  const before = await page.evaluate(() => window.artworkAborts);
  await page.getByRole('button', { name: 'Show ' + nextName, exact: true }).click();
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(nextName);
  expect(await page.evaluate(() => window.artworkAborts)).toBeGreaterThan(before);
  release();
  await page.waitForTimeout(1100);
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(nextName);
});

test('hidden pages do no layout polling and resume one hero when visible', async ({ page }) => {
  await measure(page);
  await ready(page);
  await page.waitForTimeout(1100);
  expect(await page.evaluate(() => window.performanceFixture.frames)).toBeGreaterThan(0);
  await page.evaluate(() => {
    window.fixtureHidden = true;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.fixtureHidden });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const before = await page.evaluate(() => window.performanceFixture.frames);
  const ticks = await page.evaluate(() => window.performanceFixture.watchdogTicks);
  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => window.performanceFixture.frames)).toBe(before);
  expect(await page.evaluate(() => window.performanceFixture.watchdogTicks)).toBe(ticks);
  await page.evaluate(() => { window.fixtureHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => page.evaluate(() => window.performanceFixture.frames)).toBeGreaterThan(before);
  await expect(page.locator('#cinematicHero')).toHaveCount(1);
});

test('pagehide releases artwork and timers; pageshow restores one fresh Home context', async ({ page }) => {
  await measure(page);
  let metadata = 0;
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/Views')) metadata++; });
  await ready(page);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect(page.locator('#cinematicHero')).toHaveCount(0);
  expect(await page.evaluate(() => window.performanceFixture.live.size)).toBe(0);
  const before = await page.evaluate(() => window.performanceFixture.frames), requests = metadata;
  const ticks = await page.evaluate(() => window.performanceFixture.watchdogTicks);
  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => window.performanceFixture.frames)).toBe(before);
  expect(await page.evaluate(() => window.performanceFixture.watchdogTicks)).toBe(ticks);
  expect(metadata).toBe(requests);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready', '1');
  expect(metadata).toBe(requests + 1);
  await expect(page.locator('#cinematicHero')).toHaveCount(1);
});

test('route changes revoke every visible and fading object URL', async ({ page }) => {
  await measure(page);
  await ready(page);
  const names = await page.locator('.cinematicHeroDot').evaluateAll(nodes => nodes.map(node => node.title));
  for (let i = 0; i < 3; i++) {
    for (const name of names) {
      if (await page.locator('.cinematicHeroTitle').textContent() === name) continue;
      await page.getByRole('button', { name: 'Show ' + name, exact: true }).click();
      await expect(page.locator('.cinematicHeroTitle')).toHaveText(name);
    }
  }
  await page.getByRole('button', { name: 'More Info', exact: true }).click();
  await expect(page.locator('#cinematicHero')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.performanceFixture.live.size)).toBe(0);
  expect(await page.evaluate(() => window.performanceFixture.peak)).toBeLessThanOrEqual(4);
  await page.waitForTimeout(1100);
  expect(await page.evaluate(() => window.performanceFixture.live.size)).toBe(0);
});

test('artwork cache has a bounded entry count and is discarded on account changes', async ({ page }) => {
  let images = 0;
  page.on('request', request => { if (new URL(request.url()).pathname.includes('/Images/')) images++; });
  await ready(page, '?heroCount=8');
  const names = await page.locator('.cinematicHeroDot').evaluateAll(nodes => nodes.map(node => node.title));
  for (const name of names) {
    if (await page.locator('.cinematicHeroTitle').textContent() === name) continue;
    await page.getByRole('button', { name: 'Show ' + name, exact: true }).click();
    await expect(page.locator('.cinematicHeroTitle')).toHaveText(name);
  }
  const firstPass = images;
  await page.getByRole('button', { name: 'Show ' + names[0], exact: true }).click();
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(names[0]);
  expect(images).toBeGreaterThan(firstPass);
  const beforeSwitch = images;
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('jellyfin_credentials'));
    saved.Servers[0].UserId = 'new-user';
    saved.Servers[0].AccessToken = 'new-disposable-token';
    localStorage.setItem('jellyfin_credentials', JSON.stringify(saved));
    document.dispatchEvent(new Event('viewshow'));
  });
  await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready', '1');
  await expect.poll(() => images).toBeGreaterThan(beforeSwitch);
});

test('the cache byte budget evicts large artwork and failed images are retried', async ({ page }) => {
  const large = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><!--' + 'x'.repeat(7 * 1024 * 1024) + '--></svg>';
  let images = 0, failLogo = true, logos = 0;
  await page.route('**/Images/**', route => {
    if (route.request().url().includes('/Logo')) {
      logos++;
      if (failLogo) { failLogo = false; return route.fulfill({ status: 503, body: 'Unavailable' }); }
    }
    images++;
    return route.fulfill({ body: large, contentType: 'image/svg+xml' });
  });
  await ready(page);
  const first = await page.locator('.cinematicHeroTitle').textContent();
  const other = await page.locator('.cinematicHeroDot').evaluateAll((nodes, first) => nodes.find(node => node.title !== first).title, first);
  await page.getByRole('button', { name: 'Show ' + other, exact: true }).click();
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(other);
  const before = images;
  await page.getByRole('button', { name: 'Show ' + first, exact: true }).click();
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(first);
  expect(images).toBeGreaterThan(before);
  expect(logos).toBe(2);
});

test('a late artwork body cannot allocate an object URL after pagehide', async ({ page }) => {
  await measure(page);
  await page.addInitScript(() => {
    const blobOriginal = Response.prototype.blob;
    let first = true;
    Response.prototype.blob = async function () {
      const blob = await blobOriginal.call(this);
      if (first && this.url.includes('/Images/Backdrop/')) {
        first = false;
        window.lateArtworkPending = true;
        await new Promise(resolve => window.finishLateArtwork = resolve);
        window.lateArtworkFinished = true;
      }
      return blob;
    };
  });
  await page.goto('/#home');
  await expect.poll(() => page.evaluate(() => window.lateArtworkPending)).toBeTruthy();
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.finishLateArtwork();
  });
  await expect.poll(() => page.evaluate(() => window.lateArtworkFinished)).toBeTruthy();
  await expect(page.locator('#cinematicHero')).toHaveCount(0);
  expect(await page.evaluate(() => window.performanceFixture.created)).toBe(0);
});
