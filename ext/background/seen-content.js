'use strict';

// Seen-content tracking for post images/videos, keyed by content MD5:
// - md5s.json: hashes of files the user already has
// - knownHashes: file URL -> MD5 for content seen on earlier page loads
// - filteredHashes: the content filter, from storage plus filteredMD5s.json
//
// The content filter has a version number, increased on every change, so the
// popup can tell whether the list changed after it loaded it. Each
// replacement from the popup first saves the previous list as a backup.
class HashesCache {
  static MAX_FILTER_BACKUPS = 5;

  constructor() {
    this.knownHashes = new PersistentMap('knownHashesMap', 400000);
    this.md5sList = Resources.loadJSON('md5s.json', []);
    this.filteredHashes = [];
    this.filterVersion = 0;
    this.filterBackups = new PersistentList('filteredHashesBackups');

    const filteredLoaded = Promise.all([
      chrome.storage.local.get(['filteredHashes', 'filteredHashesVersion']),
      Resources.loadJSON('filteredMD5s.json', []),
    ]).then(([stored, fileHashes]) => {
      this.filteredHashes = stored.filteredHashes || [];
      this.filterVersion = stored.filteredHashesVersion || 0;
      for (const md5 of fileHashes) {
        if (!this.isFiltered(md5)) {
          this.filteredHashes.push(md5);
        }
      }
    });

    this.ready = Promise.all([this.knownHashes.ready, this.filterBackups.ready, filteredLoaded]);
  }

  isFiltered(md5) {
    return this.filteredHashes.includes(md5);
  }

  saveFilter() {
    return chrome.storage.local.set({
      filteredHashes: this.filteredHashes,
      filteredHashesVersion: this.filterVersion,
    }).then(() => {
      console.log("Stored filtered hashes list");
    });
  }

  // {data, version, backups}, backups newest first as {savedAt, hashes}.
  async getContentFilter() {
    await this.ready;
    return {
      data: this.filteredHashes,
      version: this.filterVersion,
      backups: this.filterBackups.items,
    };
  }

  // Adds hashes to the content filter.
  async filterHashes(md5s) {
    await this.ready;
    let added = false;
    for (const hash of md5s) {
      if (hash && !this.isFiltered(hash)) {
        console.log('Filtering content md5: ' + hash);
        this.filteredHashes.push(hash);
        added = true;
      }
    }
    if (added) {
      this.filterVersion++;
      await this.saveFilter();
    }
  }

  // Replaces the content filter with `hashes`, if it is still at
  // `baseVersion`. Otherwise changes nothing and returns the current filter
  // with `conflict: true`.
  async replaceContentFilter(hashes, baseVersion) {
    await this.ready;
    if (!Array.isArray(hashes) || !hashes.every(hash => Util.isEncodedMD5(hash))) {
      throw new Error('Content filter entries must be base64 MD5 hashes.');
    }
    if (baseVersion !== this.filterVersion) {
      return {conflict: true, ...(await this.getContentFilter())};
    }

    this.filterBackups.items.unshift({savedAt: Date.now(), hashes: this.filteredHashes});
    this.filterBackups.items.splice(HashesCache.MAX_FILTER_BACKUPS);
    await this.filterBackups.save();

    this.filteredHashes = [...new Set(hashes)];
    this.filterVersion++;
    await this.saveFilter();
    return this.getContentFilter();
  }

  async testIsSeenHash(url, md5) {
    await this.ready;
    this.knownHashes.trim();

    let isSeenFromPriorLoad;
    if (this.knownHashes.has(url)) {
      isSeenFromPriorLoad = true;
    } else {
      isSeenFromPriorLoad = this.knownHashes.values().includes(md5);
      this.knownHashes.set(url, md5);
    }

    if (this.isFiltered(md5)) {
      return SeenType.FILTERED;
    }

    const md5sList = await this.md5sList;
    if (md5sList.indexOf(md5) > -1) {
      console.log(md5 + " was found in existing MD5s list.");
      return SeenType.STORED;
    }
    if (isSeenFromPriorLoad) {
      return SeenType.SESSION;
    }
    console.log(md5 + " was not found.");
    return SeenType.UNSEEN;
  }
}

const hashesCache = new HashesCache();
