const extensionID = String(chrome.runtime.id);

function fileCheck(url) {
  var http = new XMLHttpRequest();
  http.open('HEAD', url, false);
  http.send();
  return http.status!=404;
}

var threadKnownPostIdsMap = {};
var knownMD5sMap = {};
var md5sList = [];
var knownSha1sThreadsMap = {};
var sha1ThreadIdsMap = {};
var botThreadSha1s = [];
var filteredMD5s = [];
var filteredIDs = [];
var filteredFlags = [];
var modifyingMD5sMap = false;
var modifyingSha1sThreadsMap = false;
var modifyingKnownPostIdsMap = false;

try {
  if (fileCheck("md5s.json")) {
    md5sList = fetch("md5s.json").then(response => response.json());
  }
}
catch {
  md5sList = [];
}

function loadScript(fileName) {
  var s = document.createElement('script');
  s.src = chrome.runtime.getURL(fileName);
  s.onload = function() { this.remove() };
  (document.head || document.documentElement).appendChild(s);
};

files = ['helpers.js'];
files.map( file => loadScript(file) );

function clearMD5sMap() {
  if (isEmpty(knownMD5sMap)) {
    return;
  }
  else if (modifyingMD5sMap) {
    setTimeout(clearMD5sMap, 40000);
    console.log('Set timeout to clear knownMD5sMap');
  }
  else {
    knownMD5sMap = {};
    console.log('Cleared knownMD5sMap');
  }
}

function clearSha1sThreadsMap() {
  if (isEmpty(knownSha1sThreadsMap)) {
    return;
  }
  else if (modifyingSha1sThreadsMap) {
    setTimeout(clearSha1sThreadsMap, 40000);
    console.log('Set timeout to clear knownSha1sThreadsMap');
  }
  else {
    knownSha1sThreadsMap = {}
    console.log('Cleared knownSha1sThreadsMap');
  }
}

function clearShaThreadIdsMap() {
  if (isEmpty(sha1ThreadIdsMap)) {
    return;
  }
  else if (modifyingSha1sThreadsMap) {
    setTimeout(clearShaThreadIdsMap, 40000);
    console.log('Set timeout to clear sha1ThreadIdsMap');
  }
  else {
    sha1ThreadIdsMap = {}
    console.log('Cleared sha1ThreadIdsMap');
  }
}

function clearThreadKnownPostIdsMap() {
  if (isEmpty(threadKnownPostIdsMap)) {
    return;
  }
  else if (modifyingKnownPostIdsMap) {
    setTimeout(clearThreadKnownPostIdsMap, 40000);
    console.log('Set timeout to clear threadKnownPostIdsMap');
  }
  else {
    threadKnownPostIdsMap = {};
    console.log('Cleared threadKnownPostIdsMap');
  }
}


// Services

function updateContentFilter(request) {
  const md5 = request.md5;

  if (md5) {
    console.log("Filtering content md5: " + md5);
    filteredMD5s.push(md5);
  }
}

async function testIsSeenHash(url, md5) {
  modifyingMD5sMap = true;

  if (roughSizeOfObject(knownMD5sMap) > 200000) {
    clearMD5sMap();
  }

  var isSeenFromPriorLoad = false;
  if (url in knownMD5sMap) {
    isSeenFromPriorLoad = true;
  }
  else {
    isSeenFromPriorLoad = md5 in Object.values(knownMD5sMap);
    knownMD5sMap[url] = md5;
  }

  if (filteredMD5s.indexOf(md5) > -1) {
    modifyingMD5sMap = false
    return 3;
  }
  else if (Array.isArray(md5sList)) {
    modifyingMD5sMap = false
    return md5sList.indexOf(md5) > -1 ? 1 : 0;
  }
  else {
    modifyingMD5sMap = false
    return md5sList.then((list) => {
      const isSeen = list.indexOf(md5) > -1;
      if (isSeen) {
        console.log(md5 + " was found in existing MD5s list.");
        return 1;
      }
      else if (isSeenFromPriorLoad) {
        return 2;
      }
      else {
        console.log(md5 + " was not found.");
        return 0;
      }
    });
  }
}

function findNewPostIDsForThread(threadURL, postIds) {
  modifyingKnownPostIdsMap = true;

  if (roughSizeOfObject(threadKnownPostIdsMap) > 200000) {
    clearThreadKnownPostIdsMap();
  }

  const knownPostIds = threadKnownPostIdsMap[threadURL]
  if (!knownPostIds || knownPostIds.length === 0) {
    threadKnownPostIdsMap[threadURL] = postIds;
    modifyingKnownPostIdsMap = false;
    return [] // Assuming this is a newly opened thread
  }
  else {
    newPostIds = postIds.filter(postId => !knownPostIds.includes(postId));
    threadKnownPostIdsMap[threadURL] = postIds;
    modifyingKnownPostIdsMap = false;
    return newPostIds;
  }
}

// NOTE can't use md5 here because it's not exposed on the thread teaser image
async function testIsSeenTwiceSha1Thread(url, threadId) {
  modifyingSha1sThreadsMap = true;

  if (roughSizeOfObject(knownSha1sThreadsMap) > 200000) {
    clearSha1sThreadsMap();
  }

  if (roughSizeOfObject(sha1ThreadIdsMap) > 200000) {
    clearShaThreadIdsMap();
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
    sha1ThreadIdsMap[sha1] = threadId;
    modifyingSha1sThreadsMap = false;
    return 0;
  }
  else if (botThreadSha1s.indexOf(sha1) > -1) {
    modifyingSha1sThreadsMap = false;
    return 1;
  }
  else if (sha1 in sha1ThreadIdsMap) {
    modifyingSha1sThreadsMap = false;

    if (sha1ThreadIdsMap[sha1] === threadId) {
      return 0;
    }
    else {
      botThreadSha1s.push(sha1);
      return 1;
    }
  }
  else {
    sha1ThreadIdsMap[sha1] = threadId;
    modifyingSha1sThreadsMap = false;
    return 0;
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
        data: filteredMD5s
      });

    }
    else if (request.action == "setContentFilter") {

      const tempMD5s = request.filterSettings['contentFilter'];

      for (md5 of tempMD5s) {
        if (md5 !== '' && filteredMD5s.indexOf(md5) < 0) {
          console.log('Adding filtered md5 from popup: ' + md5);
          filteredMD5s.push(md5);
        }
      }

    }
  });


// Awaits messages from in-page scripts

chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {

    //if (sender.url === blocklistedWebsite)
    //  return;  // don't allow this web page access

    console.log(request);

    if (request.action == "testMD5" && request.url) {

      testIsSeenHash(request.url, request.dataId).then((seenType) => {
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
        else if (seenType == 3) {
          sendMessage({
            action: 'handleFilteredContent',
            url: request.url,
            dataId: request.dataId
          }, sender.tab.id);
        }
      });

    }
    else if (request.action == "findNewPostIDsForThread" && request.url) {

      newPostIds = findNewPostIDsForThread(request.url, request.postIds);

      if (newPostIds.length > 0) {
        console.log("New post IDs: " + newPostIds)
        sendMessage({
          action: 'setNewPostStyle',
          url: request.url,
          postIds: newPostIds
        }, sender.tab.id);
      }
      else {
        console.log("Initial thread save or no new post IDs found.");
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
        data: filteredMD5s
      }, sender.tab.id);

    }
  });
