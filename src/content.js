const intervalRateMs = 1000;
const maxCountdownStartTimeMs = 35 * 1000;
const minCountdownStartTimeMs = 5 * 1000;

const cssClassName_Wrapper = `zombie-tab-closer-wrapper`;
const cssClassName_MainPopOver = `zombie-tab-closer-main-pop-over`;
const cssClassName_CountdownText = `zombie-tab-closer-countdown-text`;
const cssClassName_CloseNowBtn = `zombie-tab-closer-close-now-btn`;
const cssClassName_StopLink = `zombie-tab-closer-stop-link`;

const cssClassName_SettingsMenu = `zombie-tab-closer-settings-menu`;
const cssClassName_SettingsOption = `zombie-tab-closer-settings-option`;

const localStorageKey_CountdownStartTimeMs = `13E3E57A-D0C0-4FF2-ABA2-DD9FB54F66FE`;

// todo change these
// todo change these
// todo change these
// todo change these
// todo change these

function isHrefMatch() {
  // google cal accept
  // test with: https://calendar.google.com/calendar/event?action=RESPOND&eid=MTZjbmpkajNnOGszMzkwa2NubjNwbmc3bmsgZWxpbmtAdHVybml0aW4uY29t&rst=1&tok=MTkjZ2VuZ2VsQHR1cm5pdGluLmNvbTdkZWQ5MjE3Yjc0MzYxMmI4Y2YwY2FiYjA0NWFmNDg3NTczYmYzNmM&ctz=America%2FChicago&hl=en&es=1
  if ( // https://calendar.google.com/calendar/u/ 0/r/week/2023/4/10?ctz=America/Chicago&hl=en&es=1& response_updated=1
    window.location.href.toLowerCase().includes('https://calendar.google.com/calendar/u/')
    && window.location.href.toLowerCase().includes('response_updated')) {
    return true;
  }

  // zoom meeting
  // test: https://www.google.com/url?q=https://turnitin.zoom.us/j/97453529242?pwd%3DMEp0MUhSMmFQTHlUZEdSTS9VRmNNQT09&sa=D&source=calendar&usg=AOvVaw1oo0OynOwXoL-ndZjshAxQ
  if ( // https://turnitin.zoom.us/j/97453529242?pwd=MEp0MUhSMmFQTHlUZEdSTS9VRmNNQT09#success
    window.location.href.toLowerCase().includes('zoom.us') // anyone's zoom, not just turnitin
    && window.location.href.toLowerCase().includes('#success')) {
    return true;
  }

  // slack redirect
  // test: https://turnitin.slack.com/archives/D01TALMB5EG/p1679957506497269
  if ( // https://turnitin.slack.com/archives/D01TALMB5EG/p1679957506497269
    window.location.href.toLowerCase().includes('https://turnitin.slack.com/archives')
    || window.location.href.toLowerCase().includes('https://turnitinold.slack.com/archives')
    || window.location.href.toLowerCase().includes('https://turnitin.enterprise.slack.com/archives')
  ){
    return true;
  }

  // bamboo time off req
  // test: https://mytii.bamboohr.com/anytime/pto_workflow.php?r=77805&u=3841&p=1&s=873870&h=a2f9511c64e3b8db7374d40a54a5b2133299da49ee71a43f8fab10382bb2d51b&a=approve
  if (
    window.location.href.toLowerCase().includes('https://mytii.bamboohr.com/anytime/pto_workflow.php?')
    && window.location.href.toLowerCase().includes('=approve')
  ) {
    return true;
  }

  // chime redirect
  // test: https://app.chime.aws/meetings/7162607841
  if ( // https://app.chime.aws/meetings/7162607841
    window.location.href.toLowerCase().includes('https://app.chime.aws/meetings')) {
    return true;
  }

  return false;
}

function isPageTextMatch() {
  /*
  const pageText = document?.body?.innerText?.toLowerCase() || '';
  // slack message
  // https://turnitin.slack.com/archives/D01TALMB5EG/p1679957506497269
  if (pageText.includes('redirected you to the desktop app')) {
    return true;
  }
  return false;
  */
}

function isUrlMatch() {
  /*
  const url = getUrl();
  if (url.pathname && url.pathname.startsWith('/wc/leave')) {
    return true;
  } else {
    return false;
  }
  */
}

// todo change above
// todo change above
// todo change above
// todo change above
// todo change above




function log(text) {
  console.log(`tab closer: ${text}`);
}

log('loaded...');

let timeTillCloseMs = getCountdownStartTimeMs();

