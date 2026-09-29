'use strict';

// Message protocol shared by the worker, the content scripts and the popup.
// Every message is {action, ...payload}.
const Actions = Object.freeze({
  // Content script -> worker
  TEST_MD5: 'testMD5',
  TEST_THREAD: 'testThread',
  FIND_NEW_POST_IDS: 'findNewPostIDsForThread',
  FIND_NEW_THREAD_IDS: 'findNewThreadIDsForCatalog',
  FILTER_THREAD: 'filterThread',
  UPDATE_CONTENT_FILTER: 'updateContentFilter',
  DOWNLOAD_IMAGES: 'downloadImages',
  GET_FILE_DEFAULTS: 'getFileDefaults',

  // Popup -> worker
  GET_CONTENT_FILTER: 'getContentFilter',
  REPLACE_CONTENT_FILTER: 'replaceContentFilter',

  // Popup -> content script
  EXPAND: 'expand',
  CLOSE: 'close',
  AUTO_EXPAND: 'autoExpand',
  DIGITS: 'digits',
  MAX_DIGITS: 'maxDigits',
  THREAD_GRAPH: 'threadGraph',
  SUBTHREADS: 'subthreads',
  CONTENT_EXTRACT: 'contentExtract',
  TOGGLE_TEST_HASH: 'toggleTestHash',
  FULL_SCREEN: 'fullScreen',
  CATALOG_FILTER: 'catalogFilter',
  HIGHLIGHT_NEW: 'highlightNew',
  SET_VOLUME: 'setVolume',
  SET_THREAD_FILTER: 'setThreadFilter',
  SET_TEXT_TRANSFORMS: 'setTextTransforms',
  GET_VOLUME: 'getVolume',
  GET_THREAD_FILTER: 'getThreadFilter',
  GET_TEXT_TRANSFORMS: 'getTextTransforms',
});

// Result of TEST_MD5 for one piece of post content.
const SeenType = Object.freeze({
  UNSEEN: 0,    // not known to be seen
  STORED: 1,    // listed in md5s.json
  SESSION: 2,   // seen on an earlier page load
  FILTERED: 3,  // in the content filter
});

// Result of TEST_THREAD for one catalog thread.
const ThreadStatus = Object.freeze({
  NORMAL: 0,
  BOT: 1,       // its image is also the image of another thread
  FILTERED: 2,  // teaser or image hash is filtered
});
