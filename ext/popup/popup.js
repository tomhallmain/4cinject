'use strict';

// Page commands go to the content script of the active tab; the content
// filter belongs to the worker.

function select(selector) {
  return document.querySelector(selector);
}

function setStatus(element, text, isError) {
  element.textContent = text;
  element.classList.toggle('error', Boolean(isError));
}

async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab) return null;
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (e) {
    // No content script in this tab (not a board page).
    console.log(e);
    return null;
  }
}

async function sendToWorker(message) {
  try {
    const response = await chrome.runtime.sendMessage(message);
    if (response?.error) {
      console.error(response.error);
      return null;
    }
    return response;
  } catch (e) {
    console.error(e);
    return null;
  }
}

function mapButton(btn, action) {
  btn.addEventListener('click', function() {
    console.log('button pressed for ' + action);
    sendToActiveTab({action});
  });
}

function saveDataToDownloadedFile(data, filename, type) {
  const file = new Blob([data], {type: type});
  const a = document.createElement("a");
  const url = URL.createObjectURL(file);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}


// Page settings

async function loadPageSettings() {
  const volume = await sendToActiveTab({action: Actions.GET_VOLUME});
  if (volume?.volume !== undefined) {
    select('#volume').value = volume.volume * 100;
  }
  const threadFilter = await sendToActiveTab({action: Actions.GET_THREAD_FILTER});
  if (threadFilter?.text) {
    select('.threadFilter').value = threadFilter.text;
  }
  const textTransforms = await sendToActiveTab({action: Actions.GET_TEXT_TRANSFORMS});
  if (textTransforms?.text) {
    select('.textTransforms').value = textTransforms.text;
  }
}

// Sends the thread filters if every non-blank line is a valid regex.
function saveThreadFilter(text) {
  const status = select('#threadFilterStatus');
  const invalid = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      new RegExp(line);
    } catch (e) {
      invalid.push(line);
    }
  }
  if (invalid.length > 0) {
    setStatus(status, 'Not saved. Invalid regex:\n' + invalid.join('\n'), true);
    return;
  }
  setStatus(status, '');
  sendToActiveTab({action: Actions.SET_THREAD_FILTER, text});
}


// Content filter editor
//
// The textarea edits the whole stored list. Saving shows what would be added
// and removed and needs a second confirmation; saving an empty list or a
// large removal also needs the number of removed entries typed in. The
// worker rejects the save if the list changed after the popup loaded it.

