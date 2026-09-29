'use strict';

// Keyboard navigation between post content on thread pages.
const Navigation = {
  // Scrolls to `post`; with a thumb, also expands it if autoExpand is on and
  // enters fullscreen if that setting is on.
  engagePost(post, thumb) {
    if (!post) return false;
    const thread = Page.thread;
    if (thumb) {
      const {type, content, expanded} = thread.contentOf(post, thumb);
      let engageContent = content;
      if (!expanded && Settings.isOn('autoExpand')) {
        if (type == 'webm') {
          Media.openVideo(thumb);
          engageContent = thread.getVids(post, true);
        } else {
          Media.toggleExpansion(content);
          engageContent = Util.first(thread.getExpandedImgs([thumb]));
        }
      }
      if (Settings.isOn('fullscreen')) {
        engageContent.requestFullscreen();
      }
    }
    post.scrollIntoView();
    return true;
  },

  previousNewPost() {
    const thread = Page.thread;
    const newPostIds = thread.getNewPostIds();
    if (newPostIds.length == 0) return;
    if ((thread.currentNewPost - 1) >= 0) {
      thread.currentNewPost--;
      const post = thread.getPostById(newPostIds[thread.currentNewPost]);
      Navigation.engagePost(post, post?.querySelector('.fileThumb'));
    }
  },

  nextNewPost() {
    const thread = Page.thread;
    const newPostIds = thread.getNewPostIds();
    if (newPostIds.length == 0) return;
    if ((thread.currentNewPost + 1) < newPostIds.length) {
      thread.currentNewPost++;
      const post = thread.getPostById(newPostIds[thread.currentNewPost]);
      Navigation.engagePost(post, post?.querySelector('.fileThumb'));
    }
  },

  // Moves to the next/previous content that is not marked as seen. At the
  // end of the list, leaves fullscreen if the fullscreen setting is on.
  stepContent(step) {
    const thread = Page.thread;
    const thumbs = thread.getThumbs();
    const inRange = (index) => index >= 0 && index < thumbs.length;

    if (!inRange(thread.currentContent + step)) {
      if (Settings.isOn('fullscreen') && Dom.isFullscreen()) Media.exitFullscreen();
      return;
    }

    thread.currentContent += step;
    let post = Dom.getPostFromElement(thumbs[thread.currentContent]);
    while (post && Marks.isSeen(post)) {
      if (!inRange(thread.currentContent + step)) return;
      thread.currentContent += step;
      post = Dom.getPostFromElement(thumbs[thread.currentContent]);
    }

    Navigation.engagePost(post, thumbs[thread.currentContent]);
  },

  // Moves to the next/previous base post (one not nested by subthreads) that
  // has content.
  jump(forward) {
    const thread = Page.thread;
    let base = Dom.basePost(thread.currentPost());
    let jumpPost = null;
    let thumb = null;

    while (!jumpPost) {
      const jumpBase = forward ? thread.nextPost(base) : thread.previousPost(base);
      if (!jumpBase) break;
      thumb = Util.first(thread.getThumbs(Dom.postContainer(jumpBase)));
      if (thumb) {
        jumpPost = Dom.getPostFromElement(thumb);
        thread.currentContent = thread.getThumbs().indexOf(thumb);
      } else {
        base = jumpBase;
      }
    }

    if (jumpPost) Navigation.engagePost(jumpPost, thumb);
  },

  isEditable(target) {
    return target instanceof HTMLElement
        && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  },

  // Returns true if the key was handled.
  handleKey(event) {
    const thread = Page.thread;
    const isGif = Page.board.isGif;
    const currentVideo = Util.last(thread.openedWebms);

    switch (event.key) {
      case " ":
        if (event.shiftKey) {
          Navigation.nextNewPost();
          return true;
        }
        if (event.altKey) {
          Navigation.previousNewPost();
          return true;
        }
        return false;

      case "ArrowLeft":
        if (event.shiftKey) {
          if (isGif) {
            Media.closeVideo(currentVideo);
          } else {
            Media.exitFullscreen();
          }
        } else if (event.altKey) {
          Navigation.jump(false);
        } else if (isGif) {
          Media.openPreviousVideo(currentVideo);
          if (currentVideo) Media.closeVideo(currentVideo);
        } else {
          Navigation.stepContent(-1);
        }
        return true;

      case "ArrowRight":
        if (event.shiftKey) {
          if (isGif) {
            currentVideo?.requestFullscreen();
          } else {
            thread.contentOf(thread.getPostInSeries())?.content?.requestFullscreen();
          }
        } else if (event.altKey) {
          Navigation.jump(true);
        } else if (isGif) {
          Media.openNextVideo(currentVideo);
          if (currentVideo) Media.closeVideo(currentVideo);
        } else {
          Navigation.stepContent(1);
        }
        return true;

      default:
        return false;
    }
  },

  install() {
    window.addEventListener("keydown", (event) => {
      if (event.defaultPrevented || !Page.thread) return;
      if (Navigation.isEditable(event.target)) return;
      if (Navigation.handleKey(event)) {
        // Cancel the default action to avoid it being handled twice
        event.preventDefault();
      }
    }, true);
  },
};
