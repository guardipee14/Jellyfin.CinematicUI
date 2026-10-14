// Native-shaped controls from Jellyfin Web v12.2's session/login controller.
// All accounts and handlers are synthetic; this fixture never authenticates a user.
function markup(params) {
  const count = params.get('profiles') === 'none' ? 0 : params.get('profiles') === 'many' ? 12 : 2;
  const profiles = Array.from({ length: count }, (_, index) => {
    const name = params.get('longNames') === 'yes'
      ? `Guest ${index + 1} — A very long profile name ${'UnbrokenName'.repeat(4)}` : `Guest ${index + 1}`;
    return `<button type="button" class="card squareCard scalableCard squareCard-scalable"><div class="cardBox cardBox-bottompadded"><div class="cardScalable"><div class="cardPadder cardPadder-square"></div><div class="cardContent" data-username="${name}" data-userid="guest-${index}"><div class="cardImage flex align-items-center justify-content-center"><span aria-hidden="true">●</span></div></div></div><div class="cardFooter visualCardBox-cardFooter"><div class="cardText singleCardText cardTextCentered">${name}</div></div></div></button>`;
  }).join('');
  return `<div id="loginPage" class="page standalonePage backdropPage">
    <div class="padded-left padded-right padded-bottom-page margin-auto-y">
      <form class="manualLoginForm margin-auto-x ${count ? 'hide' : ''}">
        <div class="padded-left padded-right flex align-items-center justify-content-center"><h1 class="sectionTitle">Please sign in</h1></div>
        <div class="inputContainer"><label class="inputLabel" for="txtManualName">Username</label><input class="emby-input" type="text" id="txtManualName" required autocomplete="username" autocapitalize="off"/></div>
        <div class="inputContainer"><label class="inputLabel" for="txtManualPassword">Password</label><input class="emby-input" type="password" id="txtManualPassword" autocomplete="current-password"/></div>
        <label class="checkboxContainer"><input type="checkbox" class="chkRememberLogin" checked/><span>Remember me</span></label>
        <button type="submit" class="raised button-submit block"><span>Sign In</span></button>
        <div><button type="button" class="raised cancel block btnCancel ${count ? '' : 'hide'}"><span>Cancel</span></button></div>
        <p id="fixtureLoginResult" role="status"></p>
      </form>
      <div class="visualLoginForm ${count ? '' : 'hide'}" style="text-align:center"><h1>Please sign in</h1><div id="divUsers" class="itemsContainer vertical-wrap centered">${profiles}</div></div>
      <div class="readOnlyContent">
        <button type="button" class="raised cancel block btnManual ${count ? '' : 'hide'}"><span>Manual login</span></button>
        <button type="button" class="raised cancel block btnQuick"><span>Use Quick Connect</span></button>
        <button type="button" class="raised cancel block btnForgotPassword"><span>Forgot Password</span></button>
        <button type="button" class="raised block btnSelectServer"><span>Change Server</span></button>
        <div class="loginDisclaimerContainer"><div class="loginDisclaimer">Synthetic server sign-in notice.</div></div>
      </div>
    </div>
  </div>`;
}

function setup(page) {
  window.loginFixture = { submits: 0, action: null };
  const form = page.querySelector('.manualLoginForm'), visual = page.querySelector('.visualLoginForm');
  const manual = page.querySelector('.btnManual');
  function showManual(name = '') {
    form.classList.remove('hide'); visual.classList.add('hide'); manual.classList.add('hide');
    page.querySelector('#txtManualName').value = name;
    page.querySelector(name ? '#txtManualPassword' : '#txtManualName').focus();
  }
  manual.onclick = () => showManual();
  page.querySelector('#divUsers').onclick = event => {
    const content = event.target.closest('.card')?.querySelector('.cardContent');
    if (content) showManual(content.dataset.username);
  };
  page.querySelector('.btnCancel').onclick = () => {
    form.classList.add('hide'); visual.classList.remove('hide'); manual.classList.remove('hide');
    page.querySelector('#divUsers .card')?.focus();
  };
  form.onsubmit = event => {
    event.preventDefault(); window.loginFixture.submits++;
    page.querySelector('#fixtureLoginResult').textContent = 'Native sign-in handler reached';
  };
  for (const action of ['btnQuick', 'btnForgotPassword', 'btnSelectServer']) {
    page.querySelector('.' + action).onclick = () => { window.loginFixture.action = action; };
  }
}

const style = `
  #loginPage .card{display:block;border:0;padding:0;color:inherit}
  #loginPage .cardPadder-square{padding-top:100%}
  #loginPage .cardImage{height:100%;width:100%;display:grid;place-items:center}
  #loginPage .manualLoginForm{width:24em;margin-left:auto;margin-right:auto}
  #loginPage .inputContainer{margin-bottom:1.5em}
  #loginPage .emby-input{padding:.7em;font:inherit}
  #loginPage .block{display:block;width:100%;padding:12px;margin:10px 0;font:inherit}
  #loginPage .checkboxContainer{display:flex;align-items:center;gap:.5em}
  #loginPage .manualLoginForm h1{text-align:center}
`;
module.exports = { markup, setup, style };
