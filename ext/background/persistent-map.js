'use strict';

// A plain object map mirrored to chrome.storage.local under `storageKey`.
// The worker can be stopped at any time, so the in-memory copy is reloaded
// on start; callers must await `ready` before reading or writing.
class PersistentMap {
  static SAVE_DELAY_MS = 3000;

  constructor(storageKey, maxSize) {
    this.storageKey = storageKey;
    this.maxSize = maxSize;
    this.map = {};
    this.saveTimer = null;
    this.ready = chrome.storage.local.get([storageKey]).then((result) => {
      this.map = result[storageKey] || {};
    });
  }

  has(key) {
    return Object.hasOwn(this.map, key);
  }

  get(key) {
    return this.map[key];
  }

  set(key, value) {
    this.map[key] = value;
    this.scheduleSave();
  }

  values() {
    return Object.values(this.map);
  }

  // Once the map exceeds maxSize (estimated bytes), drop the older half of
  // its keys by insertion order.
  trim() {
    if (PersistentMap.roughSizeOf(this.map) <= this.maxSize) return;
    const keys = Object.keys(this.map);
    const half = keys.length / 2;
    for (let i = 0; i < half; i++) {
      delete this.map[keys[i]];
    }
    this.scheduleSave();
  }

  scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      chrome.storage.local.set({[this.storageKey]: this.map}).then(() => {
        console.log("Stored map for " + this.storageKey);
      });
    }, PersistentMap.SAVE_DELAY_MS);
  }

  static roughSizeOf(object) {
    const seen = [];
    const stack = [object];
    let bytes = 0;

    while (stack.length) {
      const value = stack.pop();

      if (typeof value === 'boolean') {
        bytes += 4;
      } else if (typeof value === 'string') {
        bytes += value.length * 2;
      } else if (typeof value === 'number') {
        bytes += 8;
      } else if (typeof value === 'object' && value !== null && seen.indexOf(value) === -1) {
        seen.push(value);
        for (const key in value) {
          stack.push(value[key]);
        }
      }
    }
    return bytes;
  }
}

// A list mirrored to chrome.storage.local under `storageKey`, saved on every
// change.
class PersistentList {
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.items = [];
    this.ready = chrome.storage.local.get([storageKey]).then((result) => {
      this.items = result[storageKey] || [];
    });
  }

  includes(item) {
    return this.items.includes(item);
  }

  save() {
    return chrome.storage.local.set({[this.storageKey]: this.items}).then(() => {
      console.log("Stored list " + this.storageKey);
    });
  }
}
