import {OAUTH_TOKEN} from './credentials';
import {GetPlaybackInfoRequest, GetPlaybackInfoResponse, UserProfile} from './wuibi-protos/compiled-proto.js';

function getUserProfile() {
  let getUserProfileUrl =
      'https://qlient-api.quibi.com/quibi.qlient.api.user.User/GetUserProfile';

  var httpRequest = new XMLHttpRequest();
  httpRequest.onreadystatechange = function() {
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

function getPlaybackInfo() {
  let getPlaybackInfoUrl =
      'https://qlient-api.quibi.com/quibi.service.playback.Playback/GetPlaybackInfo';

  // hardcoding for now
  let episode_id = 264;

  let getPlaybackInfoRequest = GetPlaybackInfoRequest.create({
    episodeId: episode_id,
    deviceOs: 2,
    connectivity: 1,
    securityLevel: 2,
  });
  console.log(getPlaybackInfoRequest);

  let encoded = GetPlaybackInfoRequest.encode(getPlaybackInfoRequest).finish();

  var httpRequest = new XMLHttpRequest();
  httpRequest.onreadystatechange = function() {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      var status = httpRequest.status;
      if (status === 0 || (status >= 200 && status < 400)) {
        console.log(httpRequest.response);
        let playbackInfo = GetPlaybackInfoResponse.decode(
            new Uint8Array(httpRequest.response));
        console.log(playbackInfo);
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

function run() {
  getUserProfile();
  getPlaybackInfo();
}

document.addEventListener('DOMContentLoaded', run());