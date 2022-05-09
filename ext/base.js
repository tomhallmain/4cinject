
// SETUP ////////////

if (activeStyleSheet !== 'Tomorrow') {
  setActiveStyleSheet('Tomorrow');
}

const initialLink = window.location.href;
const threadElement = document.querySelector('.thread');
const threadId = threadElement?.id
const quoteLinks = threadElement?.querySelector('.quoteLink');

const gifsMatch = /4chan(nel)?.org\/(gif|wsg)/;
const boardBaseMatch = /4chan(nel)?.org\/[a-z]+\/$/
const catalogMatch = /4chan(nel)?.org\/[a-z]+\/catalog$/
const threadMatch = /boards.4chan(nel)?.org\/[a-z]+\/thread\//

var openedWebms = [], closedWebmThumbs = []; fullScreen = false
var currentContent = -1; //, fullScreenRequests = 0;
var currentNewPost = -1;
var numContentItems = getThumbs().length;
var numSeenContentItems = 0;
var gifsPage = gifsMatch.test(initialLink);
var boardBasePage = boardBaseMatch.test(initialLink);
var catalogPage = catalogMatch.test(initialLink);
var threadPage = threadMatch.test(initialLink);
var postIds = [];
var newPostIds = [];

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
function toggleFullscreen() {
  local('fullscreen', !settingOn('fullscreen'));
}
function fullscreen() {
  return document.fullscreen;
}
function setVolume(volume) {
  local('volume', volume);
  getAudioWebms().forEach( webm => webm.volume = volume );
}
function toggleSubthreads() {
  const isOn = settingOn('subthreads');
  local('subthreads', !isOn);
  if (!threadPage) return;
  if (!isOn) {
    subthreads();
  } else {
    window.location.reload();
  }
}
function toggleTestSHA1() {
  const isOn = settingOn('testSHA1');
  local('testSHA1', !isOn);
  if (!threadPage) return;
  if (!isOn) {
    verifyContentFreshness();
  }
}
function toggleAutoExpand() {
  const isOn = settingOn('autoExpand');
  local('autoExpand', !isOn);
  if (!threadPage) return;
  if (!isOn) {
    openImgs();
  } else {
    close();
  }
}
function toggleFilter() {
  const isOn = settingOn('catalogFilter');
  local('catalogFilter', !isOn);
  if (!catalogPage) return;
  if (!isOn) {
    catalogFilter();
  } else {
    window.location.reload();
  }
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
  threads.map( t => {
    if (filterPattern?.test(t.textContent)) {
      t.remove();
    } else if (challengeThread(t)) {
      t.style.backgroundColor = 'teal';
    } else if (contentThread(t)) {
      t.style.backgroundColor = 'green';
    }
  });
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
  var patternMatch = false
  for (pattern in transforms) {
    pattern_regex = new RegExp(pattern, 'g')
    replacement = transforms[pattern]
    if (pattern_regex?.test(string)) {
      patternMatch = true
      string = string.replaceAll(pattern_regex, replacement);
    }
  }
  if (patternMatch) {
    element.innerHTML = string
  }
}
function transformTeaserTexts(transforms) {
  transforms = transforms || getTextTransforms();
  const threads = getThreads();
  for (thread of threads) {
    try {
      var teaserEl = thread.querySelector('.teaser')
      transformElementHTML(transforms, teaserEl);
    }
    catch (e) {
      console.log("Could not get message or make replacements for thread teaser: ")
      console.log(thread)
      console.log(e)
    }
  }
  console.log("Applied text transforms: " + local('textTransforms'))
}
function transformPostText(posts, transforms) {
  transforms = transforms || getTextTransforms();
  subject = getThreadSubject();
  transformElementHTML(transforms, subject);
  posts = checkP(posts);
  for (post of posts) {
    try {
      var postMessageEl = getPostMessage(post)
      transformElementHTML(transforms, postMessageEl);
    }
    catch (e) {
      console.log("Could not get message or make replacements for post: ")
      console.log(post)
      console.log(e)
    }
  }
  console.log("Applied text transforms: " + local('textTransforms'))
}
function togglePostDiffHighlight() {
  const isOn = settingOn('postDiffHighlight');
  local('postDiffHighlight', !isOn);
}


setDefault('autoExpand', 'false');
setDefault('fullscreen', 'false');
setDefault('subthreads', 'true');
setDefault('catalogFilter', 'true');
setDefault('testSHA1', 'true');
setDefault('postDiffHighlight', 'true');

