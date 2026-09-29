'use strict';

class Board {
  constructor(url) {
    const route = url.replaceAll(/.+4chan(nel)?.org\//g, "");
    this.name = route.substring(0, route.indexOf("/"));
    this.isWorkSafe = url.includes('4channel.org');
    // Other boards may have threads that contain videos, but there are usually fewer
    this.isGif = this.name === 'gif' || this.name === 'wsg';
  }
}

// A thread page (constructed with its URL) or a catalog thread (constructed
// with its catalog element).
class Thread {
  constructor(url, element) {
    if (url) {
      this.isThreadPage = true;
      this.link = url;
      this.element = document.querySelector('.thread');
      this.id = this.element?.id;
      this.postIds = [];
      this.newPostIds = [];
      this.openedWebms = [];
      this.closedWebmThumbs = [];
      this.currentContent = -1;
      this.currentNewPost = -1;
      this.numContentItems = this.getThumbs()?.length || 0;
      this.numSeenContentItems = 0;
    } else if (element) {
      this.isThreadPage = false;
      this.element = element;
      this.id = this.element.id;
      this.link = this.element.getAttribute('href');
    } else {
      throw new Error('No url or element provided to Thread constructor');
    }
  }

  // Catalog threads

  getTeaser() {
    return this.element.querySelector('.teaser');
  }

  getTeaserText() {
    return this.getTeaser()?.textContent;
  }

  setBackgroundColor(color) {
    this.element.style.backgroundColor = color;
  }

  threadMeta() {
    const data = [].slice.call(this.element.querySelector('.meta').querySelectorAll('b'))
      .map(b => parseInt(b.textContent));
    return {replies: data[0], imgs: data[1]};
  }

  hasImageContent(nImagesBase = 9, nImagesContent = 50, proportionImages = 0.6) {
    const meta = this.threadMeta();
    return meta.imgs > nImagesBase &&
        (meta.imgs >= nImagesContent || (meta.imgs / meta.replies) > proportionImages);
  }

  hasChallenge() {
    return /(y[a-z]yl|Y[A-Z]YL|u lose)/.test(this.element.textContent);
  }

  hasExternalLink() {
    return /http/.test(this.element.textContent);
  }

  // Posts

  getPosts() {
    return this.element ? [].slice.call(this.element.querySelectorAll('.post')) : [];
  }

  checkP(posts) {
    return posts || this.getPosts();
  }

  getPostIds() {
    if (this.postIds.length == 0) {
      this.postIds = this.getPosts()
          .filter(post => post)
          .map(post => Dom.getPostId(post));
    }
    return this.postIds;
  }

  // IDs of posts that are new since the previous load, in page order.
  getNewPostIds() {
    return this.newPostIds;
  }

  getOriginalPost() {
    return this.element?.querySelector('.post.op');
  }

  getPostById(id) {
    return this.element.querySelector('#p' + id);
  }

  getSubject() {
    const subjects = this.getOriginalPost().querySelectorAll('.subject');
    return subjects[subjects.length - 1];
  }

  nextPost(post) {
    if (post) {
      return post.parentElement?.nextSibling?.querySelector('.post');
    }
    return this.getOriginalPost();
  }

  previousPost(post) {
    if (post) {
      return post.parentElement?.previousSibling?.querySelector('.post');
    }
    return this.getOriginalPost();
  }

  getPostsByPosterId(posterId, posts) {
    return this.checkP(posts).filter(post => Dom.getPosterId(post) == posterId);
  }

  getPostsByOP() {
    return this.getPostsByPosterId(Dom.getPosterId(this.getOriginalPost()));
  }

  // Content (thumbnails, expanded images, videos)

  checkT(thumbs) {
    return thumbs || this.getThumbs();
  }

  getThumbs(el) {
    el = el || this.element;
    return el ? [].slice.call(el.querySelectorAll('.fileThumb')) : [];
  }

  getThumbImgs(thumbs, includeHidden) {
    thumbs = this.checkT(thumbs);
    return thumbs
      .filter(thumb => includeHidden || thumb.style.display === '')
      .map(thumb => Dom.getThumbImg(thumb))
      .filter(img => img);
  }

