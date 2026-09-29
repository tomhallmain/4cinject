'use strict';

// Service worker entry point. Import failures are caught so the worker still
// registers and the error shows in its console.
try {
  importScripts(
    '../shared/actions.js',
    '../shared/util.js',
    '../vendor/spark-md5/spark-md5.min.js',
    'md5.js',
    'resources.js',
    'persistent-map.js',
    'seen-content.js',
    'catalog-threads.js',
    'known-ids.js',
    'router.js',
  );
} catch (e) {
  console.error(e);
}
