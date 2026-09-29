'use strict';

// Handlers for commands sent from the popup to the active tab.
const Commands = {
  [Actions.EXPAND]: () => {
    Settings.set('autoExpand', 'true');
    window.location.reload();
  },

  [Actions.CLOSE]: () => {
    Settings.set('autoExpand', 'false');
    window.location.reload();
  },

  [Actions.AUTO_EXPAND]: () => {
    Settings.toggle('autoExpand');
    if (Page.isThread) window.location.reload();
  },

  [Actions.DIGITS]: () => {
    if (Page.isThread) console.log(Reports.numbersGraph());
  },

  [Actions.MAX_DIGITS]: () => {
    if (Page.isThread) console.log(Reports.maxDigits());
  },

  [Actions.THREAD_GRAPH]: () => {
    if (Page.isThread) console.log(Reports.threadGraph());
  },

  [Actions.SUBTHREADS]: () => {
    const on = Settings.toggle('subthreads');
    if (!Page.isThread) return;
    if (on) {
      ThreadPage.subthreads();
    } else {
      window.location.reload();
    }
  },

  [Actions.CONTENT_EXTRACT]: () => {
    if (Page.isThread) return ThreadPage.contentExtract();
  },

  [Actions.TOGGLE_TEST_HASH]: () => {
    const on = Settings.toggle('testHash');
    if (Page.isThread && on) ThreadPage.verifyContentFreshness();
  },

  [Actions.FULL_SCREEN]: () => {
    Settings.toggle('fullscreen');
  },

  [Actions.CATALOG_FILTER]: () => {
    const on = Settings.toggle('catalogFilter');
    if (!Page.isCatalog) return;
    if (on) {
      CatalogPage.filter();
    } else {
      window.location.reload();
    }
  },

  [Actions.HIGHLIGHT_NEW]: () => {
    Settings.toggle('postDiffHighlight');
  },

  // `volume`: 1-100 from the popup slider.
  [Actions.SET_VOLUME]: (request) => {
    Media.setVolume((request.volume || 50) / 100);
  },

  // `text`: one regex per line, kept as typed. Blank lines are dropped.
  [Actions.SET_THREAD_FILTER]: (request) => {
    const filters = (request.text || '').split('\n')
        .filter(line => line.trim() !== '');
    Settings.setThreadFilters(filters);
    if (Page.isCatalog && filters.length > 0) window.location.reload();
  },

  [Actions.SET_TEXT_TRANSFORMS]: (request) => {
    const text = request.text || '';
    Settings.setTextTransforms(text);
    if (Page.isThread && text !== '') window.location.reload();
  },

  [Actions.GET_VOLUME]: () => ({volume: Settings.volume()}),

  [Actions.GET_THREAD_FILTER]: () => ({text: Settings.threadFilters().join('\n')}),

  [Actions.GET_TEXT_TRANSFORMS]: () => ({text: Settings.textTransforms()}),
};
