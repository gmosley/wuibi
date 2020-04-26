import { OAUTH_TOKEN, QUIBI_USERNAME, QUIBI_PASSWORD, QUIBI_AUTH0_CLIENT_ID_ANDROID } from './credentials';
import { GetPlaybackInfoRequest, GetPlaybackInfoResponse, UserProfile } from './wuibi-protos/compiled-proto.js';

// TODO: fix hacky globals
var manifestUrl = '';
var licenseUrl = '';
// TODO: hardcoding for now
let episode_id = 264;

function getUserProfile() {
  let getUserProfileUrl =
    'https://qlient-api.quibi.com/quibi.qlient.api.user.User/GetUserProfile';

  var httpRequest = new XMLHttpRequest();
  httpRequest.onreadystatechange = function () {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      var status = httpRequest.status;
      if (status === 0 || (status >= 200 && status < 400)) {
        let profile = UserProfile.decode(new Uint8Array(httpRequest.response));
        console.log(profile);
      } else {
        console.log('Error with request');
        console.log(httpRequest);
      }
    }
  };
  httpRequest.open('POST', getUserProfileUrl);
  httpRequest.setRequestHeader('Content-Type', 'application/protobuf');
  httpRequest.setRequestHeader('authorization', 'Bearer ' + OAUTH_TOKEN);
  httpRequest.responseType = 'arraybuffer';
  httpRequest.send();
}

function parsePlaybackInfoResponse(playbackInfo) {
  // TODO: properly parse this
  licenseUrl = playbackInfo.licenseUrl;
  // Use landscape manifest
  let manifest = playbackInfo.manifests[1];
  manifestUrl = manifest.url;
  let authCookie = manifest.authCookies[0];
  chrome.cookies.set(
    {
      url: manifest.url,
      name: authCookie.name,
      value: authCookie.value,
      domain: authCookie.domain,
      path: authCookie.path
    },
    function (cookie) {
      console.log(cookie);
      // cookie is set, let's initialze player
      initPlayer();
    });
}

function getPlaybackInfo() {
  let getPlaybackInfoUrl =
    'https://qlient-api.quibi.com/quibi.service.playback.Playback/GetPlaybackInfo';

  let getPlaybackInfoRequest = GetPlaybackInfoRequest.create({
    episodeId: episode_id,
    deviceOs: 2,
    connectivity: 1,
    securityLevel: 2,
  });
  console.log(getPlaybackInfoRequest);

  let encoded = GetPlaybackInfoRequest.encode(getPlaybackInfoRequest).finish();

  var httpRequest = new XMLHttpRequest();
  httpRequest.onreadystatechange = function () {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      var status = httpRequest.status;
      if (status === 0 || (status >= 200 && status < 400)) {
        let playbackInfo = GetPlaybackInfoResponse.decode(
          new Uint8Array(httpRequest.response));
        console.log(playbackInfo);
        parsePlaybackInfoResponse(playbackInfo);
      } else {
        console.log('Error with request');
        console.log(httpRequest);
      }
    }
  };
  httpRequest.open('POST', getPlaybackInfoUrl);
  httpRequest.setRequestHeader('Content-Type', 'application/protobuf');
  httpRequest.setRequestHeader('authorization', 'Bearer ' + OAUTH_TOKEN);
  httpRequest.responseType = 'arraybuffer';
  httpRequest.send(encoded);
}

function initPlayer() {
  console.log('shaka-player loaded');
  // When using the UI, the player is made automatically by the UI object.
  const video = document.getElementById('video');
  const ui = video['ui'];
  const controls = ui.getControls();
  const player = controls.getPlayer();

  player.configure({
    drm: {
      servers: {
        'com.widevine.alpha': licenseUrl,
      }
    }
  });

  // Listen for error events.
  player.addEventListener('error', onPlayerErrorEvent);
  controls.addEventListener('error', onUIErrorEvent);

  player.load(manifestUrl).then(function () {
    console.log('The video has now been loaded!');
  }).catch(onPlayerError);
}

function onPlayerErrorEvent(errorEvent) {
  // Extract the shaka.util.Error object from the event.
  onPlayerError(event.detail);
}

function onPlayerError(error) {
  // Handle player error
  console.error('Error code', error.code, 'object', error);
}

function onUIErrorEvent(errorEvent) {
  // Extract the shaka.util.Error object from the event.
  onPlayerError(event.detail);
}

function initFailed() {
  // Handle the failure to load
  console.error('Unable to load the UI library!');
}

function onErrorEvent(event) {
  onError(event.detail);
}

function onError(error) {
  console.error('Error code', error.code, 'object', error);
}


function doAuth() {

  const authUrl = 'https://login.quibi.com/oauth/token';

  var httpRequest = new XMLHttpRequest();
  httpRequest.onreadystatechange = function () {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        console.log(JSON.parse(httpRequest.response));
      } else {
        console.log('Error with request');
        console.log(httpRequest);
      }
    }
  };

  httpRequest.open('POST', authUrl);
  httpRequest.setRequestHeader('Content-Type', 'application/json');
  httpRequest.send(JSON.stringify({
    "password": QUIBI_PASSWORD,
    "scope": "openid profile email offline_access",
    "client_id": QUIBI_AUTH0_CLIENT_ID_ANDROID,
    "username": QUIBI_USERNAME,
    "realm": "Username-Password-Authentication",
    "audience": "https://qlient-api.quibi.com",
    "grant_type": "http://auth0.com/oauth/grant-type/password-realm"
  }));
}


function run() {
  // getUserProfile();
  getPlaybackInfo();
  // initPlayer();
  // doAuth();
}

window.onload = function () {
  run();
}

// Listen to the custom shaka-ui-loaded event, to wait until the UI is loaded.
// document.addEventListener('shaka-ui-loaded', initPlayer());
// Listen to the custom shaka-ui-load-failed event, in case Shaka Player fails
// to load (e.g. due to lack of browser support).
document.addEventListener('shaka-ui-load-failed', initFailed);