if (!local('volume')) setVolume(0.5); // Set initial volume to 50%

if (boardBasePage || catalogPage) {
  setOrderBy('date')
  if (boardBasePage) { window.location.replace(initialLink + 'catalog') }
}
if (catalogPage) {
  if (settingOn('catalogFilter')) catalogFilter();
  if (settingOn('runTextTransforms')) transformTeaserTexts();
}

[].slice.call(document.querySelectorAll('div[class^=ad]'))
  .map( el => el.innerHTML = '' )


// GENERAL ////////////

function getBoard() {
  route = initialLink.replaceAll(/.+4chan(nel)?.org\//g, "")
  return route.substring(0, route.indexOf("/"))
}
function checkP(posts) { return posts || getPosts() }
function checkT(thumbs) { return thumbs || getThumbs() }
function getThreads() {
  return [].slice.call(document.querySelectorAll('.thread'));
}
function getPosts() {
  return [].slice.call(threadElement.querySelectorAll('.post'));
}
function getPostFromElement(el) {
  return el.closest('.post');
}
function postContainer(post) {
  return post.closest('.postContainer');
}
function basePost(post) {
  return postContainer(post).querySelector('.post');
}
function getCurrentContent(thumbs) {
  return checkT(thumbs)[currentContent];
}
function currentPost() {
  return getPostFromElement(getCurrentContent());
}
function nextPost(post) {
  if (post) {
    return post.parentElement?.nextSibling?.querySelector('.post');
  } else {
    return getOriginalPost();
  }
}
function previousPost(post) {
  if (post) {
    return post.parentElement?.previousSibling?.querySelector('.post');
  } else {
    return getOriginalPost();
  }
}
function getPostId(post) {
  return post.id.slice(1);
}
function getPostIds() {
  if (postIds.length == 0) {
    postIds = getPosts().map( post => getPostId(post) )
  }

  return postIds;
}
function getPostMessage(post) {
  return post.querySelector('.postMessage');
}
function postContent(post, thumb) {
  if (!thumb) thumb = post.querySelector('.fileThumb')
  if (thumb) {
    const expanded = thumbHidden(thumb);
    const thumbImg = getThumbImg(thumb);
    const type = (webmThumbImg(thumbImg) ? 'webm' : 'img');
    const content = (expanded && type == 'img' ? first(getExpandedImgs([thumb]))
      : expanded ? getVids(post, true) : thumbImg);
    return {type: type, content: content, expanded: expanded}
  }
  else {
    return {type: null, content: null, expanded: false}
  }
}
function getPostById(id) {
  return threadElement.querySelector('#p' + id);
}
function getOriginalPost() {
  return threadElement.querySelector('.post.op');
}
function getThreadSubject() {
  const subjects = getOriginalPost().querySelectorAll('.subject');
  return subjects[subjects.length - 1];
}
function getPostInSeries(series, index) {
  if (series == 'thumbs' || series === undefined) {
    const thumbs = getThumbs();
    index = index || currentContent;
    return getPostFromElement(thumbs[index])
  }
}
function getThumbs(el) {
  el = el || threadElement;
  return [].slice.call(el.querySelectorAll('.fileThumb'));
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
function getThumbImgs(thumbs, includeHidden) {
  thumbs = checkT(thumbs);
  if (includeHidden) {
    return thumbs.reduce( (imgs, thumb) =>
     (getThumbImg(thumb) && imgs.push(getThumbImg(thumb)), imgs), [] );
  } else {
    return thumbs.reduce( (imgs, thumb) => (thumb.style.display === ''
      && getThumbImg(thumb) && imgs.push(getThumbImg(thumb)), imgs), [] );
  }
}
function getExpandedImgs(thumbs) {
  thumbs = checkT(thumbs);
  return thumbs.reduce( (acc, thumb) => {
      var img = thumb.querySelector('.expanded-thumb');
      if (img) { acc.push(img) } return acc }, []);
}
function getVids(el, first) {
  el = el || threadElement
  if (first) return el.querySelector('video');
  return [].slice.call(el.querySelectorAll('video'));
}
function getExpandedWebms(thumbs) {
  thumbs = checkT(thumbs);
  // Display style seems to be set to none only in expanded video case
  return thumbs.reduce( (webms, thumb) =>
      (thumb.style.display === 'none' && webms.push(thumb.nextSibling), webms), [] );
}
function getCloseLinks() {
  return [].slice.call(threadElement.querySelectorAll('a'))
           .filter( a => a.textContent === 'Close' );
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
function getAudioWebms(video) {
  return getExpandedWebms().filter( webm => hasAudio(webm) );
}
function threadMeta(thread) {
  const data = [].slice.call(thread.querySelector('.meta').querySelectorAll('b'))
    .map(b => parseInt(b.textContent));
  return {replies: data[0], imgs: data[1]}
}
function contentThread(thread) {
  const meta = threadMeta(thread);
  return meta.imgs > 9 && (meta.imgs >= 50 || (meta.imgs / meta.replies) > 0.6)
}
function challengeThread(thread) {
  const ylylMatch = /(y[gl]yl|Y[GL]YL|u lose)/
  return ylylMatch.test(thread.textContent)
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
function verifyContentFreshness() {
  getThumbs().map( thumb => {
    chrome.runtime.sendMessage(extensionID, {
      action: 'testSHA1',
      url: thumb.href,
      dataId: thumb.querySelector("img").getAttribute('data-md5')
    })
  });
}


// /pol/ methods

function getPosterId(post) {
  return post.querySelector("[class='hand']")?.textContent
}
function getFlagCode(post) {
  return post.querySelector("[class*='flag']")?.class.replace("flag flag-", "")
}
function getFlag(post) {
  return post.querySelector("[class*='flag']")?.title
}
function getPostsByPosterId(posterId, posts) {
  return checkP(posts).filter(post => getPosterId(post) == posterId);
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
      openedWebms.push(video);
      if (settingOn('testSHA1')) {
        chrome.runtime.sendMessage(extensionID, {
          action: 'testSHA1',
          url: added.src,
          dataId: getDataMD5(video)
        });
      }
    } else if (/^ad[a-z]-/.test(added?.parentElement?.className)) {
      added.innerHTML = '';
    }

    var removed = record.removedNodes[0];
    if (removed?.className == 'expandedWebm') {
      var video = removed;
      openedWebms = arrayRemove(openedWebms, video);
    }
  });
});

