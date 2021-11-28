function fileCheck(url) {
  var http = new XMLHttpRequest();
  http.open('HEAD', url, false);
  http.send();
  return http.status!=404;
}

var sha1sList = [];
try {
  if (fileCheck("sha1s.json")) {
    sha1sList = fetch("sha1s.json").then(response => response.json());
  }
}
catch {
  sha1sList = [];
}
const extensionID = String(chrome.runtime.id)

function loadScript(fileName) {
  var s = document.createElement('script');
  s.src = chrome.runtime.getURL(fileName);
  s.onload = function() { this.remove() };
  (document.head || document.documentElement).appendChild(s);
};

files = ['helpers.js']
files.map( file => loadScript(file) );

async function testIsSeenSHA1(url) {
  let sha1 = await getSHA1(url);
  
  if (Array.isArray(sha1sList)) {
    return sha1sList.indexOf(sha1) > -1;
  }
  else {
    return sha1sList.then((list) => {
      console.log(list.length > 0);
      const isSeen = list.indexOf(sha1) > -1;
      if (isSeen) {
        console.log(sha1 + " was found in existing sha1s list.");
      }
      else {
        console.log(sha1 + " was not found.");
      }
      return isSeen;
    });
  }
}

function sendMessage(message, tabId) {
  chrome.tabs.query({}, function(tabs){
    chrome.tabs.sendMessage(tabId, message);
  });
}

// Awaits messages from in-page scripts
chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
    //if (sender.url === blocklistedWebsite)
    //  return;  // don't allow this web page access
    console.log(request)
    if (request.action == "testSHA1" && request.url) {
      testIsSeenSHA1(request.url).then((isSeen) => {
        if (isSeen) {
          sendMessage({action: 'setIsSeenContent', url: request.url, dataId: request.dataId}, sender.tab.id);
        }
      });
    }
  });


