const extensionIDContentScript = String(chrome.runtime.id);
var tabId = null;

function loadScript(fileName) {
  var s = document.createElement('script');
  s.src = chrome.runtime.getURL(fileName);
  s.onload = function() { this.remove() };
  (document.head || document.documentElement).appendChild(s);
}

function messageIn(message) {
//  console.log('Content script received message: ');
  console.log(message);
  switch (message.action) {
    case 'importRemainingScripts':
      tabId = message.data;

      if (tabId) {
        importRemainingScripts();
        if (!window.localStorage['threadFilter']) {
          window.localStorage['threadFilter'] = message.threadFilter;
          console.log('Thread filter is set.')
        }
        if (!window.localStorage['textTransforms']) {
          window.localStorage['textTransforms'] = message.textTransforms;
          // not ideal but the text transforms have a dedicated function on the base page
          chrome.runtime.sendMessage({action: "setTextTransforms", filterSettings: {textTransforms: message.textTransforms}});
        }
      } else {
        console.error("Failed to get tab ID.");
      }

      break;
    case 'getVolume':
      sendMessageToPopup('volume', window.localStorage['volume']);
      break;
    case 'getThreadFilter':
      sendMessageToPopup('threadFilter', window.localStorage['threadFilter']);
      break;
    case 'getTextTransforms':
      sendMessageToPopup('textTransforms', window.localStorage['textTransforms']);
      break;
    case 'downloadFilteredHashes':
      saveDataToDownloadedFile(data, "filteredMD5s", "application/json");

      break;
    default:
      console.log('Message not understood: ' + message.action);
  }
};

// technically should be using the response for this
function sendMessageToPopup(message, data) {
  chrome.runtime.sendMessage({
    msg: message,
    data: data
  });
};


loadScript('extensionID.js');
loadScript('helpers.js');
chrome.runtime.onMessage.addListener(messageIn);
chrome.runtime.sendMessage({action: "setupInternalScripts"}); // set the tab id from the background script

function importRemainingScripts() {
  loadScript('base.js');
}
