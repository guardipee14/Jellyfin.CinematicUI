const { test, expect } = require('@playwright/test');

async function library(page, query = '') {
  await page.goto('/' + query + '#/tv?topParentId=anime&collectionType=tvshows');
  await expect(page.locator('body')).toHaveClass(/cinematic-library/);
}

test('spaced poster grid has left-aligned captions and fits the viewport', async ({ page }, info) => {
  await library(page);
  const nav = page.getByRole('navigation', { name: 'Library navigation' });
  if (info.project.name === 'desktop') {
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Anime', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'Anime', exact: true })).toBeVisible();
  } else await expect(nav).toBeHidden();
  const layout = await page.evaluate(() => ({
    width: document.querySelector('.portraitCard').getBoundingClientRect().width,
    titleAlign: getComputedStyle(document.querySelector('.cardText')).textAlign,
    captionBackground: getComputedStyle(document.querySelector('.cardBox')).backgroundColor,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: innerWidth
  }));
  expect(layout.width).toBeLessThanOrEqual(166);
  expect(layout.titleAlign).toBe('left');
  expect(layout.captionBackground).toBe('rgba(0, 0, 0, 0)');
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
});

test('native library destinations work by keyboard and refresh current selection', async ({ page }, info) => {
  await library(page);
  await page.getByRole('link', { name: 'Movies', exact: true }).press('Enter');
  await expect(page).toHaveURL(/#\/movies\?topParentId=movies/);
  await expect(page.locator('#cinematicLibraryNav')).toHaveCount(1);
  if (info.project.name === 'desktop') {
    await expect(page.getByRole('heading', { name: 'Movies', exact: true })).toBeVisible();
    await expect(page.locator('#cinematicLibraryNav [aria-current=page]')).toHaveText('Movies');
  }
});

test('filter sort and view controls retain their native handlers', async ({ page }) => {
  await library(page);
  for (const name of ['Filter', 'Sort', 'View settings']) {
    await page.getByRole('button', { name, exact: true }).click();
    const dialog = page.getByRole('dialog', { name, exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
});

test('native list view remains a list and can return to the poster grid', async ({ page }) => {
  await library(page);
  await page.getByRole('button', { name: 'View settings', exact: true }).click();
  await page.getByRole('button', { name: 'List View', exact: true }).click();
  await expect(page.locator('.fixtureList')).toBeVisible();
  await expect(page.locator('.portraitCard')).toHaveCount(0);
  await expect(page.locator('.fixtureList')).toHaveCSS('display', 'block');
  await page.getByRole('button', { name: 'View settings', exact: true }).click();
  await page.getByRole('button', { name: 'Grid View', exact: true }).click();
  await expect(page.locator('.portraitCard')).toHaveCount(24);
  await expect(page.locator('#cinematicLibraryNav')).toHaveCount(1);
});

test('library appearance opt-out retains original navigation and card sizing', async ({ page }) => {
  await page.goto('/?libraryLayout=off#/tv?topParentId=anime&collectionType=tvshows');
  await expect(page.locator('body')).toHaveClass(/cinematic-global/);
  await expect(page.locator('body')).not.toHaveClass(/cinematic-library/);
  await expect(page.locator('#cinematicLibraryNav')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Anime', exact: true })).toBeVisible();
  await expect(page.locator('.portraitCard').first()).toHaveCSS('width', '200px');
});

test('sidebar respects configured navigation exclusions', async ({ page }) => {
  await library(page, '?hideNavigation=yes');
  await expect(page.getByRole('link', { name: 'Other Videos', exact: true })).toBeHidden();
  await expect(page.locator('#cinematicLibraryNav').getByRole('link', { name: 'Other Videos', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Movies', exact: true })).toBeVisible();
});

test('leaving the library removes its sidebar and restores the Home layout', async ({ page }) => {
  await library(page);
  await page.locator('.portraitCard .cardText a').first().click();
  await expect(page.getByRole('heading', { name: 'Fixture details', exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toHaveClass(/cinematic-library/);
  await expect(page.locator('#cinematicLibraryNav')).toHaveCount(0);
  await expect(page.locator('.cinematicLibraryShell')).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to Home' }).click();
  await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready', '1');
  await expect(page.locator('#cinematicHero')).toHaveCount(1);
});