window.addEventListener("keydown", function (event) {
  if (event.defaultPrevented) { return }

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
      var currentVideo = last(openedWebms);
      if (event.shiftKey) {
        if (gifsPage) { closeVideo(currentVideo) }
        else { exitFullscreen() }}
      else if (event.altKey) { jump(false) }
      else {
        if (gifsPage) {
          openPreviousVideo(currentVideo);
          if (currentVideo) closeVideo(currentVideo);
        } else { previousContent() }}
      break;
    case "ArrowRight":
      var currentVideo = last(openedWebms);
      if (event.shiftKey) {
        if (gifsPage) {
          currentVideo.requestFullscreen();
        } else {
          postContent(getPostInSeries()).content.requestFullscreen();
        }}
      else if (event.altKey) { jump(true) }
      else {
        if (gifsPage) {
          openNextVideo(currentVideo);
          if (currentVideo) closeVideo(currentVideo);
        } else { nextContent() }}
      break;
    default:
      return; // Quit when this doesn't handle the key event.
  }

  // Cancel the default action to avoid it being handled twice
  event.preventDefault();
}, true);


// ASYNC HANDLING//////////////////////


function sleepAsync(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadData(func, callback) {
  while(typeof func !== "function") {
    await sleepAsync(200);
  }
  callback();
}

if (threadPage) {
  while (n_scripts<3) { sleepAsync(120) }

  loadData(maxDigits, function() {reportDigits()});
  if (settingOn('subthreads')) {
    loadData(subthreads, function() {
      subthreads();
    });
  }
  if (settingOn('postDiffHighlight')) {
    loadData(postDiffHighlight, function() {
      postDiffHighlight();
    });
  }
  if (settingOn('runTextTransforms')) transformPostText();
  // Other boards may have threads that contain videos, but there are usually fewer
  if (!gifsPage) {
    if (settingOn('autoExpand')) {
      loadData(expandImages, function() {
        expandImages();
      });
    }
    
    if (settingOn('testSHA1')) {
      verifyContentFreshness();
      setSeenStats();
    }

    if (getBoard() == "pol") {
      loadData(idFlagGraph, function() { reportFlags() });
    }
  }
}

// Defined empty in case of undefined functions
if (!expandImages) var expandImages = function() { }
if (!maxDigits) var maxDigits = function() { }
if (!postDiffHighlight) var postDiffHighlight = function() { }
if (!subthreads) var subthreads = function() { }
if (!idFlagGraph) var idFlagGraph = function() { }
