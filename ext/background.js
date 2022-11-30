
// SETUP ////////////

const extensionID = String(chrome.runtime.id);

function fileCheck(url) {
  var http = new XMLHttpRequest();
  http.open('HEAD', url, false);
  http.send();
  return http.status!=404;
}

class MapLock {
  isLocked;

  constructor(isLocked) {
    this.isLocked = isLocked || false;
  }

  set(bool) {
    this.isLocked = bool;
  }
}

class MapCache {
  name;
  map;
  mapLock;
  maxSize;

  constructor(name, mapLock,maxSize) {
    this.name = name;
    this.mapLock = mapLock;
    this.map = {};
    this.maxSize = maxSize;
  }

  clear() {
    if (isEmpty(this.map)) {
      return;
    }
    else if (this.mapLock.isLocked) {
      setTimeout(this.clear, 40000);
      console.log('Set timeout to clear ' + this.name);
    }
    else {
      this.map = {};
      console.log('Cleared ' + this.name);
    }
  }

  lock() {
    this.mapLock.set(true);
  }

  unlock() {
    this.mapLock.set(false);
  }

  resize() {
    if (roughSizeOfObject(this.map) > this.maxSize) {
      this.map.clear();
    }
  }
}

class MD5sCache {
  mapCache;
  lock;
  md5sList;
  filteredMD5s = [];

  constructor() {
    this.lock = new MapLock();
    this.mapCache = new MapCache('knownMD5sMap', this.lock, 200000);

    try {
      if (fileCheck("md5s.json")) {
        this.md5sList = fetch("md5s.json").then(response => response.json());
      }
    }
    catch {
      this.md5sList = [];
    }
  }

  lockAndResize() {
    this.mapCache.lock();
    this.mapCache.resize();
  }

  unlock() {
    this.mapCache.unlock();
  }

  checkIncludes(url, md5) {
    var isSeenFromPriorLoad = false;

    if (url in this.mapCache.map) {
      isSeenFromPriorLoad = true;
    }
    else {
      isSeenFromPriorLoad = Object.values(this.mapCache.map).includes(md5);
      this.mapCache.map[url] = md5;
    }

    return isSeenFromPriorLoad;
  }

  isFiltered(md5) {
    return this.filteredMD5s.includes(md5);
  }

  filterHashes(md5s) {
    for (md5 of md5s) {
      if (md5 !== '' && !this.isFiltered(md5)) {
        console.log('Adding filtered md5: ' + md5);
        this.filteredMD5s.push(md5);
      }
    }
  }

