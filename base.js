
// Setup

if (activeStyleSheet !== 'Tomorrow') {
  setActiveStyleSheet('Tomorrow');
};

const initialLink = window.location.href;
const threadElement = document.querySelector('.thread');
const threadId = threadElement?.id
const quoteLinks = threadElement?.querySelector('.quoteLink');

const gifsMatch = /4chan.org\/gif/;
const boardBaseMatch = /4chan(nel)?.org\/[a-z]+\/$/
const catalogMatch = /4chan(nel)?.org\/[a-z]+\/catalog$/
const threadMatch = /boards.4chan(nel)?.org\/[a-z]+\/thread\//

var openedWebms = [], closedWebmThumbs = []; fullScreen = true
var currentContent = -1; //, fullScreenRequests = 0;
var gifsPage = gifsMatch.test(initialLink);
var boardBasePage = boardBaseMatch.test(initialLink);
var catalogPage = catalogMatch.test(initialLink);
var threadPage = threadMatch.test(initialLink);

function local(storageKey, toVal) {
  if (toVal) {
    window.localStorage[storageKey] = toVal
  } else {
    return window.localStorage[storageKey];
  }
};
function settingOn(storageKey, checkVal) {
  if (checkVal) {
    return local(storageKey) === checkVal;
  } else {
    return local(storageKey) === "true";
  }
};
function setOrderBy(order) {
  orderSetting = '"orderby":"' + order + '"';
  catalogSettings = local('catalog-settings');
  catalogSet = catalogSettings != undefined
  orderSet = catalogSet && catalogSettings.includes(orderSetting);
  if (!orderSet) {
    catalogSettings = '{"extended":true,"large":false,' + orderSetting +'}';
    local('catalog-settings', catalogSettings);
    if (catalogPage) {  window.location.reload() };
  };
};
function toggleFullscreen() {
  local('fullscreen', !settingOn('fullscreen'));
};
function fullscreen() {
  return document.fullscreen;
}
function setVolume(volume) {
  local('volume', volume);
  getAudioWebms().forEach( webm => webm.volume = volume );
};
function toggleSubthreads() {
  const stOn = settingOn('subthreads');
  local('subthreads', !stOn);
  if (!threadPage) return;
  if (!stOn) {
    subthreads();
  } else {
    window.location.reload();
  };
};
function toggleFilter() {
  const cfOn = settingOn('catalogFilter');
  local('catalogFilter', !cfOn);
  if (!catalogPage) return;
  if (!cfOn) {
    catalogFilter();
  } else {
    window.location.reload();
  };
};

if (local('fullscreen') === undefined) local('fullscreen', 'true');
if (local('subthreads') === undefined) local('subthreads', 'false');
if (local('catalogFilter') === undefined) local('catalogFilter', 'true');
if (!local('volume')) { // Set initial volume to 50%
  setVolume(0.5);
};

if (boardBasePage || catalogPage) {
  setOrderBy('r')
  if (boardBasePage) { window.location.replace(initialLink + 'catalog') };
};
if (catalogPage) {
  if (settingOn('catalogFilter')) catalogFilter();
};
function catalogFilter() {
  const threads = getThreads();
  threads.map( t => {
    if (gay(t)) {
      t.remove();
    } else if (challengeThread(t)) {
      t.style.backgroundColor = 'teal';
    } else if (contentThread(t)) {
      t.style.backgroundColor = 'green';
    };
  });
};

[].slice.call(document.querySelectorAll('div[class^=ad]'))
  .map( el => el.innerHTML = '' )

window.addEventListener('error', function(e) {
  console.log(e);
}, true);

