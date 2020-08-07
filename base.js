
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

var openedWebms = [], closedWebmThumbs = [];
var currentContent = -1;
var shiftPressed = false;
var gifsPage = gifsMatch.test(initialLink);
var boardBasePage = boardBaseMatch.test(initialLink);
var catalogPage = catalogMatch.test(initialLink);
var threadPage = threadMatch.test(initialLink);

function setOrderBy(order) {
  orderSetting = '"orderby":"' + order + '"';
  catalogSet = window.localStorage['catalog-settings'] != undefined
  orderSet = catalogSet && window.localStorage['catalog-settings'].includes(orderSetting);
  if (!orderSet) {
    catalogSetting = '{"extended":true,"large":false,' + orderSetting +'}';
    window.localStorage['catalog-settings'] = catalogSetting;
    if (catalogPage) {  window.location.reload() };
  };
};

function setVolume(volume) {
  window.localStorage['volume'] = volume
  getAudioWebms().forEach( webm => webm.volume = volume );
};

function getVolume() {
  return window.localStorage['volume']
};

if (!getVolume()) { // Set initial volume to 50%
  setVolume(0.5);
};

if (boardBasePage || catalogPage) {
  setOrderBy('date')
  if (boardBasePage) { window.location.replace(initialLink + 'catalog') };
};

[].slice.call(document.querySelectorAll('div[class^=ad]'))
  .map( el => el.innerHTML = '' )


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

window.addEventListener('error', function(e) {
  console.log(e);
}, true);

if (threadPage) {
  loadData(maxDigits, function() {
    const digits = maxDigits()
    if (digits) console.log(digits);
  });
};

if (!gifsPage && threadPage) {
  loadData(expandImages, function() {
    expandImages();
    // Other boards may have threads that contain videos, but there are usually fewer
  });
};

// Defined temporarily to be overwritten
var expandImages = function() { };
var maxDigits = function() { };


// General

function checkP(posts) { return posts || getPosts() };
function checkT(thumbs) { return thumbs || getThumbs() };

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
  const postThumbs = getThumbs(post);
  const img = first(getExpandedImgs(postThumbs));
  if (img) return {type: 'img', content: img};

  const thumbImgs = getThumbImgs(postThumbs);
  const isWebm = webmThumbImg(first(thumbImgs));
  if (isWebm) return {type: 'webm', content: thumbImgs}; 
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
function webmThumbImg(thumbImg) {
  return /.webm$/.test(thumbImg.parentElement.href);
};
function getThumbImgs(thumbs, includeHidden) {
  thumbs = checkT(thumbs);
  if (includeHidden) {
    return thumbs.reduce( (imgs, thumb) => (thumb.querySelector('img')
      && imgs.push(thumb.querySelector('img')), imgs), [] );
  } else {
    return thumbs.reduce( (imgs, thumb) => 
      (thumb.style.display === '' && thumb.querySelector('img')
      && imgs.push(thumb.querySelector('img')), imgs), [] );
  };
};
function getExpandedImgs(thumbs) {
  thumbs = checkT(thumbs);
  return thumbs.reduce( (acc, thumb) => {
      var img = thumb.querySelector('.expanded-thumb');
      if (img) { acc.push(img) }; return acc }, []);
};
function getVids(el) {
  el = el || threadElement
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
      video.volume = getVolume();
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
    case "Shift":
      shiftPressed = true
      break;
    case "ArrowLeft":
      var currentVideo = last(openedWebms);
      if (shiftPressed) {
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
      if (shiftPressed) {
        if (gifsPage) {
          currentVideo.requestFullscreen();
        } else {
          postContent(getPostInSeries()).content.requestFullscreen();
        }
        fullScreenRequests++
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

window.addEventListener("keyup", function (event) {
  if (event.defaultPrevented) {
    return; // Do nothing if the event was already processed
  }

  switch (event.key) {
    case "Shift":
      shiftPressed = false;
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



