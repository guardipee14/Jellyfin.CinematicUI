// Disposable UI fixture: real plugin assets, synthetic titles, no production credentials or media.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

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
    heroPauseOnHover: params.get('hover') !== 'off', loginHideHeaderBranding: params.get('branding') !== 'show',
    hiddenNavigationLibraryNames: params.get('hideNavigation') === 'yes' ? 'Other Videos' : ''
  };
  const profiles = Array.from({ length: params.get('profiles') === 'many' ? 12 : 2 }, (_, i) =>
    `<button class="card" type="button"><div class="cardImageContainer"><div class="cardImage" aria-hidden="true">●</div></div><div class="cardFooter"><div class="cardText">Guest ${i + 1}</div></div></button>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cinematic UI browser fixture</title>
    <link rel="stylesheet" href="/Web/cinematic.css"><style>
      *{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Arial,sans-serif;background:#0d0d0f;color:#fff}.hide{display:none!important}
      header{position:fixed;top:0;left:0;width:100%;height:48px;z-index:20;background:#141414;display:flex;align-items:center;gap:24px;padding:0 20px}a{color:#fff}#fixturePage{padding-top:48px}.verticalSection{padding:20px}.fixtureOutside{margin:20px;padding:10px}
      .cardImage{height:130px;display:grid;place-items:center;background:#147d98;font-size:48px}.cardText{margin:8px 0}.readOnlyContent button{display:block;margin:10px auto;padding:12px;color:white}.visualLoginForm>h1{text-align:center}
    </style></head><body><div id="reactRoot"><header class="MuiAppBar-root"><a href="#home">Jellyfin branding</a><a href="#home">Movies</a><a href="#home">Other Videos</a></header><main id="fixturePage"></main></div>
    <script>
      const loginMarkup = '<div id="loginPage"><div class="padded-left padded-right padded-bottom-page"><div class="visualLoginForm"><h1>Please sign in</h1><div id="divUsers">${profiles}</div></div><div class="readOnlyContent"><button class="btnManual"><span>Manual login</span></button><button>Use Quick Connect</button><button>Forgot Password</button></div></div></div>';
      const homeMarkup = '<div id="homeTab"><div class="homeSectionsContainer"><section class="verticalSection"><h2 class="sectionTitle">My Media</h2></section><section class="verticalSection"><h2 class="sectionTitle">Recently Added in Other Videos</h2></section><section class="verticalSection"><h2 class="sectionTitle">Recently Added in Movies</h2><p>Normal library content remains available.</p></section></div><button class="fixtureOutside">Outside hero</button></div>';
      localStorage.setItem('jellyfin_credentials', JSON.stringify({Servers:[{UserId:'fixture-user',AccessToken:'disposable-fixture-token',Id:'fixture-server',ManualAddress:location.origin}]}));
      window.CinematicUIConfig = ${JSON.stringify(config)};
      function route() {
        const page = document.querySelector('#fixturePage');
        if (location.hash.startsWith('#/details')) page.innerHTML = '<div id="itemDetailPage"><h1>Fixture details</h1><button class="btnPlay">Play</button><a href="#home">Back to Home</a></div>';
        else page.innerHTML = location.hash === '#login' ? loginMarkup : homeMarkup;
      }
      window.addEventListener('hashchange', route); route();
    </script><script src="/Web/client.js"></script></body></html>`;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  let body, type = 'application/json';
  if (url.pathname === '/__health') body = JSON.stringify({ fixture: 'cinematic-ui' });
  else if (url.pathname === '/') { body = html(url.searchParams); type = 'text/html'; }
  else if (['/Web/client.js', '/Web/cinematic.css'].includes(url.pathname)) {
    body = fs.readFileSync(path.join(root, url.pathname)); type = url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css';
  } else if (url.pathname.endsWith('/Views')) body = JSON.stringify({ Items: [{ Id: 'movies', Name: 'Movies', CollectionType: 'movies' }] });
  else if (url.pathname === '/Items/Latest' || url.pathname.endsWith('/Items')) body = JSON.stringify({ Items: url.searchParams.get('empty') === 'yes' ? [] : items });
  else if (url.pathname.includes('/Images/') || url.pathname === '/Branding/Splashscreen') {
    const item = items.find(item => url.pathname.includes(item.Id)); body = image(item?.Name || 'Cinematic UI', url.pathname.includes('/Logo')); type = 'image/svg+xml';
  } else { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); response.end(body);
});
server.listen(4187, '127.0.0.1', () => console.log('Cinematic UI fixture: http://127.0.0.1:4187'));
