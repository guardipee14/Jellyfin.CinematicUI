const { test, expect } = require('@playwright/test');

async function featuredHome(page, count, { longTitle = false, query = '' } = {}) {
  const items = Array.from({ length: count }, (_, index) => ({
    Id: `layout-${index}`, Name: longTitle
      ? `The extraordinary adventures of a traveller beyond the distant mountains — chapter ${index + 1}`
      : `Featured title ${index + 1}`,
    Type: 'Series', ProductionYear: 2026, OfficialRating: 'TV-PG', Genres: ['Adventure'],
    Overview: 'Synthetic featured media for responsive homepage checks.',
    BackdropImageTags: ['fixture'], ImageTags: longTitle ? {} : { Logo: 'fixture' }, RunTimeTicks: 14400000000
  }));
  await page.route('**/Users/*/Items?*', route => route.fulfill({ json: { Items: items } }));
  await page.route('**/Items/Latest?*', route => route.fulfill({ json: items }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/?heroCount=${count}${query}#home`);
  await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready', '1');
  return items;
}

async function expectMobileLayout(page, dots = true, arrows = true) {
  const geometry = await page.locator('#cinematicHero').evaluate(hero => {
    const rect = element => {
      const { top, bottom, left, right, width, height } = element.getBoundingClientRect();
      return { top, bottom, left, right, width, height };
    };
    const strip = hero.querySelector('.cinematicHeroDots');
    return {
      hero: rect(hero), content: rect(hero.querySelector('.cinematicHeroContent')),
      actions: rect(hero.querySelector('.cinematicHeroActions')), rotation: rect(hero.querySelector('.cinematicHeroRotation')),
      nav: rect(hero.querySelector('.cinematicHeroNav')), dots: rect(strip),
      stripOverflow: strip.scrollWidth > strip.clientWidth,
      contentOverflow: hero.querySelector('.cinematicHeroContent').scrollWidth > hero.querySelector('.cinematicHeroContent').clientWidth,
      controls: Array.from(hero.querySelectorAll('button')).filter(button => button.getClientRects().length).map(rect),
      pageOverflow: document.documentElement.scrollWidth > innerWidth, viewportWidth: innerWidth
    };
  });
  expect(geometry.pageOverflow).toBe(false);
  expect(geometry.contentOverflow).toBe(false);
  expect(geometry.rotation.bottom).toBeLessThanOrEqual(geometry.content.top);
  if (arrows) {
    expect(geometry.nav.bottom).toBeLessThanOrEqual(geometry.content.top);
    expect(geometry.rotation.right).toBeLessThanOrEqual(geometry.nav.left);
  }
  if (dots) {
    expect(geometry.stripOverflow).toBe(false);
    expect(geometry.dots.top).toBeGreaterThanOrEqual(geometry.actions.bottom + 8);
  }
  for (const control of geometry.controls) {
    expect(control.left).toBeGreaterThanOrEqual(geometry.hero.left);
    expect(control.right).toBeLessThanOrEqual(Math.min(geometry.hero.right, geometry.viewportWidth) + 1);
    expect(control.top).toBeGreaterThanOrEqual(geometry.hero.top);
    expect(control.bottom).toBeLessThanOrEqual(geometry.hero.bottom + 1);
    expect(control.width).toBeGreaterThanOrEqual(24);
    expect(control.height).toBeGreaterThanOrEqual(24);
  }
}

for (const [width, height, count] of [[390, 844, 12], [320, 740, 30], [768, 1024, 30], [915, 412, 30]]) {
  test(`featured controls fit ${width}px with ${count} titles without covering actions or scrolling sideways`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const items = await featuredHome(page, count);
    await expect(page.locator('.cinematicHeroDot')).toHaveCount(count);
    await expectMobileLayout(page);
    // The initial title is randomized; select a different title using a real pointer click.
    const targetId = await page.locator('.cinematicHeroDot[aria-current="false"]').last().getAttribute('data-item-id');
    const target = items.find(item => item.Id === targetId);
    const last = page.getByRole('button', { name: `Show ${target.Name}`, exact: true });
    await last.click();
    await expect(page.locator('.cinematicHeroTitle')).toHaveText(target.Name);
    await expect(last).toHaveAttribute('aria-current', 'true');
    await page.getByRole('button', { name: 'More Info', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Fixture details' })).toBeVisible();
  });
}

test('larger text and long titles grow the mobile hero without clipping its controls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await featuredHome(page, 30, { longTitle: true });
  await page.addStyleTag({ content: 'html{font-size:200%}' });
  await expectMobileLayout(page);
  await page.getByRole('button', { name: 'Resume rotation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause rotation', exact: true })).toBeVisible();
  await expectMobileLayout(page);
});

test('configured hidden carousel controls leave mobile actions reachable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await featuredHome(page, 12, { query: '&dots=off&arrows=off' });
  await expect(page.locator('.cinematicHeroDots')).toBeHidden();
  await expect(page.locator('.cinematicHeroNav')).toBeHidden();
  await expectMobileLayout(page, false, false);
  await page.getByRole('button', { name: 'More Info', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fixture details' })).toBeVisible();
});