function sleepAsync(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function loadData(func, callback) {
  //const name = (eval("" funct ""))
  while(typeof func !== "function") {
    await sleepAsync(400);
  };
  callback();
};

if (threadPage) {
  loadData(maxDigits, function() {
    const digits = maxDigits()
    if (digits) console.log(digits);
  });
  loadData(subthreads, function() {
    if (settingOn('subthreads')) subthreads();
  });
};
if (!gifsPage && threadPage) {
  loadData(expandImages, function() {
    expandImages();
    // Other boards may have threads that contain videos, but there are usually fewer
  });
};

// Defined temporarily to be overwritten
if (!expandImages) var expandImages = function() { };
if (!maxDigits) var maxDigits = function() { };
if (!subthreads) var subthreads = function() { };

// General

function checkP(posts) { return posts || getPosts() };
function checkT(thumbs) { return thumbs || getThumbs() };

function getThreads() {
  return [].slice.call(document.querySelectorAll('.thread'));
};
function getPosts() {
  return [].slice.call(threadElement.querySelectorAll('.post'));
};
function getPostFromElement(el) {
  return el.closest('.post');
};
function nextPost(post) {
  if (post) {
    return post.parentElement.nextSibling.querySelector('.post');
  } else {
    return getOriginalPost();
  };
};
function previousPost(post) {
  if (post) {
    return post.parentElement.previousSibling.querySelector('.post');
  } else {
    return getOriginalPost();
  };
};
function getPostId(post) {
  return post.id.slice(1);
};
function getPostMessage(post) {
  return post.querySelector('.postMessage');
};
function postContent(post) {
  const thumb = first(getThumbs(post));
  const expanded = thumbHidden(thumb);
  const thumbImg = getThumbImg(thumb);
  const type = (webmThumbImg(thumbImg) ? 'webm' : 'img');
  const content = (expanded && type == 'img' ? first(getExpandedImgs([thumb]))
    : expanded ? getVids(post, true) : thumbImg);
  return {type: type, content: content, expanded: expanded};
};
function getPostById(id) {
  return threadElement.querySelector('#p' + id);
};
function getOriginalPost() {
  return threadElement.querySelector('.post.op');
};
function getPostInSeries(series, index) {
  if (series == 'thumbs' || series === undefined) {
    const thumbs = getThumbs();
    index = index || currentContent;
    return getPostFromElement(thumbs[index])
  };
};
function getThumbs(el) {
  el = el || threadElement;
  return [].slice.call(el.querySelectorAll('.fileThumb'));
};
function getThumb(video) {
  return video.previousSibling;
};
function getThumbImg(thumb) {
  return thumb.querySelector('img');
};
function thumbHidden(thumb) {
  if (thumb && thumb.style.display === 'none') {
    return true;
  } else { 
    return getThumbImg(thumb)?.style.display === 'none';
  }
};
function webmThumbImg(thumbImg) {
  return /.webm$/.test(thumbImg.parentElement.href);
};
function getThumbImgs(thumbs, includeHidden) {
  thumbs = checkT(thumbs);
  if (includeHidden) {
    return thumbs.reduce( (imgs, thumb) => 
     (getThumbImg(thumb) && imgs.push(getThumbImg(thumb)), imgs), [] );
  } else {
    return thumbs.reduce( (imgs, thumb) => (thumb.style.display === ''
      && getThumbImg(thumb) && imgs.push(getThumbImg(thumb)), imgs), [] );
  };
};
function getExpandedImgs(thumbs) {
  thumbs = checkT(thumbs);
  return thumbs.reduce( (acc, thumb) => {
      var img = thumb.querySelector('.expanded-thumb');
      if (img) { acc.push(img) }; return acc }, []);
};
function getVids(el, first) {
  el = el || threadElement
  if (first) return el.querySelector('video');
  return [].slice.call(el.querySelectorAll('video'));
};
function getExpandedWebms(thumbs) {
  thumbs = checkT(thumbs);
  // Display style seems to be set to none only in expanded video case
  return thumbs.reduce( (webms, thumb) =>
      (thumb.style.display === 'none' && webms.push(thumb.nextSibling), webms), [] );
};
function getCloseLinks() {
  return [].slice.call(threadElement.querySelectorAll('a'))
           .filter( a => a.textContent === 'Close' );
};
function getCloseLink(video) {
  return [].slice.call(video.parentElement.querySelectorAll('a'))
           .filter( link => link.textContent == "Close" )[0];
};
function getQuoteLinks(post) {
  return [].slice.call(getPostMessage(post)?.querySelectorAll('.quotelink'))
    .map( tag => parseInt(tag.hash?.slice(2)) );
};
function getBacklinks(post) {
  var backlinkElement = post.querySelector('.backlink')
  if (backlinkElement) {
    return [].slice.call(backlinkElement.querySelectorAll('.quotelink'))
      .map( tag => parseInt(tag.hash.slice(2)) );
  } else { return [] };
};
function hasAudio(videoElement) {
  return videoElement.audioTracks.length > 0;
};
function getAudioWebms() {
  return getExpandedWebms().filter( webm => hasAudio(webm) );
};
function threadMeta(thread) { 
  const data = [].slice.call(thread.querySelector('.meta').querySelectorAll('b'))
    .map(b => parseInt(b.textContent)); 
  return {replies: data[0], imgs: data[1]}
};
function contentThread(thread) {
  const meta = threadMeta(thread);
  return meta.imgs > 9 && (meta.imgs >= 50 || (meta.imgs / meta.replies) > 0.6)
};
function gay(thread) {
  const gay = /( ?[Gg]ay| ?[Dd]oll| ?[Gg]lue| ?[Tt]rann| ?[Cc]ock| ?[Dd]ick| ?[Bb]o[iy][ \/s]|hemale|"male"|[ \/]?[Ff]ur|[Ll]oli|(^| )?[Ss]hota( |$)| ?[Ww]aifu| ?[Jj][Aa][Vv] ?|[Ss]issy)/
  return gay.test(thread.textContent)
}
function challengeThread(thread) {
  const ylylMatch = /(y[gl]yl|Y[GL]YL|u lose)/
  return ylylMatch.test(thread.textContent)
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


observeDOM( document.body, function(m) { 
  m.forEach( record => { 
    var added = record.addedNodes[0];
    if (added?.className == 'expandedWebm') {
      var video = added;
      unmute(video)
      video.volume = local('volume');
      openedWebms.push(video);
    } else if (/^ad[a-z]-/.test(added?.parentElement?.className)) {
      added.innerHTML = '';
    };

    var removed = record.removedNodes[0];
    if (removed?.className == 'expandedWebm') {
      var video = removed;
      openedWebms = arrayRemove(openedWebms, video);
    };
  });
});

window.addEventListener("keydown", function (event) {
  if (event.defaultPrevented) {
    return; // Do nothing if the event was already processed
  };

  switch (event.key) {
    case "ArrowLeft":
      var currentVideo = last(openedWebms);
      if (event.shiftKey) {
        if (gifsPage) {
          closeVideo(currentVideo);
        } else {
          exitFullscreen();
        };
      } else {
        if (gifsPage) {
          openPreviousVideo(currentVideo);
          if (currentVideo) closeVideo(currentVideo);
        } else {
          previousContent();
        };
      };
      break;
    case "ArrowRight":
      var currentVideo = last(openedWebms);
      if (event.shiftKey) {
        if (gifsPage) {
          currentVideo.requestFullscreen();
        } else {
          postContent(getPostInSeries()).content.requestFullscreen();
        }
        //fullScreenRequests++
      } else {
        if (gifsPage) {
          openNextVideo(currentVideo);
          if (currentVideo) closeVideo(currentVideo);
        } else {
          nextContent()
        }
      }
      break;
    default:
      return; // Quit when this doesn't handle the key event.
  };

  // Cancel the default action to avoid it being handled twice
  event.preventDefault();
}, true);


//////////////////////

function customObserver(target, config, callback) {
  this.target = target || document;
  this.config = config || {childList:true, subtree:true};
  var that = this;
  this.ob = new MutationObserver( function(mut, observer) {
    callback.call(that, mut, observer);
  });
};

customObserver.prototype={
  connect: function() {
    this.ob.observe(this.target, this.config);
  },
  disconnect: function() { this.ob.disconnect() }
};



