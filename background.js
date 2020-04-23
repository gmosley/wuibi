const browser = window.browser || window.chrome;

chrome.browserAction.onClicked.addListener(function() {
  chrome.tabs.create({url: chrome.runtime.getURL('dist/wuibi.html')});
});