const ContentFilterEditor = {
  LARGE_REMOVAL_COUNT: 10,
  LARGE_REMOVAL_FRACTION: 0.25,

  stored: [],
  version: null,
  backups: [],
  backupIndex: -1,
  pending: null,
  requiredConfirmation: null,

  el(id) {
    return select('#' + id);
  },

  setStatus(text, isError) {
    setStatus(ContentFilterEditor.el('contentFilterStatus'), text, isError);
  },

  applyStored(response) {
    ContentFilterEditor.stored = response.data;
    ContentFilterEditor.version = response.version;
    ContentFilterEditor.backups = response.backups || [];
    ContentFilterEditor.backupIndex = -1;
    ContentFilterEditor.el('contentFilterRestore').disabled = ContentFilterEditor.backups.length === 0;
  },

  async load() {
    const textarea = select('.contentFilter');
    const response = await sendToWorker({action: Actions.GET_CONTENT_FILTER});
    if (!response || !Array.isArray(response.data)) {
      textarea.placeholder = '';
      ContentFilterEditor.setStatus('Could not load the content filter; editing is disabled.', true);
      return;
    }
    ContentFilterEditor.applyStored(response);
    textarea.value = ContentFilterEditor.stored.join('\n');
    textarea.placeholder = '';
    ContentFilterEditor.el('contentFilterSave').disabled = false;
  },

  // {hashes, invalid}: the non-blank lines, trimmed and without duplicates,
  // and the lines that are not base64 MD5 hashes.
  parse(text) {
    const hashes = [];
    const invalid = [];
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (line === '') continue;
      if (!Util.isEncodedMD5(line)) {
        invalid.push(line);
      } else if (!hashes.includes(line)) {
        hashes.push(line);
      }
    }
    return {hashes, invalid};
  },

  hideConfirm() {
    ContentFilterEditor.pending = null;
    ContentFilterEditor.requiredConfirmation = null;
    ContentFilterEditor.el('contentFilterConfirm').hidden = true;
  },

  onSave() {
    ContentFilterEditor.hideConfirm();
    const {hashes, invalid} = ContentFilterEditor.parse(select('.contentFilter').value);
    if (invalid.length > 0) {
      ContentFilterEditor.setStatus('Not saved. These lines are not base64 MD5 hashes:\n'
          + invalid.join('\n'), true);
      return;
    }

    const stored = ContentFilterEditor.stored;
    const added = hashes.filter(hash => !stored.includes(hash)).length;
    const removed = stored.filter(hash => !hashes.includes(hash)).length;
    if (added === 0 && removed === 0) {
      ContentFilterEditor.setStatus('No changes to save.');
      return;
    }

    const isLarge = hashes.length === 0
        || removed > ContentFilterEditor.LARGE_REMOVAL_COUNT
        || (stored.length > 0 && removed / stored.length > ContentFilterEditor.LARGE_REMOVAL_FRACTION);

    let summary = added + ' added, ' + removed + ' removed. The list will have '
        + hashes.length + ' entries.';
    if (hashes.length === 0) {
      summary = 'This empties the content filter: all ' + removed + ' entries will be removed.';
    } else if (isLarge) {
      summary += ' This removes a large part of the list.';
    }

    ContentFilterEditor.pending = hashes;
    ContentFilterEditor.el('contentFilterSummary').textContent = summary;
    ContentFilterEditor.el('contentFilterConfirm').classList.toggle('strong', isLarge);
    ContentFilterEditor.el('contentFilterTyped').hidden = !isLarge;
    ContentFilterEditor.el('contentFilterConfirmButton').disabled = isLarge;
    if (isLarge) {
      ContentFilterEditor.requiredConfirmation = String(removed);
      ContentFilterEditor.el('contentFilterTypedLabel').textContent =
          'Type ' + removed + ' (the number of entries removed) to enable Confirm: ';
      ContentFilterEditor.el('contentFilterTypedInput').value = '';
    }
    ContentFilterEditor.el('contentFilterConfirm').hidden = false;
    ContentFilterEditor.setStatus('');
  },

  onTypedConfirmation() {
    const typed = ContentFilterEditor.el('contentFilterTypedInput').value.trim();
    ContentFilterEditor.el('contentFilterConfirmButton').disabled =
        typed !== ContentFilterEditor.requiredConfirmation;
  },

  async onConfirm() {
    const hashes = ContentFilterEditor.pending;
    if (!hashes) return;
    ContentFilterEditor.hideConfirm();

    const response = await sendToWorker({
      action: Actions.REPLACE_CONTENT_FILTER,
      hashes,
      baseVersion: ContentFilterEditor.version,
    });
    if (!response) {
      ContentFilterEditor.setStatus('Save failed; the content filter was not changed.', true);
      return;
    }
    if (response.conflict) {
      // Keep the user's text; the next Save compares it with the new list.
      ContentFilterEditor.applyStored(response);
      ContentFilterEditor.setStatus('Not saved: the content filter changed after this popup loaded it '
          + '(for example a "Filter" click on a page). Your text is kept; press Save again to review '
          + 'the changes against the current list.', true);
      return;
    }

    ContentFilterEditor.applyStored(response);
    select('.contentFilter').value = ContentFilterEditor.stored.join('\n');
    ContentFilterEditor.setStatus('Saved. The content filter has ' + ContentFilterEditor.stored.length
        + ' entries; the previous version was kept as a backup.');
  },

  // Loads the next older backup into the textarea; nothing is stored until
  // it is saved and confirmed.
  onRestore() {
    const backups = ContentFilterEditor.backups;
    if (backups.length === 0) return;
    ContentFilterEditor.hideConfirm();
    ContentFilterEditor.backupIndex = (ContentFilterEditor.backupIndex + 1) % backups.length;
    const backup = backups[ContentFilterEditor.backupIndex];
    select('.contentFilter').value = backup.hashes.join('\n');
    ContentFilterEditor.setStatus('Loaded backup ' + (ContentFilterEditor.backupIndex + 1) + ' of '
        + backups.length + ' (saved ' + new Date(backup.savedAt).toLocaleString() + ', '
        + backup.hashes.length + ' entries) into the editor. Press Save to review and apply it.');
  },

  download() {
    const stored = ContentFilterEditor.stored;
    if (stored.length > 0) {
      const data = "[\n\t\"" + stored.join("\",\n\t\"") + "\"\n]";
      saveDataToDownloadedFile(data, "filteredMD5s.json", "application/json");
    }
  },

  install() {
    ContentFilterEditor.el('contentFilterSave').addEventListener('click', ContentFilterEditor.onSave);
    ContentFilterEditor.el('contentFilterRestore').addEventListener('click', ContentFilterEditor.onRestore);
    ContentFilterEditor.el('contentFilterConfirmButton').addEventListener('click', ContentFilterEditor.onConfirm);
    ContentFilterEditor.el('contentFilterCancel').addEventListener('click', () => {
      ContentFilterEditor.hideConfirm();
      ContentFilterEditor.setStatus('Not saved.');
    });
    ContentFilterEditor.el('contentFilterTypedInput').addEventListener('input', ContentFilterEditor.onTypedConfirmation);
    // A pending confirmation is for the text as it was when Save was pressed.
    select('.contentFilter').addEventListener('input', ContentFilterEditor.hideConfirm);
    select('.downloadFilteredHashes').addEventListener('click', ContentFilterEditor.download);
    ContentFilterEditor.load();
  },
};


document.addEventListener('DOMContentLoaded', function() {
  mapButton(select('.autoExpand'),     Actions.AUTO_EXPAND);
  mapButton(select('.expand'),         Actions.EXPAND);
  mapButton(select('.close'),          Actions.CLOSE);
  mapButton(select('.digits'),         Actions.DIGITS);
  mapButton(select('.maxDigits'),      Actions.MAX_DIGITS);
  mapButton(select('.threadGraph'),    Actions.THREAD_GRAPH);
  mapButton(select('.subthreads'),     Actions.SUBTHREADS);
  mapButton(select('.contentExtract'), Actions.CONTENT_EXTRACT);
  mapButton(select('.toggleTestHash'), Actions.TOGGLE_TEST_HASH);
  mapButton(select('.fullScreen'),     Actions.FULL_SCREEN);
  mapButton(select('.highlightNew'),   Actions.HIGHLIGHT_NEW);
  mapButton(select('.catalogFilter'),  Actions.CATALOG_FILTER);

  select('.threadFilter').addEventListener('change', function(e) {
    saveThreadFilter(e.target.value);
  });
  select('.textTransforms').addEventListener('change', function(e) {
    sendToActiveTab({action: Actions.SET_TEXT_TRANSFORMS, text: e.target.value});
  });
  select('#volume').addEventListener('change', function(e) {
    sendToActiveTab({action: Actions.SET_VOLUME, volume: Number(e.target.value)});
  });

  ContentFilterEditor.install();
  loadPageSettings();
});
