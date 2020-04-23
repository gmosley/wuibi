import {OAUTH_TOKEN} from './credentials';
import {UserProfile} from './wuibi-protos/compiled-proto.js';

function run() {
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

document.addEventListener('DOMContentLoaded', run);