const {test,expect}=require('@playwright/test');

test('account menu keeps native destinations, keyboard focus, dismissal and sign out',async({page})=>{
  await page.goto('/#home');
  await page.getByRole('button',{name:'User Menu',exact:true}).click();
  const menu=page.locator('.cinematicUserMenu');
  await expect(menu).toBeVisible();
  await expect(page.getByRole('menuitem',{name:'Profile',exact:true})).toBeFocused();
  await page.getByRole('menuitem',{name:'Profile',exact:true}).press('ArrowDown');
  await expect(page.getByRole('menuitem',{name:'Settings',exact:true})).toBeFocused();
  await page.getByRole('menuitem',{name:'Settings',exact:true}).press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole('button',{name:'User Menu',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'User Menu',exact:true}).click();
  await page.getByRole('menuitem',{name:'Sign Out',exact:true}).click();
  await expect(page.locator('#loginPage')).toBeVisible();
  await expect(page.locator('#cinematicHero')).toHaveCount(0);
});

test('profile cards fit desktop and phone while native password handler remains reachable',async({page})=>{
  await page.goto('/#/userprofile?userId=fixture-user');
  await expect(page.locator('.cinematicProfilePage')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Profile',exact:true})).toHaveCount(1);
  await expect.poll(()=>page.locator('#image').evaluate(el=>el.getBoundingClientRect().width)).toBeLessThanOrEqual(112);
  await expect(page.getByLabel('Current password',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Save Password',exact:true}).click();
  await expect(page.locator('#fixtureProfileResult')).toHaveText('Native save handler reached');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('profile opt-out and TV keep native profile and menu geometry',async({page})=>{
  for(const query of ['profileLayout=off','theme=off','layout=tv']){
    await page.goto('/?'+query+'#/userprofile?userId=fixture-user');
    await expect(page.locator('.cinematicProfilePage,.cinematicProfileHeading')).toHaveCount(0);
    await page.getByRole('button',{name:'User Menu',exact:true}).click();
    await expect(page.locator('.cinematicUserMenu')).toHaveCount(0);
    expect(await page.locator('#image').evaluate(el=>el.getBoundingClientRect().width)).toBe(200);
  }
});

async function views(page,items){await page.route('**/Views?*',route=>route.fulfill({json:{Items:items}}));}
const allowed=[{Id:'movies',Name:'Movies',CollectionType:'movies'},{Id:'other',Name:'Other Videos',CollectionType:'mixed'}];
test('misspelled libraries and failed view enumeration retain native Home without root queries or retry storms',async({page})=>{
  await page.clock.install();
  const itemRequests=[];page.on('request',r=>{if(/\/Items\??|\/Items\/Latest/.test(new URL(r.url()).pathname))itemRequests.push(r.url());});
  await views(page,allowed);
  await page.goto('/?heroLibraries=Misspelled#home');
  await page.clock.fastForward(8000);
  await expect(page.locator('#cinematicHero')).toHaveCount(0);expect(itemRequests).toHaveLength(0);
  await page.unroute('**/Views?*');
  let requests=0;await page.route('**/Views?*',route=>{requests++;return route.fulfill({status:503,body:'Unavailable'});});
  await page.goto('/#home');await page.clock.fastForward(8000);
  await expect(page.locator('#cinematicHero')).toHaveCount(0);expect(requests).toBe(1);expect(itemRequests).toHaveLength(0);
});

test('partial matches and blank configuration stay inside resolved eligible libraries',async({page})=>{
  await views(page,allowed);
  const parents=[];page.on('request',r=>{const u=new URL(r.url());if(u.pathname.endsWith('/Items')||u.pathname==='/Items/Latest')parents.push(u.searchParams.get('ParentId'));});
  for(const config of ['Movies,Typo','']){
    parents.length=0;await page.goto('/?heroLibraries='+encodeURIComponent(config)+'#home');
    await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready','1');
    expect(parents.length).toBeGreaterThan(0);expect(new Set(parents)).toEqual(new Set(['movies']));
  }
});

test('played and keyword exclusions apply to all query fallback attempts',async({page})=>{
  await views(page,allowed);
  await page.route('**/Users/*/Items?*',route=>route.fulfill({json:{Items:[{Id:'played',Name:'Already seen',ImageTags:{Primary:'x'},UserData:{Played:true}},{Id:'keyword',Name:'BLOCKED story',ImageTags:{Primary:'x'}},{Id:'good',Name:'Eligible story',ImageTags:{Primary:'x'}}]}}));
  await page.route('**/Items/Latest?*',route=>route.fulfill({json:[]}));
  await page.goto('/?excludePlayed=yes&excluded=blocked#home');
  await expect(page.locator('.cinematicHeroTitle')).toHaveText('Eligible story');
  await expect(page.locator('.cinematicHeroDot')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Next featured title'})).toBeHidden();
});

async function switchUser(page,user='another-user',server='fixture-server',address){await page.evaluate(({user,server,address})=>{
  localStorage.setItem('jellyfin_credentials',JSON.stringify({Servers:[{UserId:user,Id:server,AccessToken:'fixture-'+user,ManualAddress:address||location.origin}]}));
  document.dispatchEvent(new Event('viewshow'));
},{user,server,address});}
test('account switching aborts pending item requests and discards former profile responses',async({page})=>{
  let release;const gate=new Promise(resolve=>release=resolve);let delayed=false;
  await page.route('**/Users/*/Items?*',async route=>{
    if(route.request().url().includes('/fixture-user/')){delayed=true;await gate;try{await route.fulfill({json:{Items:[{Id:'old',Name:'Former profile',ImageTags:{Primary:'x'}}]}});}catch{} }
    else await route.fulfill({json:{Items:[{Id:'new',Name:'Current profile',ImageTags:{Primary:'x'}}]}});
  });
  await page.route('**/Items/Latest?*',route=>route.fulfill({json:[]}));
  await page.goto('/#home');await expect.poll(()=>delayed).toBeTruthy();
  await switchUser(page);await expect(page.locator('.cinematicHeroTitle')).toHaveText('Current profile');
  release();await page.getByRole('button',{name:'Outside hero'}).click();
  await expect(page.locator('.cinematicHeroTitle')).toHaveText('Current profile');
  await page.getByRole('button',{name:'More Info',exact:true}).click();await expect(page).toHaveURL(/id=new/);
});

test('pending artwork cannot paint an old profile after a switch or logout',async({page})=>{
  let release;const gate=new Promise(resolve=>release=resolve);let pending=false;
  await page.route('**/Images/**',async route=>{
    if(route.request().headers()['x-emby-token']==='disposable-fixture-token'){pending=true;await gate;try{await route.continue();}catch{}}
    else await route.continue();
  });
  await page.goto('/#home');await expect.poll(()=>pending).toBeTruthy();
  await switchUser(page);await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready','1');
  release();await page.getByRole('button',{name:'Outside hero'}).click();
  await page.getByRole('button',{name:'User Menu',exact:true}).click();await page.getByRole('menuitem',{name:'Sign Out',exact:true}).click();
  await expect(page.locator('#cinematicHero')).toHaveCount(0);
});

test('repeat history is scoped by user and server and ignores the old shared history',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('cinematic-ui-hero-history',['fixture-0']);
    localStorage.setItem('cinematic-ui-hero-history:fixture-server:fixture-user',JSON.stringify(['fixture-0']));
  });
  await page.goto('/?history=6#home');await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready','1');
  await expect(page.locator('.cinematicHeroTitle')).not.toHaveText('Harbor Lights');
  await switchUser(page);await expect(page.locator('.cinematicHeroTitle')).toHaveText('Harbor Lights');
  await switchUser(page,'fixture-user','another-server');await expect(page.locator('.cinematicHeroTitle')).toHaveText('Harbor Lights');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('cinematic-ui-hero-history:fixture-server:another-user'))[0])).toBe('fixture-0');
});

