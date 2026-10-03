const { test, expect } = require('@playwright/test');
const {PNG}=require('pngjs');

async function expectThumbColor(slider,rgb) {
  // Chromium does not expose range-thumb computed styles. Check actual pixels
  // above/below the 3px track so a correctly colored bar cannot mask a blue thumb.
  const png=PNG.sync.read(await slider.screenshot());
  let matching=0;
  for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++) {
    if(Math.abs(y-png.height/2)<3)continue;
    const i=(y*png.width+x)*4;
    if(rgb.every((v,c)=>Math.abs(png.data[i+c]-v)<4))matching++;
  }
  expect(matching).toBeGreaterThan(2);
}

async function player(page, query='') {
  await page.goto('/'+query+'#/video');
  await expect(page.locator('body')).toHaveClass(/cinematic-player/);
  await expect.poll(()=>page.locator('video').evaluate(v=>v.readyState)).toBeGreaterThanOrEqual(1);
}

test('native slider thumbs, volume and React accent controls use configured Plex colors',async({page},info)=>{
  for(const [query,color,channels] of [['','rgb(229, 160, 13)','229 160 13'],['?accent=%23c078e8','rgb(192, 120, 232)','192 120 232']]) {
    await player(page,query);
    await expect(page.locator('.osdPositionSlider')).toHaveCSS('color',color);
    await expectThumbColor(page.locator('.osdPositionSlider'),channels.split(' ').map(Number));
    if(info.project.name==='desktop') await expectThumbColor(page.locator('.osdVolumeSlider'),channels.split(' ').map(Number));
    await expect(page.locator('.osdVolumeSliderContainer .mdl-slider-background-lower')).toHaveCSS('background-color',color);
    expect(await page.locator('body').evaluate(e=>getComputedStyle(e).getPropertyValue('--jf-palette-primary-mainChannel').trim())).toBe(channels);
    await page.goto('/'+query+'#/details?id=series');
    await expect(page.locator('header .MuiButton-textPrimary')).toHaveCSS('color',color);
  }
});

test('disabling global theme restores native blue slider colors',async({page})=>{
  await page.goto('/?theme=off#/video');
  await expect(page.locator('body')).not.toHaveClass(/cinematic-global/);
  await expect(page.locator('.osdPositionSlider')).toHaveCSS('color','rgb(0, 164, 220)');
  await expectThumbColor(page.locator('.osdPositionSlider'),[0,164,220]);
});

test('compact player fits the viewport and the timeline sits above native controls', async ({page},info)=>{
  await player(page);
  await expect(page.locator('.cinematicPlayerTitle')).toHaveText('Northern Lights — S1:E1 — The First Journey');
  await expect(page.getByRole('button',{name:'Picture in picture',exact:true})).toBeVisible();
  const layout=await page.evaluate(()=>{
    const bounds=s=>document.querySelector(s).getBoundingClientRect();
    return {timelineBottom:bounds('.cinematicPlayerTimeline').bottom,transportTop:bounds('.cinematicPlayerTransport').top,
      controlRight:bounds('.cinematicPlayerControls').right,controlsBottom:bounds('.videoOsdBottom').bottom,
      background:getComputedStyle(document.querySelector('.backgroundContainer')).backgroundColor,
      pagesBackground:getComputedStyle(document.querySelector('.mainAnimatedPages')).backgroundColor,
      width:document.documentElement.scrollWidth,viewport:innerWidth,height:innerHeight,
      transportCenter:bounds('.cinematicPlayerTransport').x+bounds('.cinematicPlayerTransport').width/2};
  });
  expect(layout.timelineBottom).toBeLessThanOrEqual(layout.transportTop);
  expect(layout.controlRight).toBeLessThanOrEqual(layout.viewport);
  expect(layout.controlsBottom).toBeLessThanOrEqual(layout.height);
  expect(layout.width).toBeLessThanOrEqual(layout.viewport);
  expect(layout.background).toBe('rgba(0, 0, 0, 0)');
  expect(layout.pagesBackground).toBe('rgba(0, 0, 0, 0)');
  if(info.project.name==='desktop') expect(Math.abs(layout.transportCenter-layout.viewport/2)).toBeLessThan(2);
});