  getExpandedImgs(thumbs) {
    return this.checkT(thumbs)
      .map(thumb => thumb.querySelector('.expanded-thumb'))
      .filter(img => img);
  }

  getVids(el, first) {
    el = el || this.element;
    if (first) return el.querySelector('video');
    return [].slice.call(el.querySelectorAll('video'));
  }

  // A thumb is hidden (display: none) only while its video is expanded.
  getExpandedWebms(thumbs) {
    return this.checkT(thumbs)
      .filter(thumb => thumb.style.display === 'none')
      .map(thumb => thumb.nextSibling);
  }

  getAudioWebms() {
    return this.getExpandedWebms().filter(webm => Dom.hasAudio(webm));
  }

  getCurrentContent(thumbs) {
    if (Page.board.isGif) {
      const currentPost = Dom.getPostFromElement(Util.last(this.openedWebms));
      if (currentPost) {
        const thumb = currentPost.querySelector('.fileThumb');
        this.currentContent = this.getThumbs().indexOf(thumb);
        console.log("Set current content to " + this.currentContent);
      } else {
        console.log("No current post found.");
        console.log(this.openedWebms);
      }
    }
    return this.checkT(thumbs)[this.currentContent];
  }

  getPostInSeries(series, index) {
    if (series == 'thumbs' || series === undefined) {
      const thumbs = this.getThumbs();
      index = index || this.currentContent;
      return Dom.getPostFromElement(thumbs[index]);
    }
  }

  currentPost() {
    return Dom.getPostFromElement(this.getCurrentContent());
  }

  // {type: 'img'|'webm'|null, content, expanded} for a post's first (or
  // given) thumbnail. `content` is what to show or fullscreen: the expanded
  // image or video when expanded, otherwise the thumbnail image.
  contentOf(post, thumb) {
    thumb = thumb || post?.querySelector('.fileThumb');
    if (!thumb) {
      return {type: null, content: null, expanded: false};
    }
    const expanded = Dom.thumbHidden(thumb);
    const thumbImg = Dom.getThumbImg(thumb);
    const type = thumbImg ? (Dom.isWebmThumbImg(thumbImg) ? 'webm' : 'img') : null;
    let content = null;
    if (thumbImg) {
      if (!expanded) {
        content = thumbImg;
      } else if (type == 'img') {
        content = Util.first(this.getExpandedImgs([thumb]));
      } else {
        content = this.getVids(post, true);
      }
    }
    return {type, content, expanded};
  }

  getProportionSeenContent() {
    if (this.numContentItems == 0) {
      return -1;
    }
    return this.numSeenContentItems / this.numContentItems;
  }

  removeOpenedWebM(video) {
    this.openedWebms = Util.arrayRemove(this.openedWebms, video);
  }
}

// The current page. `initialLink` is the URL at load, without any #fragment.
const Page = {
  initialLink: window.location.href.replaceAll(/#.+/g, ''),
  board: null,
  isBoardBase: false,
  isCatalog: false,
  isThread: false,
  thread: null,
  threads: null,

  init() {
    Page.board = new Board(Page.initialLink);
    Page.isBoardBase = /4chan(nel)?.org\/[a-z]+\/$/.test(Page.initialLink);
    Page.isCatalog = !Page.isBoardBase && /4chan(nel)?.org\/[a-z]+\/catalog$/.test(Page.initialLink);
    Page.isThread = !Page.isBoardBase && !Page.isCatalog
        && /boards.4chan(nel)?.org\/[a-z]+\/thread\//.test(Page.initialLink);
    Page.thread = Page.isThread ? new Thread(Page.initialLink) : null;
  },

  // All `.thread` elements, collected on first call. On the catalog this
  // list keeps threads that are later removed from the page.
  getThreads() {
    if (!Page.threads) {
      Page.threads = [].slice.call(document.querySelectorAll('.thread'))
          .map(threadEl => new Thread(null, threadEl));
    }
    return Page.threads;
  },

  getThread(threadId) {
    return Page.getThreads().find(t => t?.id === threadId) || null;
  },
};
