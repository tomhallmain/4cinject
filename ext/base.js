
// Classes and methods are defined here to be accessible in the in-page context,
// but these will not have access to content script JS objects and methods.


// SETUP ////////////

class Board {
  name;
  isWorkSafe;
  // Other boards may have threads that contain videos, but there are usually fewer
  isGif;

  constructor(url) {
    const route = url.replaceAll(/.+4chan(nel)?.org\//g, "")
    this.name = route.substring(0, route.indexOf("/"))
    this.isWorkSafe = url.includes('4channel.org');
    this.isGif = this.name === 'gif' || this.name === 'wsg';
  }
}

class Post {
  element;
  hasContent;
  id;

  constructor(element) {
    this.element = element;
    this.id = this.element?.id.slice(1);
  }

  postContainer() {
    return this.element?.closest('.postContainer');
  }
}

class Thread4C {
  isThreadPage;
  element;
  id;
  link;
  quoteLinks;
  postIds;
  newPostIds;
  openedWebms;
  closedWebmThumbs;
  currentContent;
  currentNewPost;
  numContentItems;
  numSeenContentItems;

  constructor(url, element) {
    if (url) {
      this.isThreadPage = true;
      this.link = url;
      this.element = document.querySelector('.thread');
      this.id = this.element?.id;
      this.quoteLinks = document.querySelector('.quoteLink');
      this.postIds = [];
      this.newPostIds = [];
      this.openedWebms = [];
      this.closedWebmThumbs = [];
      this.currentContent = -1;
      this.currentNewPost = -1;
      this.numContentItems = this.getThumbs()?.length || 0;
      this.numSeenContentItems = 0;
    }
    else if (element) {
      this.isThreadPage = false;
      this.element = element;
      this.id = this.element.id;
      this.link = this.element.getAttribute('href');
    }
    else {
      throw new Error('No url or element provided to Thread4C constructor');
    }
  }

  getTeaser() {
    return this.element.querySelector('.teaser');
  }

  setBackgroundColor(color) {
    this.element.style.backgroundColor = color;
  }

  getPosts() {
    return [].slice.call(this.element.querySelectorAll('.post'));
  }

  checkP(posts) { return posts || this.getPosts() }

  getPostIds() {
    if (this.postIds.length == 0) {
      this.postIds = this.getPosts().map( post => getPostId(post) );
    }

    return this.postIds;
  }

  getOriginalPost() {
    return this.element.querySelector('.post.op');
  }

  getCurrentContent(thumbs) {
    if (board.isGif) {
      const currentPost = getPostFromElement(last(thread.openedWebms));
      if (currentPost) {
        const thumb = currentPost.querySelector('.fileThumb');
        this.currentContent = this.getThumbs().indexOf(thumb);
        console.log("Set current content to " + this.currentContent);
      } else {
        console.log("No current post found.");
        console.log(thread.openedWebms);
      }
    }

    return this.checkT(thumbs)[this.currentContent];
  }

  getPostById(id) {
    return this.element.querySelector('#p' + id);
  }

  getSubject() {
    const subjects = this.getOriginalPost().querySelectorAll('.subject');
    return subjects[subjects.length - 1];
  }

  getPostInSeries(series, index) {
    if (series == 'thumbs' || series === undefined) {
      const thumbs = this.getThumbs();
      index = index || this.currentContent;
      return getPostFromElement(thumbs[index]);
    }
  }

  currentPost() {
    return getPostFromElement(this.getCurrentContent());
  }

  nextPost(post) {
    if (post) {
      return post.parentElement?.nextSibling?.querySelector('.post');
    } else {
      return this.getOriginalPost();
    }
  }

  previousPost(post) {
    if (post) {
      return post.parentElement?.previousSibling?.querySelector('.post');
    } else {
      return this.getOriginalPost();
    }
  }

  getPostsByPosterId(posterId, posts) {
    return this.checkP(posts).filter(post => getPosterId(post) == posterId);
  }

  getPostsByOP() {
    return this.getPostsByPosterId(getPosterId(this.getOriginalPost()))
  }

  checkT(thumbs) { return thumbs || this.getThumbs() }

  getThumbs(el) {
    el = el || this.element;
    return [].slice.call(el.querySelectorAll('.fileThumb'));
  }

