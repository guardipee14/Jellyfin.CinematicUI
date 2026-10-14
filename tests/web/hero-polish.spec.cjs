const { test, expect } = require('@playwright/test');

test.use({ hasTouch: true });

async function home(page, { longTitle = false, query = '', reducedMotion = 'reduce' } = {}) {
  await page.emulateMedia({ reducedMotion });
  if (longTitle) {
    const items = Array.from({ length: 30 }, (_, index) => ({
      Id: `polish-${index}`, Name: `The extraordinary adventures of a traveller beyond the distant mountains ${'VeryLongUnbrokenTitle'.repeat(5)} — chapter ${index + 1}`,
      Type: 'Series', ProductionYear: 2026, OfficialRating: 'TV-PG', Genres: ['Adventure'],
      Overview: 'Synthetic artwork and long titles for readable featured-media controls.',
      BackdropImageTags: ['fixture'], ImageTags: {}, RunTimeTicks: 14400000000
    }));
    await page.route('**/Users/*/Items?*', route => route.fulfill({ json: { Items: items } }));
  }
  await page.goto('/?heroCount=30' + query + '#home');
  await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready', '1');
}

for (const [width, height, font] of [[1024, 600, 100], [1001, 740, 200], [1280, 720, 200], [1440, 900, 200], [390, 844, 200]]) {
  test(`featured text and controls remain separate at ${width}px and ${font}% text`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await home(page, { longTitle: true });
    await page.addStyleTag({ content: `html{font-size:${font}%}` });
    const geometry = await page.locator('#cinematicHero').evaluate(hero => {
      const rect = element => {
        const { top, bottom, left, right } = element.getBoundingClientRect();
        return { top, bottom, left, right };
      };
      return {
        hero: rect(hero), title: rect(hero.querySelector('.cinematicHeroTitle')),
        content: rect(hero.querySelector('.cinematicHeroContent')),
        rotation: rect(hero.querySelector('.cinematicHeroRotation')),
        actions: rect(hero.querySelector('.cinematicHeroActions')),
        dots: rect(hero.querySelector('.cinematicHeroDots')),
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
        stripOverflow: hero.querySelector('.cinematicHeroDots').scrollWidth > hero.querySelector('.cinematicHeroDots').clientWidth
      };
    });
    expect(geometry.pageOverflow).toBe(false);
    expect(geometry.stripOverflow).toBe(false);
    expect(geometry.title.top).toBeGreaterThanOrEqual(geometry.hero.top);
    // The mobile content box includes its artwork spacing; its visible title must clear controls.
    expect(geometry.title.top).toBeGreaterThanOrEqual(geometry.rotation.bottom + 8);
    expect(geometry.content.right).toBeLessThanOrEqual(geometry.hero.right);
    expect(geometry.dots.top).toBeGreaterThanOrEqual(geometry.actions.bottom + 8);
    expect(geometry.dots.bottom).toBeLessThanOrEqual(geometry.hero.bottom);
    await page.getByRole('button', { name: 'More Info', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Fixture details' })).toBeVisible();
  });
}

async function swipe(page, from, to) {
  const session = await page.context().newCDPSession(page);
  try {
    // Complete a horizontal browser gesture without leaving synthetic fling input pending.
    await session.send('Input.synthesizeScrollGesture', {
      x: from.x, y: from.y, xDistance: to.x - from.x, yDistance: to.y - from.y,
      speed: 800, gestureSourceType: 'touch', preventFling: true
    });
  } finally { await session.detach(); }
}

async function verticalSwipe(page) {
  const session = await page.context().newCDPSession(page);
  try {
    const point = y => [{ x: 195, y, id: 1, radiusX: 1, radiusY: 1 }];
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(330) });
    for (let step = 1; step <= 6; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(330 - 210 * step / 6) });
      await page.waitForTimeout(20);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await session.detach(); }
}

test('real touch swipes browse both directions without opening details or playback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await home(page);
  const names = await page.locator('.cinematicHeroDot').evaluateAll(nodes => nodes.map(node => node.title));
  const original = await page.locator('.cinematicHeroTitle').textContent();
  const index = names.indexOf(original), next = names[(index + 1) % names.length];
  await swipe(page, { x: 300, y: 220 }, { x: 80, y: 220 });
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(next);
  await expect(page.locator('.cinematicHeroDot[aria-current="true"]')).toHaveAttribute('title', next);
  await swipe(page, { x: 80, y: 220 }, { x: 300, y: 220 });
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(original);
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#home$/);
  expect(await page.locator('video').count()).toBe(0);
});

test('a real vertical touch gesture scrolls native Home without changing the featured title', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await home(page);
  await page.locator('.homeSectionsContainer').evaluate(element => element.style.minHeight = '1800px');
  const original = await page.locator('.cinematicHeroTitle').textContent();
  await verticalSwipe(page);
  await expect.poll(() => page.evaluate(() => document.scrollingElement.scrollTop)).toBeGreaterThan(40);
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(original);
});

