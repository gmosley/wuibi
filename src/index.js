// TODO: fix shaka-player debug import
// import shaka from 'shaka-player'

import { OAUTH_TOKEN } from './credentials';
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
      initApp();
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

function initApp() {
  shaka.polyfill.installAll();
  if (shaka.Player.isBrowserSupported()) {
    initPlayer();
  } else {
    console.error('Browser not supported!');
  }
}

function initPlayer() {
  var video = document.getElementById('video');
  var player = new shaka.Player(video);

  player.configure({
    drm: {
      servers: {
        'com.widevine.alpha': licenseUrl,
      }
    }
  });

  player.getNetworkingEngine().registerRequestFilter(function (type, request) {
    request.uris.forEach(uri => console.log('Making type ' + type + ' request to ' + uri));
    // request.uris = [];
  });

  player.addEventListener('error', onErrorEvent);

  player.load(manifestUrl)
    .then(function () {
      console.log('The video has now been loaded!');
    })
    .catch(onError);
}

function onErrorEvent(event) {
  onError(event.detail);
}

function onError(error) {
  console.error('Error code', error.code, 'object', error);
}

function run() {
  // getUserProfile();
  getPlaybackInfo();
}

// TODO: why is video element not available when DOMContentLoaded is used?
// document.addEventListener('DOMContentLoaded', run());
window.onload = function () {
  run();
}