  getThumbImgs(thumbs, includeHidden) {
    thumbs = this.checkT(thumbs);

    if (includeHidden) {
      return thumbs.reduce( (imgs, thumb) =>
          (getThumbImg(thumb) && imgs.push(getThumbImg(thumb)), imgs), [] );
    } else {
      return thumbs.reduce( (imgs, thumb) => (thumb.style.display === ''
          && getThumbImg(thumb) && imgs.push(getThumbImg(thumb)), imgs), [] );
    }
  }

  getExpandedImgs(thumbs) {
    thumbs = this.checkT(thumbs);
    return thumbs.reduce( (acc, thumb) => {
        var img = thumb.querySelector('.expanded-thumb');
        if (img) { acc.push(img) } return acc }, []);
  }

  getVids(el, first) {
    el = el || this.element
    if (first) return el.querySelector('video');
    return [].slice.call(el.querySelectorAll('video'));
  }

  getExpandedWebms(thumbs) {
    thumbs = this.checkT(thumbs);
    // Display style seems to be set to none only in expanded video case
    return thumbs.reduce( (webms, thumb) =>
        (thumb.style.display === 'none' && webms.push(thumb.nextSibling), webms), [] );
  }

  getCloseLinks() {
    return [].slice.call(this.element.querySelectorAll('a'))
             .filter( a => a.textContent === 'Close' );
  }

  getAudioWebms() {
    return this.getExpandedWebms().filter( webm => hasAudio(webm) );
  }

  threadMeta() {
    const data = [].slice.call(this.element.querySelector('.meta').querySelectorAll('b'))
      .map(b => parseInt(b.textContent));
    return {replies: data[0], imgs: data[1]}
  }

  hasImageContent(nImagesBase, nImagesContent, proportionImages) {
    nImagesBase = nImagesBase || 9;
    nImagesContent = nImagesContent || 50;
    proportionImages = proportionImages || 0.6;
    const meta = this.threadMeta();
    return meta.imgs > nImagesBase &&
        (meta.imgs >= nImagesContent || (meta.imgs / meta.replies) > proportionImages);
  }

  hasChallenge() {
    const pattern = /(y[a-z]yl|Y[A-Z]YL|u lose)/;
    return pattern.test(this.element.textContent);
  }

  hasExternalLink() {
    const pattern = /http/;
    return pattern.test(this.element.textContent);
  }

  getProportionSeenContent() {
    if (this.numContentItems == 0) {
      return -1;
    } else {
      return this.numSeenContentItems / this.numContentItems;
    }
  }