test('native play pause and keyboard seek operate real synthetic video',async({page})=>{
  await player(page);
  await page.getByRole('button',{name:'Play',exact:true}).click();
  await expect.poll(()=>page.locator('video').evaluate(v=>v.paused)).toBe(false);
  await page.getByRole('button',{name:'Pause',exact:true}).press('Enter');
  await expect.poll(()=>page.locator('video').evaluate(v=>v.paused)).toBe(true);
  const seek=page.getByRole('slider',{name:'Playback position'});
  await seek.focus();await seek.press('Home');await seek.press('ArrowRight');
  await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(.5);
});

test('native subtitle audio and settings menu handlers remain operable',async({page})=>{
  await player(page);
  for(const name of ['Subtitles','Audio','Settings']) {
    await page.getByRole('button',{name,exact:true}).click();
    const dialog=page.getByRole('dialog',{name,exact:true});await expect(dialog).toBeVisible();
    await dialog.getByRole('button',{name:'Close',exact:true}).click();await expect(dialog).toHaveCount(0);
  }
});

test('volume and mute retain native behavior where Jellyfin exposes them',async({page},info)=>{
  await player(page);
  const volume=page.getByRole('slider',{name:'Volume'});
  if(info.project.name==='phone') {await expect(volume).toBeHidden();return;}
  await volume.focus();await volume.press('End');await volume.press('ArrowLeft');
  await expect.poll(()=>page.locator('video').evaluate(v=>v.volume)).toBe(.99);
  await page.getByRole('button',{name:'Mute',exact:true}).click();
  await expect.poll(()=>page.locator('video').evaluate(v=>v.muted)).toBe(true);
});

test('fullscreen and episode transitions retain native controls and refresh the title',async({page},info)=>{
  await player(page);
  if(info.project.name==='desktop') {
    await page.getByRole('button',{name:'Full screen',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
    await page.getByRole('button',{name:'Full screen',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
  } else await expect(page.getByRole('button',{name:'Full screen',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Skip to next',exact:true}).click();
  await expect(page.locator('.cinematicPlayerTitle')).toHaveText('Northern Lights — S1:E2 — A New Horizon');
  await expect(page.locator('.cinematicPlayerTitle')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Skip to previous',exact:true})).toBeHidden();
});

test('native hidden-control state is respected and can be shown again',async({page})=>{
  await player(page);
  await page.getByRole('button',{name:'Hide controls',exact:true}).press('Enter');
  await expect(page.getByRole('button',{name:'Play',exact:true})).toBeHidden();
  await page.getByRole('button',{name:'Show controls',exact:true}).press('Enter');
  await expect(page.getByRole('button',{name:'Play',exact:true})).toBeVisible();
  await expect(page.locator('.cinematicPlayerTitle')).toHaveCount(1);
});

test('player opt-out TV mode and unrecognized structures retain the native layout',async({page})=>{
  for(const query of ['?playerLayout=off','?theme=off','?layout=tv','?playerShape=unknown']) {
    await page.goto('/'+query+'#/video');
    await expect(page.locator('body')).not.toHaveClass(/cinematic-player/);
    await expect(page.locator('.cinematicPlayerTitle')).toHaveCount(0);
    await expect(page.locator('.videoOsdBottom')).toHaveCSS('padding-top','120px');
  }
  await page.goto('/?playerTitle=legacy#/video');
  await expect(page.locator('body')).toHaveClass(/cinematic-player/);
  await expect(page.locator('.osdTitle')).toHaveText('Legacy native title');
  await expect(page.locator('.cinematicPlayerTitle')).toHaveCount(0);
});

test('leaving playback clears the player styling and restores the library and Home',async({page})=>{
  await player(page);
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await expect(page.locator('body')).not.toHaveClass(/cinematic-player/);
  await expect(page.locator('.cinematicPlayerTitle')).toHaveCount(0);
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready','1');
  await page.getByRole('link',{name:'Movies',exact:true}).click();
  await expect(page.locator('body')).toHaveClass(/cinematic-library/);
  await expect(page.locator('.cinematicPlayerControls')).toHaveCount(0);
});
