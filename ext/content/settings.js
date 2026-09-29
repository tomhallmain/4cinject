'use strict';

// Settings live in the page's localStorage, so each site origin has its own.
// Values are strings; toggles hold "true"/"false".
const Settings = {
  DEFAULTS: Object.freeze({
    autoExpand: 'false',
    fullscreen: 'false',
    subthreads: 'true',
    catalogFilter: 'true',
    testHash: 'true',
    postDiffHighlight: 'true',
  }),
  DEFAULT_VOLUME: 0.5,

  get(key) {
    return window.localStorage[key];
  },

  set(key, value) {
    window.localStorage[key] = value;
  },

  isOn(key) {
    const value = Settings.get(key);
    return value !== "false" && value !== undefined && value !== null;
  },

  toggle(key) {
    const on = !Settings.isOn(key);
    Settings.set(key, on);
    return on;
  },

  applyDefaults() {
    for (const [key, value] of Object.entries(Settings.DEFAULTS)) {
      if (Settings.get(key) === undefined) {
        Settings.set(key, value);
      }
    }
    if (!Settings.get('volume')) {
      Settings.set('volume', Settings.DEFAULT_VOLUME);
    }
  },

  volume() {
    return Number(Settings.get('volume'));
  },

  // Thread filters: a JSON array of regex sources under `threadFilter`. An
  // older value holding one bare regex is read as a one-element list.
  threadFilters() {
    const raw = Settings.get('threadFilter');
    if (raw === undefined || raw === null || raw === '') return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every(filter => typeof filter === 'string')) {
        return parsed.filter(filter => filter !== '');
      }
    } catch (e) {
      // not JSON: an older single-regex value
    }
    return [raw];
  },

  setThreadFilters(filters) {
    Settings.set('threadFilter', JSON.stringify(filters));
  },

  hasThreadFilters() {
    const raw = Settings.get('threadFilter');
    return raw !== undefined && raw !== null && raw !== '';
  },

  // Rewrites an older single-regex value in the list format.
  migrateThreadFilters() {
    if (!Settings.hasThreadFilters()) return;
    const filters = Settings.threadFilters();
    if (JSON.stringify(filters) !== Settings.get('threadFilter')) {
      Settings.setThreadFilters(filters);
    }
  },

  textTransforms() {
    return Settings.get('textTransforms') || '';
  },

  setTextTransforms(text) {
    Settings.set('textTransforms', text);
  },
};
