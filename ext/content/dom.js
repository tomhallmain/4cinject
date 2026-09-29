'use strict';

// Selectors and accessors for 4chan's page markup.
const Dom = {
  getThreadFromElement(el) {
    return el?.closest('.thread');
  },

  getPostFromElement(el) {
    return el?.closest('.post');
  },

  postContainer(post) {
    return post?.closest('.postContainer');
  },

  basePost(post) {
    return Dom.postContainer(post)?.querySelector('.post');
  },

  getPostId(post) {
    return post?.id.slice(1);
  },

  getPostMessage(post) {
    return post.querySelector('.postMessage');
  },

  getThumb(video) {
    return video.previousSibling;
  },

  getThumbImg(thumb) {
    return thumb?.querySelector('img');
  },

  thumbHidden(thumb) {
    if (thumb && thumb.style.display === 'none') {
      return true;
    }
    return Dom.getThumbImg(thumb)?.style.display === 'none';
  },

  isWebmThumbImg(thumbImg) {
    return thumbImg ? /.(webm|mp4)$/.test(thumbImg.parentElement.href) : false;
  },

  getCloseLink(video) {
    return [].slice.call(video.parentElement.querySelectorAll('a'))
             .filter(link => link.textContent == "Close")[0];
  },

  getQuoteLinks(post) {
    return [].slice.call(Dom.getPostMessage(post)?.querySelectorAll('.quotelink'))
      .map(tag => parseInt(tag.hash?.slice(2)));
  },

  getBacklinks(post) {
    const backlinkElement = post.querySelector('.backlink');
    if (!backlinkElement) return [];
    return [].slice.call(backlinkElement.querySelectorAll('.quotelink'))
      .map(tag => parseInt(tag.hash.slice(2)));
  },

  hasAudio(video) {
    return video.mozHasAudio ||
      Boolean(video.webkitAudioDecodedByteCount) ||
      Boolean(video.audioTracks && video.audioTracks.length);
  },

  getElementByDataMD5(dataMD5) {
    return document.querySelector('[data-md5="' + dataMD5 + '"]');
  },

  getPosterId(post) {
    return post.querySelector("[class='hand']")?.textContent;
  },

  getFlag(post) {
    const nameBlock = post.querySelector("[class=nameBlock]");
    if (!nameBlock) return;
    const flag = nameBlock.querySelector("[class*='flag']")?.title;
    if (flag) return flag;
    return nameBlock.querySelector("[class*='bfl']")?.title;
  },

  insertAfter(referenceNode, newNode) {
    referenceNode?.parentNode?.insertBefore(newNode, referenceNode.nextSibling);
  },

  // Adds a report element below the top navigation links.
  attachToHeader(element) {
    Dom.insertAfter(document.querySelector('.navLinks.desktop'), element);
  },

  clearAds() {
    [].slice.call(document.querySelectorAll('div[class^=ad]'))
      .forEach(el => el.innerHTML = '');
  },

  isAdContent(node) {
    return /^ad[a-z]-/.test(node?.parentElement?.className);
  },

  isFullscreen() {
    return document.fullscreen;
  },

  // Resolves once `selector` matches, or after `timeoutMs` regardless.
  waitFor(selector, timeoutMs) {
    if (document.querySelector(selector)) return Promise.resolve();
    return new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          clearTimeout(timer);
          resolve();
        }
      });
      const timer = setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeoutMs);
      observer.observe(document.documentElement, {childList: true, subtree: true});
    });
  },
};
