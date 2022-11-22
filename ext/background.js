const extensionID = String(chrome.runtime.id)

function fileCheck(url) {
  var http = new XMLHttpRequest();
  http.open('HEAD', url, false);
  http.send();
  return http.status!=404;
}

var threadKnownPostIdsMap = {}
var knownSha1sMap = {}
var sha1sList = []
var knownSha1sThreadsMap = {}
var sha1ThreadIdsMap = {}
var botThreadSha1s = []
var filteredSha1s = []
var filteredIDs = []
var filteredFlags = []
var modifyingSha1sMap = false
var modifyingSha1sThreadsMap = false
var modifyingKnownPostIdsMap = false

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

function clearSha1sMap() {
  if (isEmpty(knownSha1sMap)) {
    return;
  }
  else if (modifyingSha1sMap) {
    setTimeout(clearSha1sMap, 40000)
    console.log('Set timeout to clear knownSha1sMap')
  }
  else {
    knownSha1sMap = {}
    console.log('Cleared knownSha1sMap')
  }
}

function clearSha1sThreadsMap() {
  if (isEmpty(knownSha1sThreadsMap)) {
    return;
  }
  else if (modifyingSha1sThreadsMap) {
    setTimeout(clearSha1sThreadsMap, 40000)
    console.log('Set timeout to clear knownSha1sThreadsMap')
  }
  else {
    knownSha1sThreadsMap = {}
    console.log('Cleared knownSha1sThreadsMap')
  }
}

function clearShaThreadIdsMap() {
  if (isEmpty(sha1ThreadIdsMap)) {
    return;
  }
  else if (modifyingSha1sThreadsMap) {
    setTimeout(clearShaThreadIdsMap, 40000)
    console.log('Set timeout to clear sha1ThreadIdsMap')
  }
  else {
    sha1ThreadIdsMap = {}
    console.log('Cleared sha1ThreadIdsMap')
  }
}

function clearThreadKnownPostIdsMap() {
  if (isEmpty(threadKnownPostIdsMap)) {
    return;
  }
  else if (modifyingKnownPostIdsMap) {
    setTimeout(clearThreadKnownPostIdsMap, 40000)
    console.log('Set timeout to clear threadKnownPostIdsMap')
  }
  else {
    threadKnownPostIdsMap = {}
    console.log('Cleared threadKnownPostIdsMap')
  }
}


// Services

async function testIsSeenSha1(url) {
  modifyingSha1sMap = true

  if (roughSizeOfObject(knownSha1sMap) > 150000) {
    clearSha1sMap()
  }

  var isSeenFromPriorLoad = false;
  var sha1;
  if (url in knownSha1sMap) {
    sha1 = knownSha1sMap[url];
    isSeenFromPriorLoad = true;
  }
  else {
    sha1 = await getSHA1(url);
    isSeenFromPriorLoad = sha1 in Object.values(knownSha1sMap);
    knownSha1sMap[url] = sha1;
  }

  if (Array.isArray(sha1sList)) {
    modifyingSha1sMap = false
    if (sha1sList.indexOf(sha1) > -1) {
      return 1
    }
  }
  else {
    modifyingSha1sMap = false
    return sha1sList.then((list) => {
      const isSeen = list.indexOf(sha1) > -1;
      if (isSeen) {
        console.log(sha1 + " was found in existing sha1s list.");
        return 1;
      }
      else if (isSeenFromPriorLoad) {
        return 2;
      }
      else {
        console.log(sha1 + " was not found.");
        return 0;
      }
    });
  }
}

function findNewPostIDsForThread(threadURL, postIds) {
  modifyingKnownPostIdsMap = true

  if (roughSizeOfObject(threadKnownPostIdsMap) > 150000) {
    clearThreadKnownPostIdsMap()
  }

  const knownPostIds = threadKnownPostIdsMap[threadURL]
  if (!knownPostIds || knownPostIds.length === 0) {
    threadKnownPostIdsMap[threadURL] = postIds
    modifyingKnownPostIdsMap = false
    return [] // Assuming this is a newly opened thread
  }
  else {
    newPostIds = postIds.filter(postId => !knownPostIds.includes(postId));
    threadKnownPostIdsMap[threadURL] = postIds
    modifyingKnownPostIdsMap = false
    return newPostIds
  }
}


async function testIsSeenTwiceSha1Thread(url, threadId) {
  modifyingSha1sThreadsMap = true

  if (roughSizeOfObject(knownSha1sThreadsMap) > 150000) {
    clearSha1sThreadsMap()
  }

  if (roughSizeOfObject(sha1ThreadIdsMap) > 150000) {
    clearShaThreadIdsMap()
  }

  var isSeenFromPriorLoad = false;
  var sha1;
  if (url in knownSha1sThreadsMap) {
    sha1 = knownSha1sThreadsMap[url];
    isSeenFromPriorLoad = true;
  }
  else {
    sha1 = await getSHA1(url);
    isSeenFromPriorLoad = sha1 in Object.values(knownSha1sThreadsMap);
    knownSha1sThreadsMap[url] = sha1;
  }


  if (!isSeenFromPriorLoad) {
    sha1ThreadIdsMap[sha1] = threadId
    modifyingSha1sThreadsMap = false
    return 0;
  }
  else if (botThreadSha1s.indexOf(sha1) > -1) {
    modifyingSha1sThreadsMap = false
    return 1;
  }
  else if (sha1 in sha1ThreadIdsMap) {
    modifyingSha1sThreadsMap = false

    if (sha1ThreadIdsMap[sha1] === threadId) {
      return 0
    }
    else {
      botThreadSha1s.push(sha1)
      return 1
    }
  }
  else {
    sha1ThreadIdsMap[sha1] = threadId
    modifyingSha1sThreadsMap = false
    return 0
  }
}


// Messaging

function sendMessage(message, tabId) {
  chrome.tabs.query({}, function(tabs){
    chrome.tabs.sendMessage(tabId, message);
  });
}


// Awaits messages from popup

chrome.runtime.onMessage.addListener(
  function(request,sender,sendResponse) {
    if (request.action == "updateContentFilter") {

      updateContentFilter(request);

    }
    else if (request.action == "getContentFilter") {

      sendResponse({
        action: 'contentFilter',
        data: filteredSha1s
      });

    }
  });


// Awaits messages from in-page scripts

chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {

    //if (sender.url === blocklistedWebsite)
    //  return;  // don't allow this web page access

    console.log(request);

    if (request.action == "testSHA1" && request.url) {

      testIsSeenSha1(request.url).then((seenType) => {
        if (seenType == 0) {
          sendMessage({
            action: 'handleUnseenContent',
            url: request.url,
            dataId: request.dataId
          }, sender.tab.id);
        }
        else if (seenType == 1) {
          sendMessage({
            action: 'setIsSeenContent',
            url: request.url,
            dataId: request.dataId
          }, sender.tab.id);
        }
        else if (seenType == 2) {
          sendMessage({
            action: 'setIsSeenContentNotStored',
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
    else if (request.action == "testSHA1ForThreadImage" && request.url) {

      testIsSeenTwiceSha1Thread(request.url, request.threadId).then((seenType) => {
        if (seenType == 1) {
          sendMessage({
            action: 'setIsBotThread',
            url: request.url,
            dataId: request.dataId
          }, sender.tab.id);
        }
      });

    }
    else if (request.action == "updateContentFilter") {

      updateContentFilter(request);

    }
    else if (request.action == "getContentFilter") {

      sendMessage({
        action: 'contentFilter',
        data: filteredSha1s
      }, sender.tab.id);

    }
  });
