const {test,expect}=require('@playwright/test');
async function details(page,id='series',query='') {
  await page.goto('/'+query+'#/details?id='+id);
  await expect(page.locator('body')).toHaveClass(/cinematic-details/);
}

test('title details have a compact poster and actions beside it, with sections below',async({page},info)=>{
  await details(page);
  await expect(page.locator('.cinematicDetailPlayLabel')).toHaveText('Play');
  await expect(page.locator('.detailLogo')).toBeHidden();
  await expect(page.locator('.btnReplay')).toBeHidden();
  // Jellyfin caches hidden detail pages in the same animation root. Select the
  // visible page and remove only the plugin's additions from cached pages.
  await page.evaluate(()=>{const p=document.querySelector('#itemDetailPage'),cached=p.cloneNode(true);cached.classList.add('hide');p.before(cached);});
  await expect(page.locator('.cinematicDetailPage')).toHaveCount(1);
  await expect(page.locator('.cinematicDetailPlayLabel')).toHaveCount(1);
  await expect(page.locator('.cinematicDetailPage .cardBox').first()).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  const layout=await page.evaluate(()=>{const p=document.querySelector('.cinematicDetailPage'),box=s=>p.querySelector(s).getBoundingClientRect();return{
    poster:box('.detailPagePrimaryContainer>.detailImageContainer .card'),title:box('.nameContainer'),
    actions:box('.mainDetailButtons'),sections:box('#listChildrenCollapsible'),
    ribbon:getComputedStyle(p.querySelector('.detailRibbon')).backgroundColor,
    ribbonImage:getComputedStyle(p.querySelector('.detailRibbon')).backgroundImage,
    width:document.documentElement.scrollWidth,viewport:innerWidth,pageWidth:p.scrollWidth,
    pageClient:p.clientWidth};});
  expect(layout.poster.width).toBeLessThanOrEqual(250);
  expect(layout.title.x).toBeGreaterThan(layout.poster.x+layout.poster.width);
  expect(layout.actions.y).toBeGreaterThan(layout.title.y);
  expect(layout.sections.y).toBeGreaterThanOrEqual(layout.poster.y+layout.poster.height);
  expect(layout.ribbon).toBe('rgba(0, 0, 0, 0)');
  expect(layout.ribbonImage).toBe('none');
  expect(layout.width).toBeLessThanOrEqual(layout.viewport);
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.pageClient);
  const nav=page.getByRole('navigation',{name:'Library navigation'});
  if(info.project.name==='desktop') {await expect(nav).toBeVisible();await expect(nav.locator('[aria-current=page]')).toHaveText('Anime');}
  else await expect(nav).toBeHidden();
});

test('season episodes use a responsive thumbnail grid and retain native actions',async({page},info)=>{
  await details(page,'season');
  await expect(page.getByRole('heading',{name:'6 Episodes',exact:true})).toBeVisible();
  await expect(page.locator('.cinematicDetailEpisodes>.listItem')).toHaveCount(6);
  const geometry=await page.locator('.cinematicDetailEpisodes>.listItem').evaluateAll(items=>items.slice(0,4).map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width}}));
  if(info.project.name==='desktop') {expect(geometry[0].y).toBe(geometry[2].y);expect(geometry[3].y).toBeGreaterThan(geometry[0].y);}
  else expect(geometry[1].y).toBeGreaterThan(geometry[0].y);
  const first=page.locator('.listItem').first();
  await first.getByRole('button',{name:'Info',exact:true}).press('Enter');
  await expect(page.getByRole('dialog',{name:'Info',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await first.getByRole('button',{name:'Add to favorites',exact:true}).click();
  await expect(first.getByRole('button',{name:'Remove from favorites',exact:true})).toBeVisible();
  await first.getByRole('button',{name:'Mark played',exact:true}).click();
  await expect(first.getByRole('button',{name:'Mark unplayed',exact:true})).toBeVisible();
  await first.getByRole('button',{name:'More',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'More',exact:true})).toBeVisible();
});

test('native detail Play and episode Play reach the player and clean up details styling',async({page})=>{
  await details(page);
  await page.locator('.mainDetailButtons').getByRole('button',{name:'Play',exact:true}).press('Enter');
  await expect(page.locator('body')).toHaveClass(/cinematic-player/);
  await expect(page.locator('body')).not.toHaveClass(/cinematic-details/);
  await expect(page.locator('.cinematicDetailPlayLabel,#cinematicLibraryNav,.cinematicLibraryShell')).toHaveCount(0);
  await details(page,'season');
  await page.getByRole('button',{name:'Play episode 1',exact:true}).click();
  await expect(page).toHaveURL(/#\/video/);
  await expect(page.locator('.cinematicDetailEpisodesHeading')).toHaveCount(0);
});

test('native series season navigation and library destinations cleanly restore each shell',async({page},info)=>{
  await details(page);
  await page.getByRole('link',{name:'Season 1',exact:true}).first().press('Enter');
  await expect(page.getByRole('heading',{name:'6 Episodes'})).toBeVisible();
  await page.getByRole('heading',{name:'Northern Lights',exact:true}).getByRole('link').press('Enter');
  await expect(page.locator('.cinematicDetailEpisodesHeading')).toHaveCount(0);
  await expect(page.locator('.cinematicDetailPlayLabel')).toHaveCount(1);
  await page.getByRole('link',{name:'Movies',exact:true}).press('Enter');
  await expect(page.locator('body')).toHaveClass(/cinematic-library/);
  await expect(page.locator('body')).not.toHaveClass(/cinematic-details/);
  await expect(page.locator('.cinematicDetailPage')).toHaveCount(0);
  if(info.project.name==='desktop')await expect(page.locator('#cinematicLibraryNav [aria-current=page]')).toHaveText('Movies');
});

test('appearance opt-out, TV and unknown details structure retain native geometry',async({page})=>{
  for(const query of ['?detailsLayout=off','?theme=off','?layout=tv','?detailsShape=unknown']) {
    await page.goto('/'+query+'#/details?id=series');
    await expect(page.locator('body')).not.toHaveClass(/cinematic-details/);
    await expect(page.locator('.cinematicDetailPlayLabel,#cinematicLibraryNav')).toHaveCount(0);
    await expect(page.locator('.detailPagePrimaryContainer')).toHaveCSS('display','block');
  }
  await details(page,'series','?libraryLayout=off');
  await expect(page.locator('#cinematicLibraryNav')).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Anime',exact:true})).toBeVisible();
  await expect(page.locator('.cinematicDetailPlayLabel')).toHaveCount(1);
});

test('unknown episode rows keep the native list while known title details remain themed',async({page})=>{
  await details(page,'season','?episodesShape=unknown');
  await expect(page.locator('.cinematicDetailEpisodes,.cinematicDetailEpisodesHeading')).toHaveCount(0);
  await expect(page.locator('#childrenContent .itemsContainer')).toHaveCSS('display','block');
});

test('returning Home removes the details backdrop styles and restores one hero',async({page})=>{
  await details(page,'season');
  await page.getByRole('link',{name:'Back to Home',exact:true}).click();
  await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready','1');
  await expect(page.locator('#cinematicHero')).toHaveCount(1);
  await expect(page.locator('body')).not.toHaveClass(/cinematic-details/);
  await expect(page.locator('.cinematicDetailPage,.cinematicDetailEpisodes,.cinematicDetailPlayLabel,#cinematicLibraryNav')).toHaveCount(0);
});