test('credentials from a different server origin never leave this browser',async({page})=>{
  await page.goto('/#home');await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready','1');
  const sent=[];page.on('request',r=>{if(r.headers()['x-emby-token']==='fixture-foreign-user')sent.push(r.url());});
  await switchUser(page,'foreign-user','foreign-server','https://foreign.invalid');
  await expect(page.locator('#cinematicHero')).toHaveCount(0);expect(sent).toHaveLength(0);
});

test('hero Play reaches the native handler and cancels pending playback after an account switch',async({page})=>{
  await page.clock.install();
  await page.addInitScript(()=>{window.nativePlays=0;document.addEventListener('click',event=>{if(event.target.closest('.btnPlay'))window.nativePlays++;});});
  await page.goto('/#home');await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready','1');
  await page.locator('.cinematicHeroPlay').click();await expect(page.getByRole('heading',{name:'Fixture details'})).toBeVisible();
  await page.clock.runFor(500);expect(await page.evaluate(()=>window.nativePlays)).toBe(1);
  await page.getByRole('link',{name:'Back to Home'}).click();await expect(page.locator('#cinematicHero')).toHaveAttribute('data-ready','1');
  await page.clock.pauseAt(new Date(Date.now()+1000));
  await page.locator('.cinematicHeroPlay').click();await expect(page.getByRole('heading',{name:'Fixture details'})).toBeVisible();
  await switchUser(page);await page.clock.runFor(500);expect(await page.evaluate(()=>window.nativePlays)).toBe(1);
});
