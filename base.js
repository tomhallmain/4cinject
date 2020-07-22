
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

if (boardBasePage || catalogPage) {
  setOrderBy('date')
  if (boardBasePage) { window.location.replace(initialLink + 'catalog') };
};
if (!gifsPage && threadPage) {
  expandImages();
  // Other boards may have threads that contain videos, but there are usually fewer
};

[].slice.call(document.querySelectorAll('div[class^=ad]'))
  .map( el => el.innerHTML = '' )

if (threadPage) {
  console.log(maxDigits());
};

// General

function checkP(posts) { return posts || getPosts() };
function checkT(thumbs) { return thumbs || getThumbs() };

function getPosts() {
  return [].slice.call(threadElement.querySelectorAll('.post'));
};
function getPostId(post) {
  return post.id.slice(1);
};
function getPostMessage(post) {
  return post.querySelector('.postMessage');
};
function getPostById(id) {
  return threadElement.querySelector('#p' + id);
};
function getOriginalPost() {
  return threadElement.querySelector('.post.op');
};
function getThumbs() {
  return [].slice.call(threadElement.querySelectorAll('.fileThumb'));
};
function getThumbImgs(thumbs) {
  thumbs = checkT(thumbs);
  return getThumbs().reduce( (imgs, thumb) => 
    (thumb.style.display === '' && thumb.querySelector('img')
    && imgs.push(thumb.querySelector('img')), imgs), [] );
};
function getExpandedImgs(thumbs) {
  thumbs = checkT(thumbs);
  return thumbs.reduce( (acc, thumb) => {
      var img = thumb.querySelector('.expanded-thumb');
      if (img) { acc.push(img) }; return acc }, []);
};
function getVids() {
  return [].slice.call(threadElement.querySelectorAll('video'));
};
function getExpandedWebms(thumbs) {
  thumbs = checkT(thumbs);
  // Display style seems to be set to none only in expanded video case
  return thumbs.reduce( (webms, thumb) =>
      (thumb.style.display === 'none' && webms.push(thumb.nextSibling), webms), [] );
};
function getCloseLinks() {
  return [].slice.call(threadElement.querySelectorAll('a')).filter( a => a.textContent === 'Close' );
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


// Observe a specific DOM element:
observeDOM( document.body, function(m) { 
  m.forEach( record => { 
    var added = record.addedNodes[0];
    if (added?.className == 'expandedWebm') {
      var video = added;
      unmute(video)
      video.volume = 0.5;
    } else if (/^ad[a-z]-/.test(added?.parentElement?.className)) {
      added.innerHTML = '';
    };
  });
});


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



