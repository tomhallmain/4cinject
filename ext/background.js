
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
      this.map = {};
    }
  }
}

class HashesCache {
  mapCache;
  lock;
  md5sList;
  filteredHashes = [];

  constructor() {
    this.lock = new MapLock();
    this.mapCache = new MapCache('knownHashesMap', this.lock, 200000);

    try {
      if (fileCheck("md5s.json")) {
        this.md5sList = fetch("md5s.json").then(response => response.json());
      }
    }
    catch (e) {
      console.info("Seen hashes list not found");
      this.md5sList = [];
    }

    try {
      if (fileCheck("filteredMD5s.json")) {
        const temp = fetch("filteredMD5s.json").then(response => response.json());

        temp.then((list) => {
          for (const md5 of list) {
            this.filteredHashes.push(md5);
          }
        });

        this.filteredHashes.sort();
      }
    }
    catch (e) {
      console.info("Filtered hashes list not found");
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
    return this.filteredHashes.includes(md5);
  }

  filterHashes(md5s) {
    for (md5 of md5s) {
      if (md5 !== '' && !this.isFiltered(md5)) {
        console.log('Adding filtered md5: ' + md5);
        this.filteredHashes.push(md5);
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


class HashesThreadsCache {
  knownHashesThreadsMap;
  hashThreadIdsMap;
  lock;
  botThreadHashes = [];
  filteredThreadHashes = [];
  hashesCache;

  constructor(hashesCache) {
    this.hashesCache = hashesCache;
    this.lock = new MapLock();
    this.knownHashesThreadsMap = new MapCache('knownHashesThreadsMap', this.lock, 200000);
    this.hashThreadIdsMap = new MapCache('hashThreadIdsMap', this.lock, 200000);
  }

  lockAndResize() {
    this.lock.set(true);
    this.knownHashesThreadsMap.resize();
    this.hashThreadIdsMap.resize();
  }

  unlock() {
    this.lock.set(false);
  }

  isBotThread(md5) {
    return this.botThreadHashes.indexOf(md5) > -1;
  }

  getFullSizeImageURL(url) {
    if (url.includes('s.jpg')) {
      return url.replace('s.jpg', '.jpg');
    } else if (url.includes('s.jpeg')) {
      return url.replace('s.jpeg', '.jpeg');
    } else if (url.includes('s.gif')) {
      return url.replace('s.gif', '.jpg');
    } else if (url.includes('s.jpg')) {
      return url.replace('s.jpg', '.jpg');
    }
  }

  async testIsSeenHashThreadImage(url, threadId) {
    this.lockAndResize();

    var isSeenFromPriorLoad = false;
    var md5;

    if (url in this.knownHashesThreadsMap.map) {
      md5 = this.knownHashesThreadsMap.map[url];
      isSeenFromPriorLoad = true;
    }
    else {
      md5 = await getEncodedMD5(url);
      isSeenFromPriorLoad = Object.values(this.knownHashesThreadsMap.map).includes(md5);
      this.knownHashesThreadsMap.map[url] = md5;
    }

    if (!isSeenFromPriorLoad) {
      this.hashThreadIdsMap.map[md5] = threadId;
      this.unlock();
      return 0;
    }
    else if (this.isBotThread(threadId)) {
      this.unlock();
      return 1;
    }
    else if (md5 in this.hashThreadIdsMap.map) {
      this.unlock();

      if (this.hashThreadIdsMap.map[md5] === threadId) {
        return 0;
      }
      else {
        this.botThreadHashes.push(md5);
        return 1;
      }
    }
    else {
      this.hashThreadIdsMap.map[md5] = threadId;
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


var hashesCache = new HashesCache();
var hashesThreadsCache = new HashesThreadsCache(hashesCache);
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
    hashesCache.filteredHashes.push(md5);
  }
}

function testIsSeenHash(request, sender) {
  hashesCache.testIsSeenHash(request.url, request.dataId).then((seenType) => {
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

function testHashForThreadImage(request, sender) {
  hashesThreadsCache.testIsSeenHashThreadImage(
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
        data: hashesCache.filteredHashes
      });

    }
    else if (request.action == "setContentFilter") {

      const tempMD5s = request.filterSettings['contentFilter'];
      hashesCache.filterHashes(tempMD5s);

    }
    else if (request.action == "downloadFilteredHashes") {

      if (hashesCache.filteredHashes.length > 0) {
        const data = "[\n\t\"" + hashesCache.filteredHashes.join("\",\n\t\"") + "\"\n]";
        saveDataToDownloadedFile(data, "filteredMD5s", "application/json");
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

      testIsSeenHash(request, sender);

    }
    else if (request.action == "findNewPostIDsForThread" && request.url) {

      findNewPostIDsForThread(request, sender);

    }
    else if (request.action == "testHashForThreadImage" && request.url) {

      testHashForThreadImage(request, sender);

    }
    else if (request.action == "updateContentFilter") {

      updateContentFilter(request);

    }
    else if (request.action == "getContentFilter") {

      sendMessage({
        action: 'contentFilter',
        data: hashesCache.filteredHashes
      }, sender.tab.id);

    }
  });