  async testIsSeenHash(url, md5) {
    this.lockAndResize();
    const isSeenFromPriorLoad = this.checkIncludes(url, md5);

    if (this.isFiltered(md5)) {
      this.unlock();
      return 3;
    }
    else if (Array.isArray(this.md5sList)) {
      this.unlock();
      return this.md5sList.indexOf(md5) > -1 ? 1 : 0;
    }
    else {
      this.unlock();
      return this.md5sList.then((list) => {
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
}


// NOTE can't use md5 here because it's not exposed on the thread teaser image
class SHA1sThreadsCache {
  knownSha1sThreadsMap;
  sha1ThreadIdsMap;
  lock;
  botThreadSha1s = [];

  constructor() {
    this.lock = new MapLock();
    this.knownSha1sThreadsMap = new MapCache('knownSha1sThreadsMap', this.lock, 200000);
    this.sha1ThreadIdsMap = new MapCache('sha1ThreadIdsMap', this.lock, 200000);
  }

  lockAndResize() {
    this.lock.set(true);
    this.knownSha1sThreadsMap.resize();
    this.sha1ThreadIdsMap.resize();
  }

  unlock() {
    this.lock.set(false);
  }

  isBotThread(sha1) {
    return this.botThreadSha1s.indexOf(sha1) > -1;
  }

  async testIsSeenTwiceSha1Thread(url, threadId) {
    this.lockAndResize();

    var isSeenFromPriorLoad = false;
    var sha1;

    if (url in this.knownSha1sThreadsMap.map) {
      sha1 = this.knownSha1sThreadsMap.map[url];
      isSeenFromPriorLoad = true;
    }
    else {
      sha1 = await getSHA1(url);
      isSeenFromPriorLoad = Object.values(this.knownSha1sThreadsMap.map).includes(sha1);
      this.knownSha1sThreadsMap.map[url] = sha1;
    }

    if (!isSeenFromPriorLoad) {
      this.sha1ThreadIdsMap.map[sha1] = threadId;
      this.unlock();
      return 0;
    }
    else if (this.isBotThread(threadId)) {
      this.unlock();
      return 1;
    }
    else if (sha1 in this.sha1ThreadIdsMap.map) {
      this.unlock();

      if (this.sha1ThreadIdsMap.map[sha1] === threadId) {
        return 0;
      }
      else {
        this.botThreadSha1s.push(sha1);
        return 1;
      }
    }
    else {
      this.sha1ThreadIdsMap.map[sha1] = threadId;
      this.unlock();
      return 0;
    }
  }
}

class ThreadPostIDsCache {
  mapCache;
  lock;

  constructor() {
    this.lock = new MapLock();
    this.mapCache = new MapCache('threadKnownPostIdsMap', this.lock, 200000);
  }

  lockAndResize() {
    this.mapCache.lock();
    this.mapCache.resize();
  }

  unlock() {
    this.mapCache.unlock();
  }

  checkIncludes(url, md5) {
    var isSeenFromPriorLoad = false;

    if (url in this.mapCache.map) {
      isSeenFromPriorLoad = true;
    }
    else {
      isSeenFromPriorLoad = Object.values(this.mapCache.map).includes(md5);
      this.mapCache.map[url] = md5;
    }

    return isSeenFromPriorLoad;
  }

  findNewPostIDsForThread(threadURL, postIds) {
    this.lockAndResize();

    const knownPostIds = this.mapCache.map[threadURL]
    if (!knownPostIds || knownPostIds.length === 0) {
      this.mapCache.map[threadURL] = postIds;
      this.unlock();
      return [] // Assuming this is a newly opened thread
    }
    else {
      const newPostIds = postIds.filter(postId => !knownPostIds.includes(postId));
      this.mapCache.map[threadURL] = postIds;
      this.unlock();
      return newPostIds;
    }
  }
}


var md5sCache = new MD5sCache();
var sha1sThreadsCache = new SHA1sThreadsCache();
var threadPostIDsCache = new ThreadPostIDsCache();
var filteredIDs = [];
var filteredFlags = [];


function loadScript(fileName) {
  var s = document.createElement('script');
  s.src = chrome.runtime.getURL(fileName);
  s.onload = function() { this.remove() };
  (document.head || document.documentElement).appendChild(s);
};

files = ['spark-md5/spark-md5.min.js', 'helpers.js'];
files.map( file => loadScript(file) );


// Services

function updateContentFilter(request) {
  const md5 = request.md5;

  if (md5) {
    console.log("Filtering content md5: " + md5);
    md5sCache.filteredMD5s.push(md5);
  }
}

function testIsSeenHash(request, sender) {
  md5sCache.testIsSeenHash(request.url, request.dataId).then((seenType) => {
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

function findNewPostIDsForThread(request, sender) {
  const newPostIds = threadPostIDsCache.findNewPostIDsForThread(
      request.url, request.postIds);

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

function testSHA1ForThreadImage(request, sender) {
  sha1sThreadsCache.testIsSeenTwiceSha1Thread(
      request.url, request.threadId).then((seenType) => {
    if (seenType == 1) {
      sendMessage({
        action: 'setIsBotThread',
        url: request.url,
        dataId: request.dataId
      }, sender.tab.id);
    }
  });
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
        data: md5sCache.filteredMD5s
      });

    }
    else if (request.action == "setContentFilter") {

      const tempMD5s = request.filterSettings['contentFilter'];
      md5sCache.filterHashes(tempMD5s);

    }
  });


// Awaits messages from in-page scripts

chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {

    //if (sender.url === blocklistedWebsite)
    //  return;  // don't allow this web page access

    console.log(request);

    if (request.action == "testMD5" && request.url) {

      testIsSeenHash(request, sender);

    }
    else if (request.action == "findNewPostIDsForThread" && request.url) {

      findNewPostIDsForThread(request, sender);

    }
    else if (request.action == "testSHA1ForThreadImage" && request.url) {

      testSHA1ForThreadImage(request, sender);

    }
    else if (request.action == "updateContentFilter") {

      updateContentFilter(request);

    }
    else if (request.action == "getContentFilter") {

      sendMessage({
        action: 'contentFilter',
        data: md5sCache.filteredMD5s
      }, sender.tab.id);

    }
  });
