'use strict';

// Handlers return the response payload (or a promise of it). Content scripts
// and the popup receive it as the result of chrome.runtime.sendMessage.
const handlers = {
  [Actions.TEST_MD5]: async (request) => {
    if (!request.url) return {};
    return {seenType: await hashesCache.testIsSeenHash(request.url, request.md5)};
  },

  [Actions.TEST_THREAD]: async (request) => {
    if (!request.url) return {};
    return {status: await hashesThreadsCache.testThread(request.url, request.threadId, request.teaser)};
  },

  [Actions.FIND_NEW_POST_IDS]: async (request) => {
    if (!request.url) return {};
    const newPostIds = await threadPostIdsCache.findNewIds(request.url, request.postIds);
    if (newPostIds.length > 0) {
      console.log("New post IDs: " + newPostIds);
    } else {
      console.log("Initial thread save or no new post IDs found.");
    }
    return {newPostIds};
  },

  [Actions.FIND_NEW_THREAD_IDS]: async (request) => {
    if (!request.url) return {};
    const newThreadIds = await catalogThreadIdsCache.findNewIds(request.url, request.threadIds);
    console.log(newThreadIds.length > 0
        ? "New catalog thread IDs: " + newThreadIds
        : "Initial catalog save or no new thread IDs found.");
    return {newThreadIds};
  },

  [Actions.FILTER_THREAD]: async (request) => {
    await hashesThreadsCache.filterThread(request.url, request.teaser?.toLowerCase());
    console.log("Filtered a thread");
    return {};
  },

  [Actions.UPDATE_CONTENT_FILTER]: async (request) => {
    if (request.md5) {
      await hashesCache.filterHashes([request.md5]);
    }
    return {};
  },

  [Actions.DOWNLOAD_IMAGES]: (request) => {
    (request.urls || []).forEach((url, i) => {
      setTimeout(() => chrome.downloads.download({url}), i * 200);
      console.log('Downloading image: ' + url);
    });
    return {};
  },

  [Actions.GET_FILE_DEFAULTS]: () => Resources.getFileDefaults(),

  [Actions.GET_CONTENT_FILTER]: () => hashesCache.getContentFilter(),

  [Actions.REPLACE_CONTENT_FILTER]: (request) =>
    hashesCache.replaceContentFilter(request.hashes, request.baseVersion),
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handler = handlers[request?.action];
  if (!handler) {
    console.log("Message not understood: " + request?.action);
    return false;
  }

  Promise.resolve()
    .then(() => handler(request, sender))
    .then(
      (response) => sendResponse(response || {}),
      (error) => {
        console.error('Failed to handle ' + request.action, error);
        sendResponse({error: String(error)});
      });
  return true; // the response is sent asynchronously
});