test('short, diagonal, cancelled, multi-touch and control gestures do not browse titles', async ({ page }) => {
  await home(page);
  const original = await page.locator('.cinematicHeroTitle').textContent();
  const hero = page.locator('#cinematicHero');
  const start = { pointerType: 'touch', isPrimary: true, pointerId: 1, clientX: 300, clientY: 220 };
  const end = { ...start, clientX: 80 };
  const gestures = [
    [['pointerdown', start], ['pointerup', { ...end, clientX: 260 }]],
    [['pointerdown', start], ['pointerup', { ...end, clientY: 400 }]],
    [['pointerdown', start], ['pointercancel', start], ['pointerup', end]],
    [['pointerdown', start], ['pointerdown', { ...start, pointerId: 2, isPrimary: false }], ['pointerup', end]],
    [['pointerdown', { ...start, pointerType: 'mouse' }], ['pointerup', { ...end, pointerType: 'mouse' }]],
    [['pointerdown', { ...start, pointerType: 'pen' }], ['pointerup', { ...end, pointerType: 'pen' }]]
  ];
  for (const gesture of gestures) {
    for (const [type, event] of gesture) await hero.dispatchEvent(type, event);
    await expect(page.locator('.cinematicHeroTitle')).toHaveText(original);
  }
  await page.clock.install();
  await hero.dispatchEvent('pointerdown', start);
  await page.clock.runFor(1100);
  await hero.dispatchEvent('pointerup', end);
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(original);
  for (const selector of ['.cinematicHeroMore', '.cinematicHeroPlay', '.cinematicHeroDot', '.cinematicHeroNext', '.cinematicHeroRotation']) {
    await page.locator(selector).first().dispatchEvent('pointerdown', start);
    await hero.dispatchEvent('pointerup', end);
    await expect(page.locator('.cinematicHeroTitle')).toHaveText(original);
  }
  await page.getByRole('button', { name: 'More Info', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fixture details' })).toBeVisible();
});

test('touch browsing pauses automatic rotation until an explicit resume', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  await home(page, { query: '&hover=off', reducedMotion: 'no-preference' });
  await expect(page.getByRole('button', { name: 'Pause rotation', exact: true })).toBeVisible();
  const original = await page.locator('.cinematicHeroTitle').textContent();
  await swipe(page, { x: 300, y: 220 }, { x: 80, y: 220 });
  await expect(page.locator('.cinematicHeroTitle')).not.toHaveText(original);
  const selected = await page.locator('.cinematicHeroTitle').textContent();
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
  await page.clock.fastForward(6000);
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(selected);
  await page.getByRole('button', { name: 'Resume rotation', exact: true }).click();
  await page.clock.fastForward(6000);
  await expect(page.locator('.cinematicHeroTitle')).not.toHaveText(selected);
});

test('swiping with hidden navigation retains the native Play action', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.nativePlays = 0;
    document.addEventListener('click', event => { if (event.target.closest('.btnPlay')) window.nativePlays++; });
  });
  await home(page, { query: '&dots=off&arrows=off' });
  const original = await page.locator('.cinematicHeroTitle').textContent();
  await swipe(page, { x: 300, y: 220 }, { x: 80, y: 220 });
  await expect(page.locator('.cinematicHeroTitle')).not.toHaveText(original);
  await expect(page.locator('.cinematicHeroDots')).toBeHidden();
  await expect(page.locator('.cinematicHeroNav')).toBeHidden();
  await page.locator('.cinematicHeroPlay').tap();
  await expect.poll(() => page.evaluate(() => window.nativePlays)).toBe(1);
});

test('an unfinished gesture cannot navigate after credentials change', async ({ page }) => {
  await home(page);
  const original = await page.locator('.cinematicHeroTitle').textContent();
  const result = await page.locator('#cinematicHero').evaluate(hero => {
    const point = { bubbles: true, pointerType: 'touch', isPrimary: true, pointerId: 1, clientY: 220 };
    hero.dispatchEvent(new PointerEvent('pointerdown', { ...point, clientX: 300 }));
    localStorage.setItem('jellyfin_credentials', JSON.stringify({ Servers: [{ UserId: 'new-user', Id: 'fixture-server', AccessToken: 'fixture-new-token', ManualAddress: location.origin }] }));
    hero.dispatchEvent(new PointerEvent('pointerup', { ...point, clientX: 80 }));
    const title = hero.querySelector('.cinematicHeroTitle').textContent;
    document.dispatchEvent(new Event('viewshow'));
    return title;
  });
  expect(result).toBe(original);
  await expect(page.locator('#cinematicHero')).toHaveCount(1);
  await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready', '1');
  await expect(page).toHaveURL(/#home$/);
});

test('a single featured title keeps actions usable without swipe navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/Users/*/Items?*', route => route.fulfill({ json: { Items: [{ Id: 'only-title', Name: 'Only featured title', Type: 'Movie', ImageTags: { Primary: 'fixture' } }] } }));
  await page.route('**/Items/Latest?*', route => route.fulfill({ json: [] }));
  await home(page);
  await swipe(page, { x: 300, y: 220 }, { x: 80, y: 220 });
  await expect(page.locator('.cinematicHeroTitle')).toHaveText('Only featured title');
  await expect(page.locator('.cinematicHeroDots')).toBeHidden();
  await expect(page.locator('.cinematicHeroNav')).toBeHidden();
  await page.getByRole('button', { name: 'More Info', exact: true }).tap();
  await expect(page).toHaveURL(/id=only-title/);
});

test('ordinary featured artwork, controls and native Home rows remain readable', async ({ page }, testInfo) => {
  await home(page);
  await expect(page.getByRole('heading', { name: 'Recently Added in Movies' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'More Info', exact: true })).toBeVisible();
  await expect.poll(() => page.locator('.cinematicHeroBg.active').evaluate(element => getComputedStyle(element).backgroundImage)).not.toBe('none');
  await expect.poll(() => page.locator('#cinematicHero').evaluate(element => getComputedStyle(element).opacity)).toBe('1');
  await page.screenshot({ path: testInfo.outputPath('hero.png'), fullPage: true });
});
