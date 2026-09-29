'use strict';

// Runs in the page's own JS context ("world": "MAIN" in the manifest), the
// only place 4chan's page-script functions can be called. Everything else in
// the extension runs in the content-script context and reaches this file
// through DOM events.

(() => {
  // content/media.js dispatches this on the thumbnail or expanded image.
  document.addEventListener('cij:toggle-expansion', (event) => {
    if (typeof ImageExpansion === 'undefined') {
      console.log("4chan ImageExpansion is not available.");
      return;
    }
    ImageExpansion.toggle(event.target);
  });

  try {
    if (activeStyleSheet !== 'Tomorrow') {
      setActiveStyleSheet('Tomorrow');
    }
  } catch (e) {
    console.log("Failed to check or set active style sheet.");
  }
})();
