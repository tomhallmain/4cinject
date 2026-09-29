'use strict';

const CatalogPage = {
  // The catalog's thread elements are built by 4chan's page script.
  THREADS_WAIT_MS: 5000,

  async run() {
    await Dom.waitFor('.thread', CatalogPage.THREADS_WAIT_MS);
    const steps = [
      () => Settings.isOn('catalogFilter') && CatalogPage.filter(),
      () => TextTransforms.isEnabled() && CatalogPage.transformTeaserTexts(),
      () => Settings.isOn('testHash') && CatalogPage.testThreads(),
      () => Settings.isOn('postDiffHighlight') && CatalogPage.highlightNewThreads(),
    ];
    for (const step of steps) {
      try {
        step();
      } catch (e) {
        console.log(e.message);
      }
    }
  },

  // Makes 4chan's catalog sort by creation date. Returns true if the page is
  // reloading to apply it.
  ensureDateOrder() {
    const orderSetting = '"orderby":"date"';
    const catalogSettings = Settings.get('catalog-settings');
    if (catalogSettings != undefined && catalogSettings.includes(orderSetting)) {
      return false;
    }
    Settings.set('catalog-settings', '{"extended":true,"large":false,' + orderSetting + '}');
    if (Page.isCatalog) {
      window.location.reload();
      return true;
    }
    return false;
  },

  compiledThreadFilters() {
    const patterns = [];
    for (const filter of Settings.threadFilters()) {
      try {
        patterns.push(new RegExp(filter));
      } catch (e) {
        console.warn("Skipping invalid thread filter: " + filter);
      }
    }
    return patterns;
  },

  // Removes threads matching a thread filter, and colors the rest by kind.
  filter() {
    const patterns = CatalogPage.compiledThreadFilters();
    for (const t of Page.getThreads()) {
      const text = t.element.textContent;
      if (patterns.some(pattern => pattern.test(text))) {
        console.log("Removing thread " + text);
        t.element.remove();
      } else if (t.hasChallenge()) {
        t.setBackgroundColor(Marks.COLORS.catalogChallenge);
      } else if (t.hasImageContent()) {
        t.setBackgroundColor(Marks.COLORS.catalogImages);
      } else if (t.hasExternalLink()) {
        t.setBackgroundColor(Marks.COLORS.catalogExternalLink);
      }
    }
  },

  transformTeaserTexts() {
    const transforms = TextTransforms.current();
    for (const t of Page.getThreads()) {
      try {
        TextTransforms.applyToElement(transforms, t.getTeaser());
      } catch (e) {
        console.log("Could not get message or make replacements for thread teaser: ");
        console.log(e);
      }
    }
  },

  // Outlines threads that were not in this catalog at its previous load. The
  // baseline includes threads removed by the filters, since Page.getThreads()
  // was collected before they were removed.
  async highlightNewThreads() {
    const threadIds = Page.getThreads().map(t => t.id).filter(id => id);
    const response = await Messaging.request(Actions.FIND_NEW_THREAD_IDS, {
      url: Page.initialLink,
      threadIds,
    });
    for (const threadId of response?.newThreadIds || []) {
      const threadObj = Page.getThread(threadId);
      if (threadObj?.element) Marks.markNewThread(threadObj.element);
    }
  },

  testThreads() {
    for (const t of Page.getThreads()) {
      const thumb = Dom.getThumbImg(t.element);
      if (!t.id || !thumb) continue;
      const threadId = t.id;
      Messaging.request(Actions.TEST_THREAD, {
        url: thumb.src,
        threadId,
        teaser: t.getTeaserText(),
      }).then(response => {
        if (response) CatalogPage.applyThreadStatus(threadId, response.status);
      });
    }
  },

  applyThreadStatus(threadId, status) {
    const threadObj = Page.getThread(threadId);
    if (!threadObj?.element) {
      console.log("No catalog thread " + threadId);
      return;
    }
    switch (status) {
      case ThreadStatus.NORMAL:
        CatalogPage.addFilterThreadLink(threadObj);
        break;
      case ThreadStatus.BOT:
        Marks.markBotThread(threadObj.element);
        break;
      case ThreadStatus.FILTERED:
        threadObj.element.remove();
        break;
    }
  },

  addFilterThreadLink(threadObj) {
    if (threadObj.element.querySelector('.cij-filter-thread-link')) return;

    const link = document.createElement('a');
    link.textContent = " Filter";
    link.className = 'cij-filter-thread-link';
    link.onclick = () => CatalogPage.filterThread(threadObj);
    threadObj.element.appendChild(link);
  },

  // Filters the thread's image hash and teaser text in the worker, and
  // removes the thread.
  filterThread(threadObj) {
    const thumb = Dom.getThumbImg(threadObj.element);
    Messaging.request(Actions.FILTER_THREAD, {
      url: thumb?.src,
      teaser: threadObj.getTeaserText(),
    });
    threadObj.element.remove();
  },
};
