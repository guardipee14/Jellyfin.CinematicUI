// Disposable UI fixture: real plugin assets, synthetic titles, no production credentials or media.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const playerFixture = require('./player-fixture.cjs');
const detailsFixture = require('./details-fixture.cjs');
const profileFixture = require('./profile-fixture.cjs');

const root = path.resolve(__dirname, '../..');
const items = ['Harbor Lights', 'Alpine Journey', 'City of Clouds'].map((Name, index) => ({
  Id: `fixture-${index}`, Name, Type: 'Movie', ProductionYear: 2026, OfficialRating: 'PG', Genres: ['Adventure'],
  Overview: 'A fictional adventure used to check carousel navigation, readable artwork, and keyboard interaction.',
  BackdropImageTags: ['fixture'], ImageTags: index === 0 ? { Logo: 'fixture' } : {}, RunTimeTicks: 54000000000
}));

function image(label, logo = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${logo ? 600 : 1600}" height="${logo ? 150 : 900}" viewBox="0 0 ${logo ? '600 150' : '1600 900'}">
    <defs><linearGradient id="sky"><stop stop-color="#214e75"/><stop offset="1" stop-color="#c87a42"/></linearGradient></defs>
    ${logo ? '' : '<rect width="1600" height="900" fill="url(#sky)"/><circle cx="1170" cy="240" r="120" fill="#e8c782"/><path d="M0 650L350 300L650 720L980 440L1600 780V900H0Z" fill="#193843"/><path d="M0 800L750 530L1600 850V900H0Z" fill="#10242e"/>'}
    <text x="${logo ? 10 : 850}" y="${logo ? 100 : 510}" fill="white" font-family="sans-serif" font-size="${logo ? 60 : 68}" font-weight="700">${label}</text></svg>`;
}

function html(params) {
  const config = {
    serverTitle: 'CINEMATIC TEST SERVER', heroRotationSeconds: 5, heroAvoidRepeatCount: 0,
    heroMaxItems: Number(params.get('heroCount') || 12),
    heroShowDots: params.get('dots') !== 'off', heroShowNavigationArrows: params.get('arrows') !== 'off',
    heroPauseOnHover: params.get('hover') !== 'off', loginHideHeaderBranding: params.get('branding') !== 'show',
    hiddenNavigationLibraryNames: params.get('hideNavigation') === 'yes' ? 'Other Videos' : '',
    enableLibraryLayout: params.get('libraryLayout') !== 'off',
    enablePlayerLayout: params.get('playerLayout') !== 'off', enableGlobalTheme: params.get('theme') !== 'off',
    enableDetailsLayout: params.get('detailsLayout') !== 'off', accentColor: params.get('accent') || '#e5a00d',
    enableProfileLayout: params.get('profileLayout') !== 'off',
    heroLibraryNames: params.has('heroLibraries') ? params.get('heroLibraries') : 'Anime,Movies,TV Shows',
    heroExcludePlayed: params.get('excludePlayed') === 'yes', heroExcludedTitleKeywords: params.get('excluded') || '',
    heroAvoidRepeatCount: Number(params.get('history') || 0)
  };
  const profiles = Array.from({ length: params.get('profiles') === 'many' ? 12 : 2 }, (_, i) =>
    `<button class="card" type="button"><div class="cardImageContainer"><div class="cardImage" aria-hidden="true">●</div></div><div class="cardFooter"><div class="cardText">Guest ${i + 1}</div></div></button>`).join('');
  return `<!doctype html><html class="${params.get('layout') === 'tv' ? 'layout-tv' : ''}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cinematic UI browser fixture</title>
    <link rel="stylesheet" href="/Web/cinematic.css"><style>
      *{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Arial,sans-serif;background:#0d0d0f;color:#fff}.hide{display:none!important}
      header{position:fixed;top:0;left:0;width:100%;z-index:20;background:#141414}header .MuiToolbar-root{display:flex;align-items:center;padding:0 24px;min-height:48px;gap:12px}header .MuiStack-root{display:flex;align-items:center;gap:20px}header .fixtureHeaderActions{display:flex;align-items:center;justify-content:flex-end;flex:1;gap:8px}header button,header a{border:0;background:transparent;color:#ddd;padding:8px;text-decoration:none}header button{cursor:pointer}header svg{width:20px;height:20px;fill:currentColor}header .fixtureControls{display:flex;gap:8px;align-items:center;margin-left:auto}a{color:#fff}#fixtureSpacer{height:48px}#fixturePage{position:relative;height:calc(100vh - 48px)}.libraryFixture #fixtureSpacer{height:96px}.libraryFixture #fixturePage{height:calc(100vh - 96px)}.verticalSection{padding:20px}.fixtureOutside{margin:20px;padding:10px}
      .libraryPage{position:absolute;inset:0;overflow:auto;padding-bottom:30px}.itemsContainer.vertical-wrap{display:flex;flex-wrap:wrap;padding:0 40px}.portraitCard{width:200px;padding:0}.cardBox{margin:8px;background:#252525}.cardScalable{position:relative}.cardPadder-portrait{padding-top:150%}.cardContent,.cardContent>.cardImageContainer{position:absolute;inset:0}.cardContent img{width:100%;height:100%;object-fit:cover}.cardFooter{padding:8px;text-align:center}.cardFooter a{color:inherit;text-decoration:none}.cardText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cardOverlayContainer{position:absolute;inset:0;opacity:0;background:rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center}.card:hover .cardOverlayContainer{opacity:1}.cardOverlayContainer>a{position:absolute;inset:0}.cardOverlayContainer button{position:relative;z-index:1}.cardIndicators{position:absolute;right:0;top:0;z-index:2}.countIndicator{padding:4px}.fixtureAlphabet{position:fixed;right:7px;top:25%;display:flex;flex-direction:column;gap:9px;font-size:10px;color:#777}.fixtureMenu{position:fixed;z-index:2000;top:25%;left:40%;padding:24px;background:#252525;border:1px solid #666}header button:disabled{opacity:.3}.fixtureRange{font-size:12px;padding:4px 9px;border-radius:15px;background:#303030}
      .MuiMenu-paper{position:fixed;right:16px;top:56px;z-index:2000;background:#303030}.MuiMenuItem-root{display:flex;text-decoration:none;cursor:pointer}.MuiMenu-list{list-style:none;padding:8px}.emby-input{display:block;width:100%;color:inherit}.inputLabel{display:block;margin-bottom:8px}.imagePlaceHolder{position:relative}.cardImage{height:130px;display:grid;place-items:center;background:#147d98;font-size:48px}.cardText{margin:8px 0}.readOnlyContent button{display:block;margin:10px auto;padding:12px;color:white}.visualLoginForm>h1{text-align:center}
      header .MuiStack-root{min-width:0;overflow-x:auto}header .MuiStack-root>a{flex-shrink:0}.fixtureList{padding:24px 40px}.fixtureList a{display:block;padding:12px;border-bottom:1px solid #444}
      @media(max-width:600px){.fixtureRange{display:none}header .fixtureControls{gap:1px}header .fixtureControls button{padding:4px}header .MuiToolbar-root{gap:4px}}
      ${playerFixture.style}
      ${detailsFixture.style}
    </style></head><body><div id="fixtureVideoMount"></div><div class="backgroundContainer"></div><div id="reactRoot"><div id="fixtureApp"><header class="MuiAppBar-root"></header><div id="fixtureSpacer"></div><main id="fixturePage"></main></div></div>
    <script>
      const loginMarkup = '<div id="loginPage"><div class="padded-left padded-right padded-bottom-page"><div class="visualLoginForm"><h1>Please sign in</h1><div id="divUsers">${profiles}</div></div><div class="readOnlyContent"><button class="btnManual"><span>Manual login</span></button><button>Use Quick Connect</button><button>Forgot Password</button></div></div></div>';
      const homeMarkup = '<div id="homeTab"><div class="homeSectionsContainer"><section class="verticalSection"><h2 class="sectionTitle">My Media</h2></section><section class="verticalSection"><h2 class="sectionTitle">Recently Added in Other Videos</h2></section><section class="verticalSection"><h2 class="sectionTitle">Recently Added in Movies</h2><p>Normal library content remains available.</p></section></div><button class="fixtureOutside">Outside hero</button></div>';
      const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18v14H3zM8 21h8v-2H8z"/></svg>';
      const links = '<a href="#/home">Jellyfin branding</a><a href="#/home?tab=1">' + icon + 'Favorites</a><a href="#/tv?topParentId=anime&collectionType=tvshows">' + icon + 'Anime</a><a href="#/movies?topParentId=movies&collectionType=movies">' + icon + 'Movies</a><a href="#/mixed?topParentId=other&collectionType=mixed">' + icon + 'Other Videos</a><a href="#/tv?topParentId=shows&collectionType=tvshows">' + icon + 'TV Shows</a>';
      const posterNames = ['Moonlit Harbor','The Last Voyager','Skyward','Northern Lights','The Glass City','Wild Horizon','Tidal Echoes','Paper Kingdom','Beyond the Ridge','Starlight Express','Echoes of Summer','The Long Road'];
      const libraryMarkup = '<div id="tvshowsPage" class="page libraryPage"><div class="padded-bottom-page"><div class="fixtureAlphabet" aria-label="Alphabet">#<span>A</span><span>B</span><span>C</span><span>D</span><span>E</span><span>F</span></div><div class="itemsContainer padded-left padded-right vertical-wrap">' + Array.from({length:24},(_,i)=> {
        const title=posterNames[i % posterNames.length], href='#/details?id=poster-'+i;
        return '<div class="card portraitCard card-hoverable"><div class="cardBox visualCardBox"><div class="cardScalable"><div class="cardPadder cardPadder-portrait"></div><div class="cardContent"><div class="cardImageContainer coveredImage"><img src="/fixture-posters/'+i+'.svg" alt=""/><div class="cardIndicators"><div class="countIndicator">'+(12+i)+'</div></div></div></div><div class="cardOverlayContainer"><a href="'+href+'" class="cardImageContainer" aria-label="'+title+'"></a><button class="cardOverlayButton" aria-label="Play '+title+'">Play</button></div></div><div class="cardFooter cardFooter-transparent"><div class="cardText cardTextCentered"><a href="'+href+'">'+title+'</a></div><div class="cardText cardText-secondary cardTextCentered">'+(2020+i%6)+'</div></div></div></div>';
      }).join('') + '</div></div></div>';
      localStorage.setItem('jellyfin_credentials', JSON.stringify({Servers:[{UserId:'fixture-user',AccessToken:'disposable-fixture-token',Id:'fixture-server',ManualAddress:location.origin}]}));
      window.CinematicUIConfig = ${JSON.stringify(config)};
      const playerMarkup = ${JSON.stringify(playerFixture.markup)};
      const setupPlayer = ${playerFixture.setup.toString()};
      const seriesMarkup = ${JSON.stringify(detailsFixture.markup(false))};
      const seasonMarkup = ${JSON.stringify(detailsFixture.markup(true))};
      const setupDetails = ${detailsFixture.setup.toString()};
      const profileMarkup = ${JSON.stringify(profileFixture.markup)};
      const profileMenu = ${JSON.stringify(profileFixture.menu)};
      const setupProfile = ${profileFixture.setup.toString()};
      function route() {
        const page = document.querySelector('#fixturePage');
        const library = /^#\\/(tv|movies|mixed)(\\?|$)/.test(location.hash);
        const player = location.hash.startsWith('#/video');
        const details = location.hash.startsWith('#/details?id=series') || location.hash.startsWith('#/details?id=season');
        document.querySelector('video')?.pause();
        document.querySelector('#fixtureVideoMount').innerHTML = player ? '<div class="videoPlayerContainer"><video class="htmlvideoplayer" src="/fixture.webm" poster="/fixture-frame.svg" preload="metadata" playsinline></video></div>' : '';
        document.querySelector('.backgroundContainer').classList.toggle('backgroundContainer-transparent',player);
        document.body.classList.toggle('playerFixture',player);
        document.body.classList.toggle('libraryFixture', library);
        document.body.classList.toggle('detailsFixture', details);
        document.querySelector('.backgroundContainer').classList.toggle('withBackdrop',details);
        document.querySelector('.backdropContainer')?.remove();
        if(details){const backdrop=document.createElement('div');backdrop.className='backdropContainer';backdrop.innerHTML='<div class="backdropImage"></div>';document.body.prepend(backdrop);}
        document.querySelector('header').className='MuiAppBar-root';
        document.querySelector('header').innerHTML = '<div class="MuiToolbar-root"><div class="MuiStack-root">'+links+'</div><div class="fixtureHeaderActions"><button aria-label="Cast to Device">'+icon+'</button><a href="#/search" aria-label="Search">'+icon+'</a></div><button aria-label="User Menu">●</button></div>' + (library ? '<div class="MuiToolbar-root"><button aria-label="Shows">Shows ▾</button><span class="fixtureRange">1–24 of 24</span><div class="fixtureControls"><button>Play All</button><button aria-label="Shuffle">⇄</button><button aria-label="Filter">Filter</button><button aria-label="Sort">A–Z</button><button aria-label="View settings">▦</button><button aria-label="Previous" disabled>‹</button><button aria-label="Next">›</button></div></div>' : '');
        if (player) {
          document.querySelector('header').className='skinHeader osdHeader';
          document.querySelector('header').innerHTML='<div class="videoOsd-appBar"><button aria-label="Back">←</button><p>Northern Lights — S1:E1 — The First Journey</p><div class="MuiBox-root"><button aria-label="Cast to Device">▣</button></div></div>';
          page.innerHTML='<div class="mainAnimatedPages">'+playerMarkup+'</div><button id="fixtureHideControls" class="fixtureDriver">Hide controls</button><button id="fixtureShowControls" class="fixtureDriver">Show controls</button>';
          if (${params.get('playerShape') === 'unknown'}) page.querySelector('.osdPositionSlider').className='unknownPosition';
          if (${params.get('playerTitle') === 'legacy'}) {page.querySelector('.osdTitle').textContent='Legacy native title';document.querySelector('.videoOsd-appBar>p').remove();}
          if (${params.get('playerShape') !== 'unknown'}) setupPlayer();
        }
        else if (details) {
          page.innerHTML=location.hash.includes('id=season')?seasonMarkup:seriesMarkup;
          document.querySelector('header a[href*="topParentId=anime"]').classList.add('MuiButton-textPrimary');
          if (${params.get('detailsShape') === 'unknown'}) page.querySelector('.detailRibbon').className='unknownDetailRibbon';
          if (${params.get('episodesShape') === 'unknown'}) page.querySelector('.listItem')?.setAttribute('data-type','Unknown');
          setupDetails();
        }
        else if (location.hash.startsWith('#/userprofile')) {page.innerHTML=profileMarkup;setupProfile();}
        else if (location.hash.startsWith('#/details')) page.innerHTML = '<div id="itemDetailPage"><h1>Fixture details</h1><button class="btnPlay">Play</button><a href="#home">Back to Home</a></div>';
        else if (library) page.innerHTML = libraryMarkup;
        else page.innerHTML = location.hash === '#login' ? loginMarkup : homeMarkup;
        document.querySelector('header button[aria-label="User Menu"]')?.addEventListener('click',()=>{
          document.querySelector('.MuiMenu-paper')?.remove();
          const mount=document.createElement('div');mount.innerHTML=profileMenu;document.body.appendChild(mount.firstElementChild);
          const menu=document.querySelector('[role="menu"]'), options=Array.from(menu.querySelectorAll('[role="menuitem"]'));
          options[0].focus();
          menu.onkeydown=event=>{if(event.key==='Escape'){menu.parentElement.remove();document.querySelector('header button[aria-label="User Menu"]').focus();}else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();const i=options.indexOf(document.activeElement);options[(i+(event.key==='ArrowDown'?1:options.length-1))%options.length].focus();}};
          options.forEach(option=>option.onclick=()=>{menu.parentElement.remove();if(option.textContent==='Sign Out'){localStorage.removeItem('jellyfin_credentials');location.hash='#login';}});
        });
        for (const action of ['Filter','Sort','View settings']) document.querySelector('header button[aria-label="'+action+'"]')?.addEventListener('click',()=>{
          const menu=document.createElement('div');menu.className='fixtureMenu';menu.setAttribute('role','dialog');menu.setAttribute('aria-label',action);menu.innerHTML='<p>'+action+' controls</p>'+(action==='View settings'?'<button>Grid View</button><button>List View</button>':'')+'<button>Close</button>';menu.querySelector('button:last-child').onclick=()=>menu.remove();
          if(action==='View settings') {
            const choices=menu.querySelectorAll('button');
            choices[0].onclick=()=>{page.innerHTML=libraryMarkup;menu.remove();};
            choices[1].onclick=()=>{page.innerHTML='<div id="tvshowsPage" class="page libraryPage"><div class="itemsContainer fixtureList">'+posterNames.map(title=>'<a href="#/details?id=fixture-list">'+title+'</a>').join('')+'</div></div>';menu.remove();};
          }
          document.body.appendChild(menu);
        });
      }
      window.addEventListener('hashchange', route); route();
    </script><script src="/Web/client.js"></script></body></html>`;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  // Each preview carries its own count; concurrent phone/desktop fixtures do not share mutable state.
  const preview = new URL(request.headers.referer || '/', 'http://127.0.0.1');
  const count = Math.max(3, Math.min(30, Number(preview.searchParams.get('heroCount')) || 3));
  const previewItems = Array.from({ length: count }, (_, index) => items[index] || {
    ...items[index % items.length], Id: `fixture-${index}`, Name: `Featured adventure ${index + 1}`
  });
  if (url.pathname === '/fixture.webm') {
    const clip = fs.readFileSync(path.join(__dirname,'media/fixture.webm'));
    const match = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = match ? Number(match[1]) : 0, end = match?.[2] ? Math.min(Number(match[2]),clip.length-1) : clip.length-1;
    if (start > end || start >= clip.length) {response.writeHead(416,{'Content-Range':`bytes */${clip.length}`});response.end();return;}
    const headers={'Content-Type':'video/webm','Cache-Control':'no-store','Accept-Ranges':'bytes','Content-Length':end-start+1};
    if(match) headers['Content-Range']=`bytes ${start}-${end}/${clip.length}`;
    response.writeHead(match?206:200,headers);response.end(clip.subarray(start,end+1));return;
  }
  let body, type = 'application/json';
  if (url.pathname === '/__health') body = JSON.stringify({ fixture: 'cinematic-ui' });
  else if (url.pathname === '/fixture-frame.svg') {body = image('Northern Lights');type = 'image/svg+xml';}
  else if (url.pathname === '/') { body = html(url.searchParams); type = 'text/html'; }
  else if (['/Web/client.js', '/Web/cinematic.css'].includes(url.pathname)) {
    body = fs.readFileSync(path.join(root, url.pathname)); type = url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css';
  } else if (url.pathname.endsWith('/Views')) body = JSON.stringify({ Items: [{ Id: 'movies', Name: 'Movies', CollectionType: 'movies' }] });
  else if (url.pathname.startsWith('/fixture-posters/')) {
    const i = Number(url.pathname.match(/\d+/)?.[0] || 0), colors = ['#8c4055','#2c6380','#737446','#5c5488','#986344','#386d64'];
    body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><defs><linearGradient id="p" x2="1" y2="1"><stop stop-color="${colors[i%6]}"/><stop offset="1" stop-color="#101923"/></linearGradient></defs><rect width="400" height="600" fill="url(#p)"/><circle cx="${90+i%3*80}" cy="170" r="90" fill="#ead9b5" opacity=".7"/><path d="M0 470 160 250 260 430 400 320V600H0Z" fill="#111b2b" opacity=".8"/><path d="M0 520 260 400 400 510V600H0Z" fill="#0b111b"/></svg>`;
    type = 'image/svg+xml';
  }
  else if (url.pathname === '/Items/Latest' || url.pathname.endsWith('/Items')) body = JSON.stringify({ Items: url.searchParams.get('empty') === 'yes' ? [] : previewItems });
  else if (url.pathname.includes('/Images/') || url.pathname === '/Branding/Splashscreen') {
    const item = previewItems.find(item => url.pathname.split('/').includes(item.Id)); body = image(item?.Name || 'Cinematic UI', url.pathname.includes('/Logo')); type = 'image/svg+xml';
  } else { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); response.end(body);
});
server.listen(4187, '127.0.0.1', () => console.log('Cinematic UI fixture: http://127.0.0.1:4187'));
