'use strict';

const Util = {
  first(arr) {
    return arr[0];
  },

  last(arr) {
    return arr[arr.length - 1];
  },

  arrayRemove(arr, value) {
    return arr.filter(el => el != value);
  },

  isEmpty(obj) {
    return !obj || Object.keys(obj).length === 0;
  },

  // A base64-encoded binary MD5, the format of 4chan's data-md5 attributes
  // and of the content filter's entries.
  isEncodedMD5(value) {
    return typeof value === 'string' && /^[A-Za-z0-9+/]{22}==$/.test(value);
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};
