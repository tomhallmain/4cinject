'use strict';

const Main = {
  // Fills unset thread filters and text transforms from the optional files in
  // ext/filters/ (see README).
  async seedSettingsFromFiles() {
    const needsThreadFilters = !Settings.hasThreadFilters();
    const needsTextTransforms = !Settings.textTransforms();
    if (!needsThreadFilters && !needsTextTransforms) return;

    const defaults = await Messaging.request(Actions.GET_FILE_DEFAULTS);
    if (needsThreadFilters && defaults?.threadFilters) {
      Settings.setThreadFilters(defaults.threadFilters);
      console.log('Thread filter is set.');
    }
    if (needsTextTransforms && defaults?.textTransforms) {
      Settings.setTextTransforms(defaults.textTransforms);
      console.log('Text transforms are set.');
    }
  },

  async start() {
    Settings.applyDefaults();
    Settings.migrateThreadFilters();
    Page.init();

    if (Page.isBoardBase || Page.isCatalog) {
      if (CatalogPage.ensureDateOrder()) return;
      if (Page.isBoardBase) {
        window.location.replace(Page.initialLink + 'catalog');
        return;
      }
    }

    Messaging.listen(Commands);
    Dom.clearAds();
    Media.observe();
    Navigation.install();

    await Main.seedSettingsFromFiles();

    if (Page.isCatalog) {
      await CatalogPage.run();
    } else if (Page.isThread) {
      ThreadPage.run();
    }
  },
};

Main.start();
