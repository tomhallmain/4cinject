
// SETUP ////////////

const extensionIDBackground = String(chrome.runtime.id);
const activeTabParams = {
  active: true,
  currentWindow: true
}

function fileCheck(url) {
//  var http = new XMLHttpRequest();
//  http.open('HEAD', url, false);
//  http.send();
//  return http.status!=404;
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
  shouldStore;

  constructor(name, mapLock,maxSize) {
    this.name = name;
    this.mapLock = mapLock;
    this.maxSize = maxSize;
    this.shouldStore = true;

    chrome.storage.local.get([this.name]).then((result) => {
      this.map = result[this.name] || {};
    });
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
    this.setPendingStore();
  }

  // TODO keep commonly seen keys instead of just most recent
  resize() {
    if (roughSizeOfObject(this.map) > this.maxSize) {
      const keys = Object.keys(this.map);
      const max = keys.length / 2;
      for (let i = 0; i < max; i++) {
        delete this.map[keys[i]];
      }
    }
  }

  setPendingStore() {
    if (this.shouldStore) {
      this.shouldStore = false;
      setTimeout(this.doStore, 3000, this);
    }
  }

  doStore(mapCache) {
    mapCache.store();
  }

  store() {
    this.shouldStore = true;
    var saveObject = {};
    saveObject[this.name] = this.map;

    chrome.storage.local.set(saveObject).then(() => {
      console.log("Stored map for " + this.name);
    });
  }
}

class HashesCache {
  mapCache;
  lock;
  md5sList;
  filteredHashes = [];

