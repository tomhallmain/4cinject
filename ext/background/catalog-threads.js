'use strict';

// Catalog thread checks, based on each thread's thumbnail image:
// - knownHashesThreads: thumbnail URL -> MD5
// - hashThreadIds: MD5 -> ID of the first thread seen with that image
// - botThreadHashes: MD5s found on more than one thread (this session only)
// - teaserFilters: lowercase teaser texts filtered from the catalog
class HashesThreadsCache {
  constructor(hashesCache) {
    this.hashesCache = hashesCache;
    this.knownHashesThreads = new PersistentMap('knownHashesThreadsMap', 300000);
    this.hashThreadIds = new PersistentMap('hashThreadIdsMap', 300000);
    this.botThreadHashes = [];
    this.teaserFilters = new PersistentList('teaserFilters');
    this.ready = Promise.all([
      this.knownHashesThreads.ready,
      this.hashThreadIds.ready,
      this.teaserFilters.ready,
    ]);
  }

  isBotThread(md5) {
    return this.botThreadHashes.indexOf(md5) > -1;
  }

  // A single-character filter only matches a teaser that is exactly that
  // character; longer filters match anywhere in the teaser.
  isFilteredTeaser(teaser) {
    if (!teaser) return false;
    const teaserLower = teaser.toLowerCase();

    for (const test of this.teaserFilters.items) {
      if (!test) continue;
      const testLower = test.toLowerCase();
      const matches = test.length == 1 ? teaserLower === testLower : teaserLower.includes(testLower);
      if (matches) {
        console.log("Filtering by teaser: " + teaserLower);
        console.log("Matching teaser test: " + test);
        return true;
      }
    }

    console.log("Teaser did not match any filters: " + teaserLower);
    return false;
  }

  async filterThread(url, teaser) {
    await this.ready;
    const md5 = this.knownHashesThreads.has(url)
        ? this.knownHashesThreads.get(url)
        : await Md5.encodedMD5(url);
    if (md5) {
      await this.hashesCache.filterHashes([md5]);
    }
    if (teaser) {
      this.teaserFilters.items.push(teaser);
      await this.teaserFilters.save();
    }
  }

  async testThread(url, threadId, teaser) {
    await Promise.all([this.ready, this.hashesCache.ready]);
    this.knownHashesThreads.trim();
    this.hashThreadIds.trim();

    let md5;
    let isSeenFromPriorLoad;
    if (this.knownHashesThreads.has(url)) {
      md5 = this.knownHashesThreads.get(url);
      isSeenFromPriorLoad = true;
    } else {
      md5 = await Md5.encodedMD5(url);
      isSeenFromPriorLoad = this.knownHashesThreads.values().includes(md5);
      this.knownHashesThreads.set(url, md5);
    }

    const isFilteredTeaser = this.isFilteredTeaser(teaser);

    if (!isSeenFromPriorLoad || isFilteredTeaser) {
      this.hashThreadIds.set(md5, threadId);
      if (isFilteredTeaser || this.hashesCache.isFiltered(md5)) {
        return ThreadStatus.FILTERED;
      }
      return ThreadStatus.NORMAL;
    }
    if (this.isBotThread(md5)) {
      return ThreadStatus.BOT;
    }
    if (this.hashThreadIds.has(md5)) {
      if (this.hashThreadIds.get(md5) === threadId) {
        return ThreadStatus.NORMAL;
      }
      this.botThreadHashes.push(md5);
      return ThreadStatus.BOT;
    }
    this.hashThreadIds.set(md5, threadId);
    return ThreadStatus.NORMAL;
  }
}

const hashesThreadsCache = new HashesThreadsCache(hashesCache);
