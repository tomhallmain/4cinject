'use strict';

// Remembers the IDs present at the last load of each page, to report which
// IDs are new at the next load.
class KnownIdsCache {
  constructor(storageKey, maxSize) {
    this.knownIds = new PersistentMap(storageKey, maxSize);
  }

  // Returns the IDs not present at the previous load of `pageKey`, and saves
  // `ids` as the new baseline. The first load of a page only saves the
  // baseline and returns [].
  async findNewIds(pageKey, ids) {
    await this.knownIds.ready;
    this.knownIds.trim();

    const knownIds = this.knownIds.get(pageKey);
    this.knownIds.set(pageKey, ids);
    if (!knownIds || knownIds.length === 0) {
      return [];
    }
    return ids.filter(id => !knownIds.includes(id));
  }
}

const threadPostIdsCache = new KnownIdsCache('threadKnownPostIdsMap', 300000);