  constructor() {
    this.lock = new MapLock();
    this.mapCache = new MapCache('knownHashesMap', this.lock, 400000);

    try {
      this.md5sList = fetch("md5s.json").then(response => response.json());
    }
    catch (e) {
      console.error(e);
      console.log("Failed to fetch seen hashes list");
      this.md5sList = [];
    }

    chrome.storage.local.get(["filteredHashes"]).then((result) => {
      this.filteredHashes = result["filteredHashes"] || [];
    });

    try {
      const temp = fetch("filteredMD5s.json").then(response => response.json());

      temp.then((list) => {
        for (const md5 of list) {
          if (!this.filteredHashes.includes(md5)) {
            this.filteredHashes.push(md5);
          }
        }
      });

      this.filteredHashes.sort();
    }
    catch (e) {
      console.error(e);
      console.log("Filtered hashes list not found");
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
    console.log(md5s);
    for (const hash of md5s) {
      if (hash && hash !== '' && !this.isFiltered(hash)) {
        console.log('Filtering content md5: ' + hash);
        this.filteredHashes.push(hash);
      }
    }

    const saveObject = {"filteredHashes": this.filteredHashes};
    chrome.storage.local.set(saveObject).then(() => {
      console.log("Stored filtered hashes list");
    });
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
  teaserFilters = [];
  hashesCache;

  constructor(hashesCache) {
    this.hashesCache = hashesCache;
    this.lock = new MapLock();
    this.knownHashesThreadsMap = new MapCache('knownHashesThreadsMap', this.lock, 300000);
    this.hashThreadIdsMap = new MapCache('hashThreadIdsMap', this.lock, 300000);

    chrome.storage.local.get(["teaserFilters"]).then((result) => {
      this.teaserFilters = result["teaserFilters"] || [];
    });
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

  isFiltered(teaser) {
    const teaserLower = teaser.toLowerCase();

    for (let test of this.teaserFilters) {
      if (test && test.length > 0) {
        if (test.length == 1) {
          if (teaserLower === test.toLowerCase()) {
            console.log("Filtering by teaser: " + teaserLower);
            console.log("Matching teaser test: " + test);
            return true;
          }
        } else if (teaserLower.includes(test.toLowerCase())) {
          console.log("Filtering by teaser: " + teaserLower);
          console.log("Matching teaser test: " + test);
          return true;
        }
      }
    }

    console.log("Teaser did not match any filters: " + teaserLower);
    return false;
  }

  async getMD5(url) {
    var md5;
    if (url in this.knownHashesThreadsMap.map) {
      md5 = this.knownHashesThreadsMap.map[url];
    } else {
      md5 = await getEncodedMD5(url);
    }
    return md5;
  }

  async filterThread(url, teaser) {
    const md5 = await this.getMD5(url);
    if (md5) {
      this.hashesCache.filterHashes([md5]);
    }
    if (teaser) {
      this.teaserFilters.push(teaser);
      const saveObject = {"teaserFilters": this.teaserFilters};
      chrome.storage.local.set(saveObject).then(() => {
        console.log("Stored filtered teasers list");
      });
    }
  }

  async testThread(request) {
    const url = request.url;
    const threadId = request.threadId;
    const teaser = request.teaser;
    var isSeenFromPriorLoad = false;
    var md5;
    this.lockAndResize();

    if (url in this.knownHashesThreadsMap.map) {
      md5 = this.knownHashesThreadsMap.map[url];
      isSeenFromPriorLoad = true;
    }
    else {
      md5 = await getEncodedMD5(url);
      isSeenFromPriorLoad = Object.values(this.knownHashesThreadsMap.map).includes(md5);
      this.knownHashesThreadsMap.map[url] = md5;
    }

    const isFilteredTeaser = this.isFiltered(teaser);

    if (!isSeenFromPriorLoad || isFilteredTeaser) {
      this.hashThreadIdsMap.map[md5] = threadId;
      this.unlock();

      if (isFilteredTeaser || hashesCache.isFiltered(md5)) {
        return 2;
      } else {
        return 0;
      }
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
    this.mapCache = new MapCache('threadKnownPostIdsMap', this.lock, 300000);
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


// Globals

var hashesCache = new HashesCache();
var hashesThreadsCache = new HashesThreadsCache(hashesCache);
var threadPostIDsCache = new ThreadPostIDsCache();
var filteredIDs = [];
var filteredFlags = [];

// Special handling for thread filter and text transforms which are stored in local storage,
// but have to be injected if it is the first time opening the site this session.
var threadFilter = []
var textTransforms = ""
function setThreadFilter(value) {
  threadFilter = value;
}
function setTextTransforms(value) {
  textTransforms = value;
}
try {
  fetch("filters/filter.json").then(response => response.json()).then((data) => setThreadFilter(data));
  fetch("filters/transforms.txt").then(response => response.text()).then((data) => setTextTransforms(data));
} catch (e) {
  console.log("Failed to load filter JSON or text transforms file! Ensure they are placed in filters directory as explained in README.");
  console.error(e);
}

importScripts('spark-md5/spark-md5.min.js', 'helpers.js');

// Services

function updateContentFilter(request) {
  const md5 = request.md5;

  if (md5) {
    hashesCache.filterHashes([md5]);
  }
}

function filterThread(request) {
  const teaser = request.teaser?.toLowerCase();
  hashesThreadsCache.filterThread(request.url, teaser).then(() => {
    console.log("Filtered a thread");
  });
}

function testIsSeenHash(request, sender) {
  hashesCache.testIsSeenHash(request.url, request.dataId).then((seenType) => {
    if (seenType == 0) { // content not known to be seen
      const func = function(id) {handleUnseenContent(id);};
      fireEventToPage(func, [request.dataId], sender.tab.id);
    }
    else if (seenType == 1) { // this content was marked as seen in md5s.json
      func = function(id) {setIsSeenContent(id, true);};
      fireEventToPage(func, [request.dataId], sender.tab.id);
    }
    else if (seenType == 2) { // this content was seen before during this session
      const func = function(id) {setIsSeenContent(id, false);};
      fireEventToPage(func, [request.dataId], sender.tab.id);
    }
    else if (seenType == 3) { // filter this content
      const func = function(id) {handleFilteredContent(id);};
      fireEventToPage(func, [request.dataId], sender.tab.id);
    }
  });
}

function getFullSizeImageURL(url) {
  if (url.includes('s.jpg')) {
    return url.replace('s.jpg', '.jpg');
  } else if (url.includes('s.jpeg')) {
    return url.replace('s.jpeg', '.jpeg');
  } else if (url.includes('s.gif')) {
    return url.replace('s.gif', '.jpg');
  } else if (url.includes('s.jpg')) {
    return url.replace('s.jpg', '.jpg');
  } else {
    return url;
  }
}

function downloadImages(request, sender) {
  for (i = 0; i < request.urls.length; i++) {
    const url = getFullSizeImageURL(request.urls[i]);
    setTimeout(chrome.downloads.download, i * 200, {url: url});
    console.log('Downloading image: ' + url);
  }
}

function findNewPostIDsForThread(request, sender) {
  const newPostIds = threadPostIDsCache.findNewPostIDsForThread(
      request.url, request.postIds);

  if (newPostIds.length > 0) {
    console.log("New post IDs: " + newPostIds);
    func = function(postIds) {highlightNewPosts(postIds);};
    fireEventToPage(func, [newPostIds], sender.tab.id);
  }
  else {
    console.log("Initial thread save or no new post IDs found.");
  }
}

function testThread(request, sender) {
  hashesThreadsCache.testThread(request).then((seenType) => {
    if (seenType == 0) {
      const func = function(id) {addFilterThreadLink(id);};
      fireEventToPage(func, [request.threadId], sender.tab.id);
    }
    else if (seenType == 1) {
      const func = function(id) {setIsBotThread(id);};
      fireEventToPage(func, [request.threadId], sender.tab.id);
    }
    else if (seenType == 2) {
      const func = function(id) {filterThreadById(id);};
      fireEventToPage(func, [request.threadId], sender.tab.id);
    }
  });
}


// Messaging

function sendMessage(message, tabId) {
  console.log("Sending message:");
  console.log(message);
  console.log(Object.keys(chrome.tabs));
  if (!tabId) tabId = chrome.tabs.getCurrent.id;
  chrome.tabs.query({}, function(tabs){
    chrome.tabs.sendMessage(tabId, message);
  });
}

async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

function loadScriptToPage(fileName, tabId) {
  chrome.scripting.executeScript(
    {
      target: {tabId: tabId},
      files: [fileName],
    },
    () => {});
}

function fireEventToPage(func, args, tabId) {
  if (tabId) {
    chrome.scripting.executeScript(
      {
        target: {tabId: tabId, allFrames: true},
        func: func,
        args: args || []
      },
      () => {});
  } else {
    getCurrentTab().then(tab => {
      if (tab) {
        chrome.scripting.executeScript(
          {
            target: {tabId: tab.id, allFrames: true},
            func: func,
            args: args || []
          },
          () => {});
      }
    })
  }
}

function setupInternalScripts(tabId) {
  loadScriptToPage('extensionID.js', tabId);
  loadScriptToPage('helpers.js', tabId);
  console.log("returning tab id to content script: " + tabId);
  sendMessage({
    action: "importRemainingScripts",
    data: tabId,
    threadFilter: threadFilter,
    textTransforms: textTransforms
  }, tabId);
//  loadScriptToPage('reporter.js', tabId);
  loadScriptToPage('base0.js', tabId);
}


// Awaits messages from popup + content script

chrome.runtime.onMessage.addListener(
  function(request,sender,sendResponse) {
    console.log(request);
    var func, args, pattern;

    switch (request.action) {

      case "setupInternalScripts":
        setupInternalScripts(sender.tab.id);

        break;

      case "updateContentFilter":
        updateContentFilter(request);

        break;

      case "getContentFilter":
        sendResponse({
          action: 'contentFilter',
          data: hashesCache.filteredHashes
        });

        break;

      case "setContentFilter":
        const tempMD5s = request.filterSettings['contentFilter'];
        hashesCache.filterHashes(tempMD5s);

        break;

      case 'autoExpand':
        fireEventToPage(function() {toggleAutoExpand()});
        break;
      case 'expand':
        fireEventToPage(function() {openImgs()});
        break;
      case 'close':
        fireEventToPage(function() {close()});
        break;
      case 'digits':
        fireEventToPage(function() {console.log(numbersGraph())});
        break;
      case 'maxDigits':
        fireEventToPage(function() {console.log(maxDigits())});
        break;
      case 'threadGraph':
        fireEventToPage(function() {threadGraph()});
        break;
      case 'subthreads':
        fireEventToPage(function() {toggleSubthreads()});
        break;
      case 'contentExtract':
        fireEventToPage(function() {contentExtract()});
        break;
      case 'fullScreen':
        fireEventToPage(function() {toggleFullscreen()});
        break;
      case 'catalogFilter':
        fireEventToPage(function() {toggleFilter()});
        break;
      case 'toggleTestHash':
        fireEventToPage(function() {toggleTestHash()});
        break;
      case 'highlightNew':
        fireEventToPage(function() {togglePostDiffHighlight()});
        break;

      case 'setVolume':
        func = function(level) {setVolume(level)};
        args = [(request.filterSettings['volume'] || 50)/100];
        fireEventToPage(func, args);
        break;

      case 'setThreadFilter':
        pattern = request.filterSettings['threadFilter'];
        func = function(pattern){setThreadFilter(pattern)};
        fireEventToPage(func, [pattern]);
        break;

      case 'setTextTransforms':
        pattern = request.filterSettings['textTransforms']
        func = function(pattern){setTextTransforms(pattern)};
        fireEventToPage(func, [pattern]);
        break;

      // requests from content script / page


      case "testMD5":
        if (request.url) {
          testIsSeenHash(request, sender);
        }

        break;

      case "downloadImages":
        if (request.urls) {
          downloadImages(request, sender);
        }

        break;

      case "findNewPostIDsForThread":
        if (request.url) {
          findNewPostIDsForThread(request, sender);
        }

        break;

      case "testThread":
        if (request.url) {
          testThread(request, sender);
        }

        break;

      case "filterThread":
        filterThread(request, sender);
        break;

      case 'removeFilteredThread':
        fireEventToPage(function(id) {removeFilteredThread(id)}, [message.dataId]);
        break;

      default:
        console.log("Message not understood: " + request.action);
        break;
    }
  });


// Awaits messages from in-page scripts

chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {

    //if (sender.url === blocklistedWebsite)
    //  return;  // don't allow this web page access
    //  console.log('Background worker received message: ');

    console.log(request);

    switch (request.action) {
      // internal requests

      case "updateContentFilter":
        updateContentFilter(request);
        break;

      case "getContentFilter":
        // technically should use response here instead
        sendMessage({
          action: 'contentFilter',
          data: hashesCache.filteredHashes
        }, sender.tab.id);
        break;

      default:
        console.log('Message not understood: ' + request.action);
        break;
    }
  });