  removeOpenedWebM(video) {
    this.openedWebms = arrayRemove(this.openedWebms, video);
  }
}


// INTERACTION /////////

function openImgs(thumbImgs) {
  thumbImgs = thumbImgs || thread.getThumbImgs();
  thumbImgs = thumbImgs.filter( img => ! webmThumbImg(img) );
  for (var i = 0; i < thumbImgs.length; i++) {
    const post = getPostFromElement(thumbImgs[i]);
    const borderColor = post.style.borderColor;
    if (borderColor != 'red' && borderColor != 'orange') {
      setTimeout(ImageExpansion.toggle, i*200, thumbImgs[i]);
    }
  }
  const opened = thumbImgs.length
  if (debug) {
    if (opened > 0) {
      console.log('Opened ' + thumbImgs.length + ' file thumbs');
    } else {
      console.log('Could not find any image thumbs to expand');
    }
  }
}

function openAll(thumbImgs, play) {
  thumbImgs = thumbImgs || thread.getThumbImgs();
  var opened = 0
  for (var i = 0; i < thumbImgs.length; i++) {
    if (!thumbImgs[i]) {
        continue
    }
    var thumb = thumbImgs[i].parentElement;
    setTimeout(ImageExpansion.toggle, i*100, thumbImgs[i]);
    if ( webmThumbImg(thumb) ) {
      if (! play === true) thumb.nextSibling.pause();
    }
    opened++
  }
  if (debug) console.log('Opened ' + opened + ' file thumbs');
}

function close(imgsExp) {
  // Close videos
  var closeLinks = thread.getCloseLinks();
  for (var i = 0; i < closeLinks.length; i++) { closeLinks[i].click() }
  // Toggle expanded images off
  imgsExp = imgsExp || thread.getExpandedImgs();
  for (var i = 0; i < imgsExp.length; i++) { ImageExpansion.toggle(imgsExp[i]) }
  if (debug) console.log('Closed ' + closeLinks.length + ' videos and ' + imgsExp.length + ' images');
}

function expandImages(thumbImgs) {
  thumbImgs = thumbImgs || thread.getThumbImgs();
  thumbImgs.length > 0 ? openImgs(thumbImgs) : true;
}

function closeVideo(video) {
  if (video.tagName === "VIDEO") {
    thread.closedWebmThumbs.push(getThumb(video));
    getCloseLink(video).click();
  }
}

function openVideo(videoThumb) {
  thread.closedWebmThumbs = arrayRemove(thread.closedWebmThumbs, videoThumb);
  openAll(thread.getThumbImgs([videoThumb]), true);
}

function currentVideoIndex(currentVideo, webmThumbImgs) {
  if (currentVideo) {
    const currentThumbImg = getThumbImg(getThumb(currentVideo));
    return webmThumbImgs.indexOf(currentThumbImg);
  } else {
    return -1;
  }
}

function openNextVideo(currentVideo) {
  const webmThumbImgs = thread.getThumbImgs(null, true)
    .filter( img => webmThumbImg(img) );
  var currentIndex = currentVideoIndex(currentVideo, webmThumbImgs);
  currentIndex++;
  const nextThumbImg = webmThumbImgs[currentIndex];
  openAll([nextThumbImg], true);
  getPostFromElement(nextThumbImg)?.scrollIntoView();
}

function openPreviousVideo(currentVideo) {
  const webmThumbImgs = thread.getThumbImgs(null, true)
    .filter( img => webmThumbImg(img) );
  var currentIndex = currentVideoIndex(currentVideo, webmThumbImgs);
  currentIndex = currentIndex < 0 ? 0 : currentIndex - 1;
  const previousThumbImg = webmThumbImgs[currentIndex]
  openAll([previousThumbImg], true);
  getPostFromElement(previousThumbImg)?.scrollIntoView();
}

function engagePost(post, thumb) {
  if (!post) return false;
  if (thumb) {
    const {type, content, expanded} = postContent(post, thumb);
    const webm = type == 'webm'
    var engageContent = content
    if (!expanded && settingOn('autoExpand')) {
      if (webm) {
        openVideo(thumb, true);
        engageContent = thread.getVids(post, true);
      } else { // type == 'img'
        ImageExpansion.toggle(content);
        engageContent = first(thread.getExpandedImgs([thumb]));
      }
    }
    if (settingOn('fullscreen')) {
      engageContent.requestFullscreen();
      //const v = vh + 50;
      //if ((!webm && engageContent.height > v)
      //  || (webm && engageContent.videoHeight > v)) {
      //} else if (fullscreen()) {
      //  exitFullscreen();
      //}
    }
  }
  post.scrollIntoView();
  return true
}

function previousNewPost() {
  if (thread.newPostIds.length == 0) return;
  if ((currentNewPost - 1) >= 0) {
    currentNewPost--
    const post = thread.getPostById(newPostIds[currentNewPost])
    const thumb = post?.querySelector('.fileThumb')
    engagePost(post, thumb)
  }
}

function nextNewPost() {
  if (thread.newPostIds.length == 0) return;
  if ((currentNewPost + 1) < thread.newPostIds.length) {
    currentNewPost++
    const post = thread.getPostById(thread.newPostIds[currentNewPost])
    const thumb = post?.querySelector('.fileThumb')
    engagePost(post, thumb)
  }
}

function nextContent(thumbs) {
  thumbs = thread.checkT(thumbs);
  if (thumbs && (thread.currentContent + 1) < thumbs.length) {
    thread.currentContent++
    const thumb = thumbs[thread.currentContent];
    const next = getPostFromElement(thumb);
    engagePost(next, thumb);
  } else {
    if (settingOn('fullscreen') && fullscreen()) exitFullscreen();
  }
}

function previousContent(thumbs) {
  thumbs = thread.checkT(thumbs);
  if (thumbs && (thread.currentContent - 1) >= 0) {
    thread.currentContent--
    const thumb = thumbs[thread.currentContent];
    const previous = getPostFromElement(thumb);
    engagePost(previous, thumb);
  } else {
    if (settingOn('fullscreen') && fullscreen()) exitFullscreen();
  }
}

function jump(forward) {
  var base = basePost(thread.currentPost());
  var searching = true
  var jumpPost = null
  while (!jumpPost || searching) {
    var jumpBase = forward ? thread.nextPost(base) : thread.previousPost(base);
    if (jumpBase) {
      var thumb = first(thread.getThumbs(postContainer(jumpBase)));
      if (thumb) {
        jumpPost = getPostFromElement(thumb);
        thread.currentContent = thread.getThumbs().indexOf(thumb);
        searching = false
      } else { base = jumpBase }
    } else { searching = false }
  }
  if (jumpPost) engagePost(jumpPost, thumb);
}

function mute(video) {
  video.muted = true;
}

function unmute(video) {
  video.muted = false;
}

function exitFullscreen() {
  try { document.exitFullscreen() }
  catch (e) { } // suppress error
  if (document.fullScreenElement && fullscreen()) {
    exitFullscreen()
  }
}

if (!n_scripts) var n_scripts = 0;
n_scripts++


if (activeStyleSheet !== 'Tomorrow') {
  setActiveStyleSheet('Tomorrow');
}

const initialLink = window.location.href.replaceAll(/#.+/g, '');
const board = new Board(initialLink);
const boardBaseMatch = /4chan(nel)?.org\/[a-z]+\/$/
const catalogMatch = /4chan(nel)?.org\/[a-z]+\/catalog$/
const threadMatch = /boards.4chan(nel)?.org\/[a-z]+\/thread\//

var boardBasePage = boardBaseMatch.test(initialLink);
var catalogPage = !boardBasePage && catalogMatch.test(initialLink);
var threadPage = !boardBasePage && !catalogPage && threadMatch.test(initialLink);

const thread = threadPage ? new Thread4C(initialLink) : null;
var threads;
var fullScreen = false
//var fullScreenRequests = 0;

function local(storageKey, toVal) {
  if (toVal != null) {
    window.localStorage[storageKey] = toVal
  } else {
    return window.localStorage[storageKey];
  }
}

function settingOn(storageKey, checkVal) {
  const testVal = local(storageKey)
  if (checkVal) {
    return testVal === checkVal;
  } else {
    return testVal !== "false" && testVal !== undefined && testVal !== null;
  }
}

function setDefault(storageKey, defaultValue) {
  if (local(storageKey) === undefined) {
    local(storageKey, defaultValue);
  }
}

function setOrderBy(order) {
  orderSetting = '"orderby":"' + order + '"';
  catalogSettings = local('catalog-settings');
  catalogSet = catalogSettings != undefined
  orderSet = catalogSet && catalogSettings.includes(orderSetting);
  if (!orderSet) {
    catalogSettings = '{"extended":true,"large":false,' + orderSetting +'}';
    local('catalog-settings', catalogSettings);
    if (catalogPage) {  window.location.reload() }
  }
}

function fullscreen() {
  return document.fullscreen;
}

function setVolume(volume) {
  local('volume', volume);
  thread?.getAudioWebms().forEach( webm => webm.volume = volume );
}

function setThreadFilter(filterPattern) {
  local('threadFilter', filterPattern);
  if (!catalogPage || filterPattern === "") return;
  window.location.reload();
}

function catalogFilter() {
  const threads = getThreads();
  const threadFilter = local('threadFilter')
  var filterPattern;
  if (threadFilter != undefined && threadFilter !== "") {
    filterPattern = new RegExp(threadFilter)
  }
  for (var i = 0; i < threads.length; i++) {
    const t = threads[i];
    if (filterPattern?.test(t.element.textContent)) {
      t.element.remove();
      threads.splice(i, 1);
    }
    else if (t.hasChallenge()) {
      t.setBackgroundColor('teal');
    }
    else if (t.hasImageContent()) {
      t.setBackgroundColor('green');
    }
    else if (t.hasExternalLink()) {
      t.setBackgroundColor('darkblue');
    }
  }
}

function setTextTransforms(transformsString) {
  local('textTransforms', transformsString);
  const runTransforms = transformsString && transformsString !== ""
  local('runTextTransforms', runTransforms)
  if (!threadPage || !runTransforms) return;
  window.location.reload();
}

function getTextTransforms() {
  transformsString = local('textTransforms')
  keyValues = transformsString.split(/(\n|,)/)
  transforms = {}

  for (pair of keyValues) {
    try {
      items = pair.split("==")
      pattern = items[0]
      const test = new RegExp(pattern, 'g')
      replacement = items[1]
      transforms[pattern] = replacement
    }
    catch {
      console.log("Failed to add invalid transform: " + pair)
    }
  }

  return transforms
}

function transformElementHTML(transforms, element) {
  if (!transforms || !element) return;
  var string = element.innerHTML
  if (!string || string === '') return;
  var patternMatch = false;
  for (pattern in transforms) {
    pattern_regex = new RegExp(pattern, 'g');
    replacement = transforms[pattern];
    if (pattern_regex?.test(string)) {
      patternMatch = true;
      string = string.replaceAll(pattern_regex, replacement);
    }
  }
  if (patternMatch) {
    element.innerHTML = string;
  }
}

function transformTeaserTexts(transforms) {
  transforms = transforms || getTextTransforms();
  const threads = getThreads();
  for (t of threads) {
    try {
      var teaserEl = t.getTeaser();
      transformElementHTML(transforms, teaserEl);
    }
    catch (e) {
      console.log("Could not get message or make replacements for thread teaser: ");
      console.log(e);
    }
  }
}

function transformPostText(posts, transforms) {
  transforms = transforms || getTextTransforms();
  subject = thread.getSubject();
  transformElementHTML(transforms, subject);
  posts = thread.checkP(posts);
  for (post of posts) {
    try {
      var postMessageEl = getPostMessage(post)
      transformElementHTML(transforms, postMessageEl);
    }
    catch (e) {
      console.log("Could not get message or make replacements for post: ")
      console.log(e);
    }
  }
}

function togglePostDiffHighlight() {
  const isOn = settingOn('postDiffHighlight');
  local('postDiffHighlight', !isOn);
}

// GENERAL ////////////

function getThreads() {
  if (!threads) {
    threads = [].slice.call(document.querySelectorAll('.thread'))
        .map(threadEl => new Thread4C(null, threadEl));
  }

  return threads
}

function getThreadFromElement(el) {
  return el?.closest('.thread');
}

function getPostFromElement(el) {
  return el?.closest('.post');
}

function postContainer(post) {
  return post?.closest('.postContainer');
}

function basePost(post) {
  return postContainer(post)?.querySelector('.post');
}

function getThreadId(thread) {
  return thread.id.slice(7) // Remove "thread-"
}

function getPostId(post) {
  return post.id.slice(1);
}

function getPostMessage(post) {
  return post.querySelector('.postMessage');
}

function postContent(post, thumb) {
  if (!thumb) {
    thumb = post?.querySelector('.fileThumb')
  }
  if (thumb) {
    const expanded = thumbHidden(thumb);
    const thumbImg = getThumbImg(thumb);
    const type = (webmThumbImg(thumbImg) ? 'webm' : 'img');
    const content = (expanded && type == 'img' ?
        first(thread.getExpandedImgs([thumb])) : expanded ?
          thread.getVids(post, true) : thumbImg);
    return {type: type, content: content, expanded: expanded}
  }
  else {
    return {type: null, content: null, expanded: false}
  }
}

function getThumb(video) {
  return video.previousSibling;
}

function getThumbImg(thumb) {
  return thumb.querySelector('img');
}

function thumbHidden(thumb) {
  if (thumb && thumb.style.display === 'none') {
    return true;
  } else {
    return getThumbImg(thumb)?.style.display === 'none';
  }
}

function webmThumbImg(thumbImg) {
  return /.webm$/.test(thumbImg.parentElement.href);
}

function getCloseLink(video) {
  return [].slice.call(video.parentElement.querySelectorAll('a'))
           .filter( link => link.textContent == "Close" )[0];
}

function getQuoteLinks(post) {
  return [].slice.call(getPostMessage(post)?.querySelectorAll('.quotelink'))
    .map( tag => parseInt(tag.hash?.slice(2)) );
}

function getBacklinks(post) {
  var backlinkElement = post.querySelector('.backlink')
  if (backlinkElement) {
    return [].slice.call(backlinkElement.querySelectorAll('.quotelink'))
      .map( tag => parseInt(tag.hash.slice(2)) );
  } else { return [] }
}

function hasAudio(video) {
  return video.mozHasAudio ||
    Boolean(video.webkitAudioDecodedByteCount) ||
    Boolean(video.audioTracks && video.audioTracks.length);
}

function getDataMD5(expandedItem) {
  if (expandedItem.className == "expandedWebm") {
    return getThumb(expandedItem).querySelector("img").getAttribute("data-md5");
  }
  else {
    return expandedItem.previousSibling.getAttribute("data-md5");
  }
}

function getElementByDataMD5(dataMD5) {
  return document.querySelector('[data-md5="' + dataMD5 + '"]')
}

function getElementByDataId(dataId) {
  return document.querySelector('[data-id="' + dataId + '"]')
}


// /pol/ methods

function getPosterId(post) {
  return post.querySelector("[class='hand']")?.textContent
}
function getFlagCode(post) {
  return post.querySelector("[class*='flag']")?.class.replace("flag flag-", "")
}
function getFlag(post) {
  const nameBlock = post.querySelector("[class=nameBlock]")

  if (!nameBlock) return

  const flag = nameBlock.querySelector("[class*='flag']")?.title

  if (flag) return flag

  return nameBlock.querySelector("[class*='bfl']")?.title
}


var observeDOM = (function(){
  var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

  return function( obj, callback ){
    if( !obj || !obj.nodeType === 1 ) return; // validation
    if( MutationObserver ){
      // define a new observer
      var obs = new MutationObserver(function(mutations, observer){
        callback(mutations);
      })
      // have the observer observe foo for changes in children
      obs.observe( obj, { childList:true, subtree:true });
    }

    else if( window.addEventListener ){
      obj.addEventListener('DOMNodeInserted', callback, false);
      obj.addEventListener('DOMNodeRemoved', callback, false);
    }
  }
})();


observeDOM(document.body, function(m) {
  m.forEach( record => {
    var added = record.addedNodes[0];
    if (added?.className == 'expandedWebm') {
      var video = added;
      unmute(video)
      video.volume = local('volume');
      thread.openedWebms.push(video);
    } else if (/^ad[a-z]-/.test(added?.parentElement?.className)) {
      added.innerHTML = '';
    }

    var removed = record.removedNodes[0];
    if (removed?.className == 'expandedWebm') {
      var video = removed;
      thread.removeOpenedWebM(video);
    }
  });
});

window.addEventListener("keydown", function (event) {
  if (event.defaultPrevented) { return; }

  switch (event.key) {
    case " ":
      if (event.shiftKey) {
        nextNewPost();
      }
      else if (event.altKey) {
        previousNewPost();
      }
      break;
    case "ArrowLeft":
      var currentVideo = last(thread.openedWebms);
      if (event.shiftKey) {
        if (board.isGif) {
          closeVideo(currentVideo);
        } else {
          exitFullscreen();
        }
      }
      else if (event.altKey) {
        jump(false);
      }
      else {
        if (board.isGif) {
          openPreviousVideo(currentVideo);
          if (currentVideo) closeVideo(currentVideo);
        } else {
          previousContent();
        }
      }
      break;
    case "ArrowRight":
      var currentVideo = last(thread.openedWebms);
      if (event.shiftKey) {
        if (board.isGif) {
          currentVideo.requestFullscreen();
        } else {
          postContent(thread.getPostInSeries())?.content?.requestFullscreen();
        }
      }
      else if (event.altKey) {
        jump(true);
      }
      else {
        if (board.isGif) {
          openNextVideo(currentVideo);
          if (currentVideo) closeVideo(currentVideo);
        } else {
          nextContent();
        }
      }
      break;
    default:
      return; // Quit when this doesn't handle the key event.
  }

  // Cancel the default action to avoid it being handled twice
  event.preventDefault();
}, true);


// ASYNC HANDLING//////////////////////

if (threadPage) {
  if (settingOn('autoExpand')) {
    setTimeout(openImgs, 1000);
  }
}