function getCountdownStartTimeMs() {
  const defaultStartTimeMs = 21 * 1000;
  let startTimeMs = defaultStartTimeMs;
  try {
    startTimeMs = Number(localStorage.getItem(localStorageKey_CountdownStartTimeMs));
  } catch (e) {
    console.error(e);
  }
  if (!startTimeMs || startTimeMs <= minCountdownStartTimeMs || startTimeMs > maxCountdownStartTimeMs) {
    setCountdownStartTimeMs(defaultStartTimeMs); // Overwrite to self-correct
    startTimeMs = defaultStartTimeMs;
  }
  return startTimeMs;
}

function setCountdownStartTimeMs(startTimeMs) {
  localStorage.setItem(localStorageKey_CountdownStartTimeMs, startTimeMs);
}

function getWrapperEl() {
  return document.documentElement.querySelector(`.${cssClassName_Wrapper}`);
}

function countdownWithText(countdownTimeMs) {
  if (false) {//Used for freezing the countdown to debugging styling
    countdownTimeMs = getCountdownStartTimeMs();
    clearInterval(intervalId);
  }

  let wrapperEl = getWrapperEl();

  if (!wrapperEl) { // Lazy init the element
    wrapperEl = document.createElement('div');
    wrapperEl.classList.add(cssClassName_Wrapper);
    wrapperEl.innerHTML = `
    <div class='${cssClassName_MainPopOver}'>
      <div class='${cssClassName_CountdownText}'></div>
      <a class='${cssClassName_StopLink}'>cancel</a>
      <a class='${cssClassName_CloseNowBtn}'>close now</a>
    </div>
    `;
    document.body.appendChild(wrapperEl);

    wrapperEl.querySelector(`.${cssClassName_CloseNowBtn}`).onclick = () => {
      log('Closing tab now');
      closeThisTabNow();
    };

    wrapperEl.querySelector(`.${cssClassName_StopLink}`).onclick = () => {
      log('Canceled the countdown');
      clearInterval(intervalId);
      wrapperEl.remove();
    };

    injectAndUpdateSettingsMenu();
  }

  const countdownEl = wrapperEl.querySelector(`.${cssClassName_CountdownText}`);
  countdownEl.innerText = `Closing page in ${Math.round(countdownTimeMs / 1000)} seconds`;
}

function injectAndUpdateSettingsMenu() {
  const incrementalSec = 5.0;
  const trueCountdownStartTimeSec = Math.round(getCountdownStartTimeMs() / incrementalSec / 1000.0) * incrementalSec;

  const optionsList = [];
  const decrementValSec = trueCountdownStartTimeSec - incrementalSec;
  const incrementValSec = trueCountdownStartTimeSec + incrementalSec;
  if (decrementValSec * 1000 >= minCountdownStartTimeMs) {
    optionsList.push(decrementValSec);
  }
  if (incrementValSec * 1000 < maxCountdownStartTimeMs) {
    optionsList.push(incrementValSec);
  }
  if (!optionsList) {
    log('no options');
    return;
  }
  const wrapperEl = getWrapperEl();
  wrapperEl.querySelector(`.${cssClassName_SettingsMenu}`)?.remove();

  const settingsEl = document.createElement('div');
  settingsEl.classList.add(cssClassName_SettingsMenu);
  settingsEl.innerHTML = `
  ${trueCountdownStartTimeSec} seconds not your speed?  Try
  <a class='${cssClassName_SettingsOption}'>${optionsList[0]}s</a>
  `;
  if (optionsList.length > 1) {
    settingsEl.innerHTML += `
    or
    <a class='${cssClassName_SettingsOption}'>${optionsList[1]}s</a>
    `;
  }
  const optionsElList = settingsEl.querySelectorAll(`.${cssClassName_SettingsOption}`);
  for (let i = 0; i < optionsElList.length; i++) {
    const optionEl = optionsElList[i];
    const op = optionsList[i];
    optionEl.onclick = () => {
      log(`New option selected: ${op}`);
      const ms = (op + 1) * 1000;
      timeTillCloseMs = ms;
      setCountdownStartTimeMs(ms);
      injectAndUpdateSettingsMenu();
    };

  }
  wrapperEl.appendChild(settingsEl);
}

function getUrl() {
  return new URL(window.location.href);
}

function countDownToClose() {
  timeTillCloseMs -= intervalRateMs;
  log(`TimeMs left: ${timeTillCloseMs} isPageText=${isPageTextMatch()} isHrefMatch=${isHrefMatch()} isUrlMatch=${isUrlMatch()}`);

  if (isPageTextMatch() || isHrefMatch() || isUrlMatch()) {
    log(`All checks good to auto close`);
  } else {
    timeTillCloseMs += intervalRateMs; // Put back the time
    return;
  }

  countdownWithText(timeTillCloseMs);

  if (timeTillCloseMs > 0) { return; }

  clearInterval(intervalId);

  closeThisTabNow();
}

function closeThisTabNow() {
  chrome.runtime.sendMessage({ pleaseCloseThisTab: true });
}

let intervalId = setInterval(countDownToClose, intervalRateMs);
