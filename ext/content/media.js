'use strict';

// Expanding and closing post content, and expanded video handling.
const Media = {
  // 4chan's ImageExpansion.toggle is a page-script function, so the call is
  // made by page/bridge.js, which runs in the page's own JS context. DOM
  // events cross between the two contexts; the event target is the element
  // to toggle.
  toggleExpansion(img) {
    img.dispatchEvent(new CustomEvent('cij:toggle-expansion', {bubbles: true}));
  },

  // Expands the given (default: all visible) image thumbnails, one every
  // 200 ms, skipping videos and seen content.
  expandImages(thumbImgs) {
    thumbImgs = (thumbImgs || Page.thread.getThumbImgs())
      .filter(img => img && !Dom.isWebmThumbImg(img))
      .filter(img => !Marks.isSeen(Dom.getPostFromElement(img)));
    thumbImgs.forEach((img, i) => setTimeout(() => Media.toggleExpansion(img), i * 200));
  },

  // Expands the given thumbnails of any type, one every 100 ms.
  expandAll(thumbImgs) {
    thumbImgs = thumbImgs.filter(img => img);
    thumbImgs.forEach((img, i) => setTimeout(() => Media.toggleExpansion(img), i * 100));
    return thumbImgs.length;
  },

  closeVideo(video) {
    if (video?.tagName === "VIDEO") {
      Page.thread.closedWebmThumbs.push(Dom.getThumb(video));
      Dom.getCloseLink(video).click();
    }
  },

  openVideo(videoThumb) {
    const thread = Page.thread;
    thread.closedWebmThumbs = Util.arrayRemove(thread.closedWebmThumbs, videoThumb);
    Media.expandAll(thread.getThumbImgs([videoThumb]));
  },

  webmThumbImgs() {
    return Page.thread.getThumbImgs(null, true).filter(img => Dom.isWebmThumbImg(img));
  },

  currentVideoIndex(currentVideo, webmThumbImgs) {
    if (!currentVideo) return -1;
    const currentThumbImg = Dom.getThumbImg(Dom.getThumb(currentVideo));
    return webmThumbImgs.indexOf(currentThumbImg);
  },

  openNextVideo(currentVideo) {
    const webmThumbImgs = Media.webmThumbImgs();
    const nextThumbImg = webmThumbImgs[Media.currentVideoIndex(currentVideo, webmThumbImgs) + 1];
    Media.expandAll([nextThumbImg]);
    Dom.getPostFromElement(nextThumbImg)?.scrollIntoView();
  },

  openPreviousVideo(currentVideo) {
    const webmThumbImgs = Media.webmThumbImgs();
    const currentIndex = Media.currentVideoIndex(currentVideo, webmThumbImgs);
    const previousThumbImg = webmThumbImgs[currentIndex < 0 ? 0 : currentIndex - 1];
    Media.expandAll([previousThumbImg]);
    Dom.getPostFromElement(previousThumbImg)?.scrollIntoView();
  },

  setVolume(volume) {
    Settings.set('volume', volume);
    Page.thread?.getAudioWebms().forEach(webm => webm.volume = volume);
  },

  // Unmutes each video as it is expanded, applies the volume setting and
  // tracks it as opened; also clears ad content as it is inserted.
  observe() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(record => {
        const thread = Page.thread;
        const added = record.addedNodes[0];
        if (added?.className == 'expandedWebm') {
          added.muted = false;
          added.volume = Settings.volume();
          thread?.openedWebms.push(added);
        } else if (Dom.isAdContent(added)) {
          added.innerHTML = '';
        }

        const removed = record.removedNodes[0];
        if (removed?.className == 'expandedWebm') {
          thread?.removeOpenedWebM(removed);
        }
      });
    });
    observer.observe(document.body, {childList: true, subtree: true});
  },

  exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  },
};
