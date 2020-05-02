import { QUIBI_USERNAME, QUIBI_PASSWORD } from './credentials';
import { GetPlaybackInfoRequest, GetPlaybackInfoResponse, UserProfile, GetShowRequest, GetShowResponse } from './protos/compiled-protos.js';

// TODO: fix hacky globals
var manifestUrl = '';
var licenseUrl = '';

const quibiApiUrl = 'https://qlient-api.quibi.com/';

let authInfo;

async function makeQuibiApiRequest(endpoint, encodedRequest, responseProto) {
  const url = quibiApiUrl + endpoint;
  const token = await getAuthToken();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/protobuf',
      'Authorization': 'Bearer ' + token
    },
    body: encodedRequest
  });
  const encoded = new Uint8Array(await response.arrayBuffer());
  return responseProto.decode(encoded);
}

async function getUserProfile() {
  const profile = await makeQuibiApiRequest(
    'quibi.qlient.api.user.User/GetUserProfile', null, UserProfile);
  console.log(profile);
}

function parsePlaybackInfoResponse(playbackInfo) {
  // TODO: properly parse this
  licenseUrl = playbackInfo.licenseUrl;
  // Use "horizontal-video" manifest
  let manifest = playbackInfo.manifests[1];
  manifestUrl = manifest.url;
  // Manifests also contain authParams (URL params) which have identical 
  // values to authCookies. However, the Android client uses cookies 
  // and we already need a web extension to bypass same origin policy so
  // let's authenticate via cookies.
  let cookiePromises = manifest.authCookies.map(authCookie =>
    browser.cookies.set({
      url: manifest.url,
      name: authCookie.name,
      value: authCookie.value,
      domain: authCookie.domain,
      path: authCookie.path
    })
  );
  Promise.all(cookiePromises).then(cookies => {
    cookies.forEach(console.log);
    initPlayer();
  });
}

async function getPlaybackInfo(episodeId) {
  const getPlaybackInfoRequest = GetPlaybackInfoRequest.create({
    episodeId: episodeId,
    deviceOs: 2,
    connectivity: 1,
    securityLevel: 2,
  });
  const encodedRequest = GetPlaybackInfoRequest.encode(getPlaybackInfoRequest).finish();
  const playbackInfo = await makeQuibiApiRequest(
    'quibi.service.playback.Playback/GetPlaybackInfo', encodedRequest, GetPlaybackInfoResponse);
  console.log(playbackInfo);
  parsePlaybackInfoResponse(playbackInfo);
}

async function getShow(showId) {
  const getShowRequest = GetShowRequest.create({ id: showId });
  const showResponse = await makeQuibiApiRequest(
    'quibi.qlient.api.content.Content/GetShow',
    GetShowRequest.encode(getShowRequest).finish(),
    GetShowResponse);
  parseGetShowResponse(showResponse);
}

function parseGetShowResponse(showResponse) {
  const show = showResponse.show;
  let videoLinks = document.getElementById("video-links");
  showResponse.seasons.forEach((season) => {
    season.episodes.forEach((episode) => {
      const displayName =
        `${show.title} S${episode.seasonNum}E${episode.episodeNum} - ${episode.title}`;
      let link = document.createElement("button");
      link.onclick = function (_) { getPlaybackInfo(episode.id); };
      link.innerHTML = displayName;
      videoLinks.appendChild(link);
      videoLinks.appendChild(document.createElement("br"));
    });
  });
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

async function makeQuibiAuthRequest(data) {
  const authUrl = 'https://login.quibi.com/oauth/token';
  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return await response.json();
}

function updateAuthInfo(authResponse, now) {
  if ("refresh_token" in authResponse) {
    authInfo.refreshToken = authResponse["refresh_token"]
  }
  authInfo.accessToken = authResponse["access_token"];
  authInfo.expiryUnix = now + authResponse["expires_in"]
  window.localStorage.setItem('quibiAuthInfo', JSON.stringify(authInfo));
  return authInfo;
}

async function getAuthToken() {
  // TODO: tons of error handling
  // TODO: refactor
  // load authInfo from local storage
  if (authInfo == null) {
    console.log("loading authInfo from local storage");
    authInfo = JSON.parse(window.localStorage.getItem('quibiAuthInfo')) || {};
  }
  // OAuth client id for android app
  const oAuthClientId = "dd1r0IBYVwi8CJeVS57mSN7HXIojPr5j"
  const now = Math.floor(Date.now() / 1000);
  // if there's no auth info, make the initial request
  if (!("refreshToken" in authInfo)) {
    console.log("making initial auth request");
    const response = await makeQuibiAuthRequest({
      "password": QUIBI_PASSWORD,
      "scope": "openid profile email offline_access",
      "client_id": oAuthClientId,
      "username": QUIBI_USERNAME,
      "realm": "Username-Password-Authentication",
      "audience": "https://qlient-api.quibi.com",
      "grant_type": "http://auth0.com/oauth/grant-type/password-realm"
    });
    return updateAuthInfo(response, now).accessToken;
  } else {
    if (now > authInfo.expiryUnix) {
      console.log("refreshing auth token");
      const response = await makeQuibiAuthRequest({
        "client_id": oAuthClientId,
        "refresh_token": authInfo.refreshToken,
        "grant_type": "refresh_token"
      });
      return updateAuthInfo(response, now).accessToken;
    } else {
      console.log("already have valid token");
      return authInfo.accessToken;
    }
  }
}

async function doAuth() {
  const request = {
    "password": QUIBI_PASSWORD,
    "scope": "openid profile email offline_access",
    "client_id": QUIBI_AUTH0_CLIENT_ID_ANDROID,
    "username": QUIBI_USERNAME,
    "realm": "Username-Password-Authentication",
    "audience": "https://qlient-api.quibi.com",
    "grant_type": "http://auth0.com/oauth/grant-type/password-realm"
  };
  console.log(await makeQuibiAuthRequest(request));
  // TODO: token refreshes
  httpRequest.send(JSON.stringify({
    "client_id": QUIBI_AUTH0_CLIENT_ID_ANDROID,
    "refresh_token": "",
    "grant_type": "refresh_token"
  }));
}


function run() {
  // TODO: hardcoding for now
  let episode_id = 264;
  let show_id = 499;
  // getUserProfile();
  // getPlaybackInfo(episode_id);
  // initPlayer();
  // doAuth();
  // getAuthToken().then(console.log);
  getShow(show_id);
}

window.onload = function () {
  run();
}

// Listen to the custom shaka-ui-loaded event, to wait until the UI is loaded.
// document.addEventListener('shaka-ui-loaded', initPlayer());
// Listen to the custom shaka-ui-load-failed event, in case Shaka Player fails
// to load (e.g. due to lack of browser support).
document.addEventListener('shaka-ui-load-failed', initFailed);