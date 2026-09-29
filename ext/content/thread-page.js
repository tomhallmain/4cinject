'use strict';

const ThreadPage = {
  AUTO_EXPAND_DELAY_MS: 1000,

  run() {
    const thread = Page.thread;
    const steps = [
      () => Reports.reportDigits(),
      () => Settings.isOn('subthreads') && ThreadPage.subthreads(),
      () => Settings.isOn('postDiffHighlight') && ThreadPage.highlightNewPosts(),
      () => TextTransforms.isEnabled() && ThreadPage.transformPostText(),
      () => {
        if (Settings.isOn('testHash')) {
          ThreadPage.verifyContentFreshness();
          Reports.setContentStats();
        }
      },
      () => {
        if (Page.board.name === "pol") {
          Reports.reportFlags();
          Reports.reportNPosts();
        } else if (Page.board.name === "biz") {
          Reports.reportOpPosts();
          Reports.reportNPosts();
        }
      },
    ];

    // A thread page that no longer exists has no thread element.
    if (!thread.element) return;

    for (const step of steps) {
      try {
        step();
      } catch (e) {
        console.log(e.message);
      }
    }

    if (Settings.isOn('autoExpand')) {
      setTimeout(() => Media.expandImages(), ThreadPage.AUTO_EXPAND_DELAY_MS);
    }
  },

  // Hash testing: each piece of content is checked against md5s.json, the
  // content seen on earlier loads and the content filter.

  verifyContentFreshness() {
    for (const thumb of Page.thread.getThumbs()) {
      const md5 = thumb.querySelector("img")?.getAttribute('data-md5');
      if (!md5) continue;
      Messaging.request(Actions.TEST_MD5, {url: thumb.href, md5})
        .then(response => {
          if (response) ThreadPage.applySeenType(md5, response.seenType);
        });
    }
  },

  applySeenType(md5, seenType) {
    switch (seenType) {
      case SeenType.UNSEEN:
        ThreadPage.addContentLinks(Dom.getElementByDataMD5(md5), md5);
        break;
      case SeenType.STORED:
        ThreadPage.setIsSeenContent(md5, true);
        break;
      case SeenType.SESSION:
        ThreadPage.setIsSeenContent(md5, false);
        break;
      case SeenType.FILTERED:
        Dom.getPostFromElement(Dom.getElementByDataMD5(md5))?.remove();
        break;
    }
  },

  setIsSeenContent(md5, isStored) {
    Page.thread.numSeenContentItems++;
    const thumbImg = Dom.getElementByDataMD5(md5);
    if (!thumbImg) return;

    Marks.setSeen(Dom.getPostFromElement(thumbImg), isStored);
    ThreadPage.addContentLinks(thumbImg, md5);
    Reports.setContentStats();
  },

  // Adds "Filter" after the file info of the content; on a base post (one
  // not nested by subthreads), also "Filter All" and "Download All".
  addContentLinks(thumbImg, md5) {
    if (!thumbImg || !md5) return;

    const fileText = thumbImg.parentElement?.previousSibling;
    if (!fileText) {
      console.log("Unable to add filter link: fileText element not present.");
      return;
    }
    if (fileText.querySelector('.cij-filter-link')) {
      console.log("Unable to add filter link: link already added.");
      return;
    }

    const addLink = (text, className, onclick) => {
      const link = document.createElement('a');
      link.textContent = text;
      link.className = className;
      link.onclick = onclick;
      fileText.appendChild(link);
    };

    addLink(" Filter", 'cij-filter-link', () => ThreadPage.filterContent(thumbImg, md5));

    const thisPost = fileText.parentElement?.parentElement;
    if (thisPost && thisPost === Dom.basePost(thisPost)) {
      addLink(" Filter All", 'cij-filter-all-link', () => ThreadPage.filterAllContent(thisPost));
      addLink(" Download All", 'cij-download-link', () => ThreadPage.downloadImages(thisPost));
    }
  },

  filterContent(thumbImg, md5) {
    Messaging.request(Actions.UPDATE_CONTENT_FILTER, {md5});
    Dom.getPostFromElement(thumbImg)?.remove();
  },

  // Clicks every "Filter" link in the post, including nested subthread posts.
  filterAllContent(post) {
    const links = post.querySelectorAll('.cij-filter-link');
    for (let i = links.length - 1; i >= 0; i--) {
      try {
        links[i].click();
      } catch (e) {
        console.error(e);
      }
    }
  },

  downloadImages(post) {
    const urls = Page.thread.getThumbs(Dom.postContainer(post)).map(thumb => thumb.href);
    Messaging.request(Actions.DOWNLOAD_IMAGES, {urls});
  },

  // Subthreads: moves each post that replies to another post under that post.
  // A reply to several posts is moved under the first and gets an empty
  // bordered placeholder copy under the others.
  subthreads() {
    const thread = Page.thread;
    const graph = Reports.threadGraph(null, false);
    const opId = Dom.getPostId(thread.getOriginalPost());
    const counts = {};

    for (const postId of Object.keys(graph)) {
      if (postId == opId) continue;
      const post = thread.getPostById(postId);
      const pBacklinks = graph[postId][1];
      for (const blPostId of pBacklinks) {
        if (blPostId == opId) continue;
        const blPost = thread.getPostById(blPostId);
        const count = counts[blPostId];
        if (count) {
          const blPostCopy = blPost.cloneNode();
          Marks.markSubthreadPost(blPostCopy);
          blPostCopy.id = blPostId + "-" + count;
          ThreadPage.suffixIdsAndNames(blPostCopy.getElementsByTagName("*"), new RegExp(blPostId), count);
          post.appendChild(blPostCopy);
          counts[blPostId]++;
        } else {
          const blPostContainer = blPost.parentElement;
          Marks.markSubthreadPost(blPost);
          post.appendChild(blPost);
          blPostContainer.remove();
          counts[blPostId] = 1;
        }
      }
    }
  },

  suffixIdsAndNames(elements, regex, suffix) {
    for (const el of elements) {
      if (el.id && regex.test(el.id)) {
        el.id = el.id + '-' + suffix;
      }
      if (el.name && regex.test(el.name)) {
        el.name = el.name + '-' + suffix;
      }
    }
  },

  async highlightNewPosts() {
    const thread = Page.thread;
    const response = await Messaging.request(Actions.FIND_NEW_POST_IDS, {
      url: Page.initialLink,
      postIds: thread.getPostIds(),
    });
    thread.newPostIds = response?.newPostIds || [];
    for (const postId of thread.newPostIds) {
      const post = thread.getPostById(postId);
      if (post) Marks.markNewPost(post);
    }
  },

  transformPostText(posts) {
    const thread = Page.thread;
    const transforms = TextTransforms.current();
    TextTransforms.applyToElement(transforms, thread.getSubject());
    for (const post of thread.checkP(posts)) {
      try {
        TextTransforms.applyToElement(transforms, Dom.getPostMessage(post));
      } catch (e) {
        console.log("Could not get message or make replacements for post: ");
        console.log(e);
      }
    }
  },

  // Replaces the thread with just its content: expands every thumbnail (one
  // every 100 ms), then keeps only the expanded images followed by the
  // videos, paused.
  async contentExtract() {
    const thread = Page.thread;
    const expanded = Media.expandAll(thread.getThumbImgs());
    await Util.sleep(expanded * 100 + 500);

    const images = thread.getExpandedImgs();
    const videos = thread.getVids();
    videos.forEach(video => video.pause());
    thread.element.innerHTML = '';
    images.forEach(img => thread.element.append(img));
    videos.forEach(video => thread.element.append(video));
  },
};
