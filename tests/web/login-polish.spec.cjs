const { test, expect } = require('@playwright/test');

test('long server and profile names wrap inside a narrow login screen at 200% text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto('/?longNames=yes&serverTitle=' + 'VeryLongServerName'.repeat(5) + '#login');
  await page.addStyleTag({ content: 'html{font-size:200%}' });
  const geometry = await page.locator('#loginPage').evaluate(login => ({
    overflow: login.scrollWidth > login.clientWidth,
    labels: [...login.querySelectorAll('#divUsers .cardText')].map(label => ({ wraps: getComputedStyle(label).whiteSpace !== 'nowrap', fits: label.scrollWidth <= label.clientWidth }))
  }));
  expect(geometry.overflow).toBe(false);
  for (const label of geometry.labels) { expect(label.wraps).toBe(true); expect(label.fits).toBe(true); }
  await page.getByRole('button', { name: 'Forgot Password', exact: true }).focus();
  await expect(page.getByRole('button', { name: 'Forgot Password', exact: true })).toBeInViewport();
});

test('keyboard profile selection has a visible accent focus and preserves the native form', async ({ page }) => {
  await page.goto('/#login');
  const profile = page.getByRole('button', { name: 'Guest 2', exact: true });
  await profile.focus();
  expect(await profile.evaluate(element => getComputedStyle(element).outlineColor)).toBe('rgb(229, 160, 13)');
  await expect.poll(() => profile.evaluate(element => getComputedStyle(element.querySelector('.cardImage')).borderColor)).toBe('rgb(229, 160, 13)');
  await profile.press('Enter');
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue('Guest 2');
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: "Who's watching?", exact: true })).toBeVisible();
});

test('manual sign-in fits a short narrow viewport with larger text and keeps the native submit handler', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 360 });
  await page.goto('/#login');
  await page.addStyleTag({ content: 'html{font-size:200%}' });
  await page.getByRole('button', { name: 'Sign in with another account', exact: true }).click();
  const geometry = await page.locator('.manualLoginForm').evaluate(form => ({
    fits: form.getBoundingClientRect().right <= innerWidth,
    overflow: form.scrollWidth > form.clientWidth,
    pageOverflow: document.querySelector('#loginPage').scrollWidth > innerWidth
  }));
  expect(geometry.fits).toBe(true); expect(geometry.overflow).toBe(false); expect(geometry.pageOverflow).toBe(false);
  await page.getByLabel('Username', { exact: true }).fill('synthetic-user');
  await page.getByLabel('Password', { exact: true }).fill('fixture-only-password');
  await page.getByRole('checkbox', { name: 'Remember me', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Sign In', exact: true }).press('Enter');
  await expect(page.getByRole('status')).toHaveText('Native sign-in handler reached');
  expect(await page.evaluate(() => window.loginFixture.submits)).toBe(1);
});

test('reduced motion removes profile transforms, transitions and background motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#login');
  const profile = page.getByRole('button', { name: 'Guest 1', exact: true });
  await profile.hover(); await profile.focus();
  const motion = await profile.evaluate(element => ({
    transform: getComputedStyle(element).transform,
    transition: getComputedStyle(element).transitionDuration,
    imageTransition: getComputedStyle(element.querySelector('.cardImage')).transitionDuration,
    animation: getComputedStyle(document.querySelector('#loginPage'), '::after').animationName
  }));
  expect(motion).toEqual({ transform: 'none', transition: '0s', imageTransition: '0s', animation: 'none' });
});

test('the appearance opt-out and SPA route cleanup preserve native login', async ({ page }) => {
  await page.goto('/?loginExperience=off#login');
  await expect(page.locator('body')).not.toHaveClass(/cinematic-login/);
  await expect(page.getByRole('heading', { name: 'Please sign in', exact: true })).toBeVisible();
  await page.goto('/#login');
  await page.evaluate(() => { location.hash = '#home'; });
  await expect(page.locator('body')).not.toHaveClass(/cinematic-login/);
  await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready', '1');
  await page.evaluate(() => { location.hash = '#login'; });
  await expect(page.getByRole('heading', { name: "Who's watching?", exact: true })).toBeVisible();
  await expect(page.locator('#cinematicHero')).toHaveCount(0);
});

test('servers without public profiles keep the manual form and recovery controls', async ({ page }) => {
  await page.goto('/?profiles=none#login');
  await expect(page.getByRole('heading', { name: 'Please sign in', exact: true })).toBeVisible();
  await expect(page.locator('.visualLoginForm')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Forgot Password', exact: true })).toBeVisible();
  await page.getByLabel('Username', { exact: true }).fill('fixture-only');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Native sign-in handler reached');
});

test('Quick Connect, password recovery, server selection and another account keep their handlers', async ({ page }) => {
  await page.goto('/#login');
  for (const [name, action] of [['Use Quick Connect', 'btnQuick'], ['Forgot Password', 'btnForgotPassword'], ['Change Server', 'btnSelectServer']]) {
    await page.getByRole('button', { name, exact: true }).press('Enter');
    expect(await page.evaluate(() => window.loginFixture.action)).toBe(action);
  }
  await page.getByRole('button', { name: 'Guest 1', exact: true }).click();
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue('Guest 1');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in with another account', exact: true }).press('Enter');
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Username', { exact: true })).toBeFocused();
});

test('visible header branding leaves room above long login content', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/?branding=show&profiles=many&longNames=yes&serverTitle=' + 'LongServerName'.repeat(4) + '#login');
  await page.addStyleTag({ content: 'html{font-size:200%}' });
  const geometry = await page.evaluate(() => ({
    top: document.querySelector('.visualLoginForm').getBoundingClientRect().top,
    header: document.querySelector('header').getBoundingClientRect().bottom,
    overflow: document.querySelector('#loginPage').scrollWidth > innerWidth
  }));
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.header + 8);
  expect(geometry.overflow).toBe(false);
});

test('manual controls remain reachable when the viewport becomes shorter', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#login');
  await page.getByRole('button', { name: 'Sign in with another account', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 320 });
  expect(await page.locator('#loginPage').evaluate(element => element.clientHeight)).toBeLessThanOrEqual(320);
  await page.getByLabel('Password', { exact: true }).focus();
  await expect(page.getByLabel('Password', { exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Sign In', exact: true }).focus();
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeInViewport();
});

test('ordinary profiles and manual forms retain readable desktop and phone previews', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#login');
  await page.getByRole('button', { name: 'Guest 1', exact: true }).focus();
  await page.screenshot({ path: testInfo.outputPath('profiles.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sign in with another account', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('manual.png'), fullPage: true });
});
