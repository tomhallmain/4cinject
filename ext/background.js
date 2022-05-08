const extensionID = String(chrome.runtime.id)

function fileCheck(url) {
  var http = new XMLHttpRequest();
  http.open('HEAD', url, false);
  http.send();
  return http.status!=404;
}

var threadKnownPostIdsMap = {}
var knownSHA1sMap = {}
var sha1sList = []

try {
  if (fileCheck("sha1s.json")) {
    sha1sList = fetch("sha1s.json").then(response => response.json());
  }
}
catch {
  sha1sList = [];
}

function loadScript(fileName) {
  var s = document.createElement('script');
  s.src = chrome.runtime.getURL(fileName);
  s.onload = function() { this.remove() };
  (document.head || document.documentElement).appendChild(s);
};

files = ['helpers.js']
files.map( file => loadScript(file) );

async function testIsSeenSHA1(url) {
  var sha1;
  if (url in knownSHA1sMap) {
    sha1 = knownSHA1sMap[url]
  }
  else {
    sha1 = await getSHA1(url);
    knownSHA1sMap[url] = sha1
  }
  
  if (Array.isArray(sha1sList)) {
    return sha1sList.indexOf(sha1) > -1;
  }
  else {
    return sha1sList.then((list) => {
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

function findNewPostIDsForThread(threadURL, postIds) {
  const knownPostIds = threadKnownPostIdsMap[threadURL]
  if (!knownPostIds || knownPostIds.length == 0) {
    threadKnownPostIdsMap[threadURL] = postIds
    return [] // Assuming this is a newly opened thread
  }
  else {
    newPostIds = postIds.filter(postId => !knownPostIds.includes(postId));
    threadKnownPostIdsMap[threadURL] = postIds
    return newPostIds
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
          sendMessage({
            action: 'setIsSeenContent',
            url: request.url,
            dataId: request.dataId
          }, sender.tab.id);
        }
      });
    }
    else if (request.action == "findNewPostIDsForThread" && request.url) {
      newPostIds = findNewPostIDsForThread(request.url, request.postIds)

      if (newPostIds.length > 0) {
        console.log("New post IDs: " + newPostIds)
        sendMessage({
          action: 'setNewPostStyle',
          url: request.url,
          postIds: newPostIds
        }, sender.tab.id);
      }
      else {
        console.log("Initial thread save or no new post IDs found.")
      }
    }
  });


