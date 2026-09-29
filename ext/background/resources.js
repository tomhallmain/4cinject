'use strict';

// Optional user-supplied files packaged with the extension (see README).
// A missing or invalid file resolves to `fallback` with one warning.
const Resources = {
  async loadJSON(path, fallback) {
    try {
      const response = await fetch(chrome.runtime.getURL(path));
      return await response.json();
    } catch (e) {
      console.warn('Could not load ' + path + ', using default.', e);
      return fallback;
    }
  },

  async loadText(path, fallback) {
    try {
      const response = await fetch(chrome.runtime.getURL(path));
      return await response.text();
    } catch (e) {
      console.warn('Could not load ' + path + ', using default.', e);
      return fallback;
    }
  },

  // Defaults for page settings that are unset: a JSON array of thread filter
  // regexes, and text transforms in `regex==replacement` lines.
  fileDefaults: null,

  getFileDefaults() {
    if (!Resources.fileDefaults) {
      Resources.fileDefaults = Promise.all([
        Resources.loadJSON('filters/threadFilters.json', null),
        Resources.loadText('filters/transforms.txt', null),
      ]).then(([threadFilters, textTransforms]) => {
        const isStringList = Array.isArray(threadFilters)
            && threadFilters.every(filter => typeof filter === 'string');
        if (threadFilters !== null && !isStringList) {
          console.warn('filters/threadFilters.json must be a JSON array of strings; ignoring it.');
        }
        return {
          threadFilters: isStringList ? threadFilters : null,
          textTransforms: textTransforms,
        };
      });
    }
    return Resources.fileDefaults;
  },
};
