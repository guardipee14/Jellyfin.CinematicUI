const { test, expect } = require('@playwright/test');

async function home(page, query = '') {
  await page.goto('/' + query + '#home');
  await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready', '1');
}

test('slide selection retains keyboard focus and exposes the current title', async ({ page }) => {
  await home(page);
  const title = await page.locator('.cinematicHeroTitle').innerText();
  const target = title === 'Alpine Journey' ? 'City of Clouds' : 'Alpine Journey';
  const dot = page.getByRole('button', { name: 'Show ' + target, exact: true });
  await dot.press('Enter');
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(target);
  await expect(dot).toBeFocused();
  await expect(dot).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('.cinematicHeroDot[aria-current="true"]')).toHaveCount(1);
});

test('keyboard focus pauses rotation even when hover pause is disabled', async ({ page }) => {
  await page.clock.install();
  await home(page, '?hover=off');
  await page.getByRole('button', { name: 'Next featured title' }).focus();
  const title = await page.locator('.cinematicHeroTitle').innerText();
  await page.clock.fastForward(6000);
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(title);
  await page.getByRole('button', { name: 'Outside hero' }).focus();
  await page.clock.fastForward(6000);
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(title);
  await page.getByRole('button', { name: 'Resume rotation', exact: true }).press('Enter');
  await page.clock.fastForward(6000);
  await expect(page.locator('.cinematicHeroTitle')).not.toHaveText(title);
});

test('pointer pause/resume keeps the intended action through focus events', async ({ page }) => {
  await home(page);
  await page.getByRole('button', { name: 'Pause rotation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume rotation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause rotation', exact: true })).toBeVisible();
});

test('reduced motion starts paused and allows an explicit resume', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await home(page, '?hover=off');
  const title = await page.locator('.cinematicHeroTitle').innerText();
  await page.clock.fastForward(6000);
  await expect(page.locator('.cinematicHeroTitle')).toHaveText(title);
  await page.getByRole('button', { name: 'Resume rotation', exact: true }).press('Enter');
  await page.clock.fastForward(6000);
  await expect(page.locator('.cinematicHeroTitle')).not.toHaveText(title);
});

test('detail navigation restores a single usable hero', async ({ page }) => {
  await home(page);
  await page.getByRole('button', { name: 'More Info', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fixture details' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to Home' }).click();
  await expect(page.locator('#cinematicHero')).toHaveCount(1);
  await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready', '1');
  await expect(page.getByRole('button', { name: 'More Info', exact: true })).toBeVisible();
});

test('modern Jellyfin navigation hiding remains cosmetic and configurable', async ({ page }) => {
  await home(page, '?hideNavigation=yes');
  await expect(page.getByRole('link', { name: 'Other Videos' })).toBeHidden();
  await expect(page.getByRole('link', { name: 'Movies', exact: true })).toBeVisible();
  await home(page);
  await expect(page.getByRole('link', { name: 'Other Videos' })).toBeVisible();
});
