const { test, expect } = require('@playwright/test');

test('login branding hiding handles the modern React header and its opt-out', async ({ page }) => {
  await page.goto('/#login');
  await expect(page.locator('body')).toHaveClass(/cinematic-login-hide-header/);
  await expect(page.getByRole('link', { name: 'Jellyfin branding' })).toBeHidden();
  await expect(page.getByRole('heading', { name: "Who's watching?", exact: true })).toBeVisible();
  await page.goto('/?branding=show#login');
  await expect(page.getByRole('link', { name: 'Jellyfin branding' })).toBeVisible();
});

test('all profile choices and recovery controls remain reachable on a small screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/?profiles=many#login');
  await expect(page.locator('body')).toHaveClass(/cinematic-login/);
  await page.locator('#loginPage').hover({ position: { x: 10, y: 300 } });
  await page.mouse.wheel(0, 2000);
  await expect(page.getByRole('button', { name: 'Forgot Password' })).toBeInViewport();
  await page.getByRole('button', { name: 'Guest 12', exact: true }).focus();
  await expect(page.getByRole('button', { name: 'Guest 12', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Forgot Password' }).focus();
  await expect(page.getByRole('button', { name: 'Forgot Password' })).toBeInViewport();
});
