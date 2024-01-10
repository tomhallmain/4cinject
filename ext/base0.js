
// Classes and methods are defined here to be accessible in the content script
// context, but these will not have access to in-page JS objects and methods.


// INTERACTION /////////

function openImgs() {
  if (!settingOn('autoExpand')) {
    local('autoExpand', 'true');
  }

  window.location.reload();
}

function close() {
  if (settingOn('autoExpand')) {
    local('autoExpand', 'false');
  }

  window.location.reload();
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

function addFilterThreadLink(threadId) {
  const threadObj = getThread(threadId);
  if (!threadObj || !threadObj.element) {
    console.log("Unable to add filter link: invalid thread object.");
    return;
  }

  const isLinkPresent = threadObj.element.querySelector('#filter-link');
  if (isLinkPresent) {
    return;
  }

  var link = document.createElement('a');
  link.textContent = " Filter";
  link.onclick = function(e) {
    addFilterThread(threadId);
  };
  link.id = 'filter-link';
  threadObj.element.appendChild(link);
}

function setIsBotThread(threadId) {
  const threadObj = getThread(threadId);
  if (threadObj) {
    threadObj.element.style.borderColor = 'red';
  }
}

function filterThreadById(threadId) {
  const threadObj = getThread(threadId);
  if (threadObj) {
    threadObj.element.remove();
  } else {
    console.log("Failed to filter thread " + threadId);
  }
}

function addFilterThread(threadId) {
  const threadObj = getThread(threadId);
  if (!threadObj) {
    console.log("Failed to add filter thread " + threadId);
    return;
  }

  const thumb = getThumbImg(t.element);

  chrome.runtime.sendMessage(getExtensionId(), {
    action: 'filterThread',
    url: thumb?.src,
    teaser: threadObj.getTeaserText()
  });

  try {
    threadObj.element.remove();
  } catch (e) {
    console.error(e);
  }
}

function addFilterHash(thumbImg, md5) {
  chrome.runtime.sendMessage(getExtensionId(), {
    action: 'updateContentFilter',
    md5: md5
  });

  try {
    var post = getPostFromElement(thumbImg);
    post.remove();
  } catch (e) {
    console.error(e);
  }
}

function addFilterHashForAllRelatedContent(basePost) {
  links = basePost.querySelectorAll('#filter-link');
  for (i = links.length - 1; i >= 0; i--) {
    try {
      links[i].click();
    } catch (e) {
      console.error(e);
    }
  }
}

function downloadImages(basePost, thumbImg) {
  var thumbs = thread.getThumbs(postContainer(basePost));
  var imgUrls = [];

  for (i = 0; i < thumbs.length; i++) {
    imgUrls.push(thumbs[i].href);
  }

  chrome.runtime.sendMessage(getExtensionId(), {
    action: 'downloadImages',
    urls: imgUrls
  });
}

function addContentLinks(thumbImg, dataMD5) {
  if (!dataMD5) {
    return;
  }

  const fileText = thumbImg?.parentElement?.previousSibling;

  if (!fileText) {
    console.log("Unable to add filter link: fileText element not present.");
    return;
  }

  const isLinkPresent = fileText.querySelector('#filter-link');

  if (isLinkPresent) {
    console.log("Unable to add filter link: link already added.");
    return;
  }

  var link = document.createElement('a');
  link.textContent = " Filter";
  link.onclick = function(e) {
    addFilterHash(thumbImg, dataMD5);
  };
  link.id = 'filter-link';
  fileText.appendChild(link);

  const thisPost = fileText.parentElement?.parentElement;

  if (thisPost && thisPost === basePost(thisPost)) {
    var link = document.createElement('a');
    link.textContent = " Filter All";
    link.onclick = function(e) {
      addFilterHashForAllRelatedContent(thisPost);
    };
    link.id = 'filter-link-2';
    fileText.appendChild(link);

    link = document.createElement('a');
    link.textContent = " Download All";
    link.onclick = function(e) {
      downloadImages(thisPost);
    };
    link.id = 'download-link';
    fileText.appendChild(link);
  }
}

function handleUnseenContent(dataMD5) {
  const thumbImg = getElementByDataMD5(dataMD5);
  if (!thumbImg) { return; }

  // if (!board.isGif && settingOn('autoExpand')) {
  //   if (!webmThumbImg(thumbImg)) {
  //     ImageExpansion.toggle(thumbImg);
  //   }
  // }

  addContentLinks(thumbImg, dataMD5);
}

function handleFilteredContent(dataMD5) {
  const thumb = getElementByDataMD5(dataMD5);
  if (thumb) {
    var post = getPostFromElement(thumb);
    post.remove();
  }
}

function setIsSeenContent(dataMD5, isMatchStored) {
  thread.numSeenContentItems++;
  const thumbImg = getElementByDataMD5(dataMD5);

  if (!thumbImg) {
    return;
  }

  const stalePost = getPostFromElement(thumbImg);

  if (isMatchStored) {
    stalePost.style.borderColor = 'red';
  }
  else {
    stalePost.style.borderColor = 'orange';
  }

  addContentLinks(thumbImg, dataMD5);
  setContentStats();
}

if (!n_scripts) var n_scripts = 0;
n_scripts++



// REPORTING /////////

function threadGraph(posts, includeNoRef) {
  posts = thread.checkP(posts)
  var graph = {}
  posts.map( post => {
    var pBacklinks = getBacklinks(post)
    if (includeNoRef || pBacklinks.length > 0) {
      graph[getPostId(post)] = [getQuoteLinks(post), pBacklinks]
    }
  })
  return graph
}

function subthreads() {
  const graph = threadGraph(null, false)
  var postIds = Object.keys(graph)
  opId = getPostId(thread.getOriginalPost())
  var counts = {}
  for (var postId of postIds) {
    if (postId == opId) continue;
    var post = thread.getPostById(postId)
    var [pLinks, pBacklinks] = graph[postId]
    for (var blPostId of pBacklinks) {
      if (blPostId == opId) {
        continue;
      }
      var blPost = thread.getPostById(blPostId)
      var count = counts[blPostId]
      if (count) {
        var blPostCopy = blPost.cloneNode()
        blPostCopy.style.borderColor = 'gray'
        blPostCopy.id = blPostId + "-" + count
        updateIdsNames(blPostCopy.getElementsByTagName("*"), new RegExp(blPostId), count)
        post.appendChild(blPostCopy)
        counts[blPostId]++
      } else {
        var blPostContainer = blPost.parentElement
        blPost.style.borderColor = 'gray'
        post.appendChild(blPost)
        blPostContainer.remove()
        counts[blPostId] = 1
      }
    }
  }
  const graphRedrawn = true;
}

function numbersGraph() {
  var postIds = thread.getPostIds();
  if (!postIds || !postIds[0]) {
    return;
  }
  var graph = {};
  const postLength = postIds[0].length; // Assuming all posts IDs will have same length
  postIds.map( postId => {
    count = 1;
    var numbers = postId.split('').reverse()
    for (var i=1; i < postLength; i++) {
      if (numbers[i] === numbers[i-1]) {
        count++;
      } else { break }
    }
    if (count > 1) {
      (graph[count] = graph[count] || []).push([postId])
    }
  })
  return graph;
}

function maxDigits() {
  var graph = numbersGraph()
  if (!empty(graph)) {
    var maxDigits = Math.max(...Object.keys(graph))
    var maxDigitPosts = graph[maxDigits]
    return [maxDigits, maxDigitPosts]
  } else {
    return 'No worthwhile digits found'
  }
}

function attachToHeader(element) {
  const nld = document.querySelector('.navLinks.desktop')
  insertAfter(nld, element)
}

function reportDigits() {
  const digits = maxDigits()
  var digitsReporter = document.createElement('div')
  digitsReporter.className = 'digits desktop'

  if (typeof(digits) == 'string') {
    digitsReporter.textContent = digits
  }
  else {
    var nDigits = document.createElement('h3')
    nDigits.textContent = 'Max digits: ' + digits[0]
    digitsReporter.appendChild(nDigits)
    digits[1].forEach( pid => {
      var link = document.createElement('a')
      link.href = initialLink + '#p' + pid
      link.textContent = pid + ' '
      digitsReporter.appendChild(link)
    })
  }

  attachToHeader(digitsReporter)
}

function getFlagsForPosters(posterId, posts) {
  posts = thread.checkP(posts)
  var uniqueFlags = {}
  var posterFlags = {}

  for (var i = 0; i < posts.length; i++) {
    post = posts[i]
    posterId = getPosterId(post)
    const thisFlag = getFlag(post)

    if (posterId == null || thisFlag == null) {
      continue
    }

    flags = posterFlags[posterId] || {}

    if (flags[thisFlag]) {
      flags[thisFlag] += 1
    }
    else {
      flags[thisFlag] = 1
    }

    if (!uniqueFlags[thisFlag]) {
      uniqueFlags[thisFlag] = []
    }

    uniqueFlags[thisFlag].push(posterId)
    posterFlags[posterId] = flags
  }

  return [uniqueFlags, posterFlags]
}

function idFlagGraph(posts) {
  posts = thread.checkP(posts)
  var flagsData = getFlagsForPosters(null, posts)

  var uniqueFlags = flagsData[0]
  var items = Object.keys(uniqueFlags).map(function(key) {
    return [key, uniqueFlags[key]]
  })
  items.sort(function(first, second) {
    return Object.keys(second[1]).length - Object.keys(first[1]).length
  })

  var uniqueFlagsSorted = {}

  for (var item of items) {
    uniqueFlagsSorted[item[0]] = item[1]
  }

  var posterFlags = flagsData[1]
  items = Object.keys(posterFlags).map(function(key) {
    return [key, posterFlags[key]]
  })
  items.sort(function(first, second) {
    flags1 = Object.keys(first[1]).length
    flags2 = Object.keys(second[1]).length
    if (flags1 != flags2) {
      return flags2 - flags1
    }
    totalPosts1 = Object.values(first[1]).reduce((sum, value) =>
      (sum + value, sum), 0)
    totalPosts2 = Object.values(second[1]).reduce((sum, value) =>
      (sum + value, sum), 0)
    return totalPosts2 - totalPosts1
  })

  var posterDetailsSorted = {}
  var flagSwitchers = []

  for (var item of items) {
    const posterId = item[0]
    const flags = item[1]
    const firstPost = thread.getPostsByPosterId(posterId, posts)[0]
    const postId = getPostId(firstPost)
    const details = { flags: flags, postId: postId, id: posterId }
    if (flags && Object.keys(flags)?.length > 1) {
      flagSwitchers.push(details)
    }
    posterDetailsSorted[posterId] = details
  }

  return [uniqueFlagsSorted, posterDetailsSorted, flagSwitchers, posts.length]
}

function makeOpDetailsElement(nAllPosts) {
  var opDetails = document.createElement('h3')
  const nOpPosts = thread.getPostsByOP().length

  if (!nAllPosts) {
    nAllPosts = thread.getPosts().length
  }

  if (nOpPosts == 1 && nAllPosts > 10) {
    opDetails.textContent = 'Posts by OP: ' + nOpPosts + ' (BOT THREAD)'
    opDetails.style.color = 'red'
  }
  else if (nOpPosts < 2 || nOpPosts / nAllPosts <= 0.025) {
    opDetails.textContent = 'Posts by OP: ' + nOpPosts + ' (WARNING - LOW)'
    opDetails.style.color = 'darkorange'
  }
  else {
    opDetails.textContent = 'Posts by OP: ' + nOpPosts
  }

  return opDetails
}

function reportFlags() {
  const idFlags = idFlagGraph()
  var idFlagReporter = document.createElement('div')
  idFlagReporter.className = 'flags desktop'
  const opDetails = makeOpDetailsElement(idFlags[3])
  idFlagReporter.appendChild(opDetails)
  var header = document.createElement('h3')
  const flagPosters = idFlags[0]
  const posterDetails = idFlags[1]
  const flagSwitchers = idFlags[2]

  const uniqueFlagsString = Object.keys(flagPosters)
      .map(key => key + " (" + flagPosters[key].length + ")")
      .join(", ")
  header.textContent = 'Total flags: ' + Object.keys(flagPosters).length + ' - ' + uniqueFlagsString
  idFlagReporter.appendChild(header)

  if (flagSwitchers.length > 0) {
    h4 = document.createElement('h4')
    h4.textContent = "Flag switchers found:"
    idFlagReporter.appendChild(h4)

    for (var details of flagSwitchers) {
      div = document.createElement('div')
      link = document.createElement('a')
      link.href = initialLink + '#p' + details.postId
      link.textContent = details.id
      div.appendChild(link)
      p = document.createElement('p')
      p.textContent = Object.keys(details.flags).join(' ')
      div.appendChild(p)
      idFlagReporter.appendChild(div)
    }
  }

  var unhideFlagPostersLink = document.createElement('a')
  unhideFlagPostersLink.onclick = function() {
      var flagPostersDiv = document.querySelector("[class*='flag-posters-details']")

      if (flagPostersDiv.className.includes('mobile')) {
        flagPostersDiv.className = 'flag-posters-details '
      }
      else {
        flagPostersDiv.className = 'flag-posters-details mobile'
      }
    }
  unhideFlagPostersLink.textContent = 'Toggle flag poster details'
  idFlagReporter.appendChild(unhideFlagPostersLink)
  var flagPostersDiv = document.createElement('div')
  flagPostersDiv.className = 'flag-posters-details mobile'

  for (var flag in flagPosters) {
    var div = document.createElement('div')
    var flagDiv = document.createElement('div')
    flagDiv.textContent = flag + ': '
    div.appendChild(flagDiv)

    for (var posterId of flagPosters[flag]) {
      const details = posterDetails[posterId]
      var link = document.createElement('a')
      link.href = initialLink + '#p' + details.postId
      link.textContent = details.id + '  '
      div.appendChild(link)
    }

    flagPostersDiv.appendChild(div)
  }

  idFlagReporter.appendChild(flagPostersDiv)
  attachToHeader(idFlagReporter)
}

function reportOpPosts() {
  var idFlagReporter = document.createElement('div')
  idFlagReporter.className = 'flags desktop'
  const opDetails = makeOpDetailsElement()
  idFlagReporter.appendChild(opDetails)
  attachToHeader(idFlagReporter)
}

function reportNPosts() {
  var ids = {}

  for (post of thread.getPosts()) {
    const posterId = getPosterId(post);
    if (!posterId) continue;

    if (posterId in ids) {
      ids[posterId]++;
    }
    else {
      ids[posterId] = 1;
    }
  }

  for (post of thread.getPosts()) {
    const infoDesktop = post?.querySelector('.postInfo.desktop');
    if (!infoDesktop) continue;
    const idEl = infoDesktop.querySelector('[class*="posteruid"]');
    if (!idEl) continue;
    const posterId = getPosterId(post);
    if (!posterId) continue;
    var nPostsTag = document.createElement('span');
    nPostsTag.className = 'npoststag ' + posterId;
    const postsCount = ids[posterId]

    if (postsCount == 1) {
      nPostsTag.textContent = ' 1 post';
    }
    else {
      nPostsTag.textContent = ' ' + postsCount + ' posts';
    }

    insertAfter(idEl, nPostsTag);
  }
}

function setContentStats() {
  const proportionSeen = thread.getProportionSeenContent();

  if (proportionSeen <= 0) {
    return;
  }

  const proportionString = (Math.round(proportionSeen * 1000) / 10) + "%"
  var seenReporter = document.querySelector('.seenContent.desktop');
  var seenTitle;
  var append = false;

  if (!seenReporter) {
    append = true;
    seenReporter = document.createElement('div');
    seenReporter.className = 'seenContent desktop';
    seenTitle = document.createElement('h3');
  }
  else {
    seenTitle = seenReporter.querySelector('h3');
  }

  seenTitle.textContent = 'Seen content ratio: ' + proportionString;

  if (append) {
    seenReporter.appendChild(seenTitle);
    const nld = document.querySelector('.navLinks.desktop');
    insertAfter(nld, seenReporter);
  }
}

// TODO fix this or get rid of the option
function contentExtract() {
  openAll();
  var imageContent = getExpandedImgs();
  var vids = getVids();
  thread.element.innerHTML = '';
  imageContent.map( img => thread.element.append(img) );
  vids.map( vid => thread.element.append(vid) );
  const graphRedrawn = true
}

function postDiffHighlight() {
  chrome.runtime.sendMessage(getExtensionId(), {
    action: 'findNewPostIDsForThread',
    url: initialLink,
    postIds: thread.getPostIds()
  });
}

function highlightNewPosts(_newPostIds) {
  thread.newPostIds = _newPostIds || [];
  if (thread.newPostIds && thread.newPostIds.length > 0) {
    for (postId of thread.newPostIds) {
      post = thread.getPostById(postId);
      post.style.backgroundColor = '#3f4b63';
    }
  }
}

if (!n_scripts) var n_scripts = 0;
n_scripts++



// SETUP ////////////


class Board0 {
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

class Post0 {
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

class Thread4C0 {
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
      throw new Error('No url or element provided to Thread4C0 constructor');
    }
  }

  getTeaser() {
    return this.element.querySelector('.teaser');
  }

  getTeaserText() {
    return this.getTeaser()?.textContent;
  }

  setBackgroundColor(color) {
    this.element.style.backgroundColor = color;
  }

  getPosts() {
    return this.element ? [].slice.call(this.element.querySelectorAll('.post')) : [];
  }

  checkP(posts) { return posts || this.getPosts() }

  getPostIds() {
    if (this.postIds.length == 0) {
      this.postIds = this.getPosts()
          .filter(post => post && true)
          .map( post => getPostId(post) );
    }

    return this.postIds;
  }

  getOriginalPost() {
    return this.element?.querySelector('.post.op');
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
    return el ? [].slice.call(el.querySelectorAll('.fileThumb')) : [];
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

  verifyContentFreshness() {
    const thumbs = this.getThumbs();
    for (var i = 0; i < thumbs.length; i++) {
      const thumb = thumbs[i];
      const link = thumb.href;
      const dataMD5 = thumb.querySelector("img").getAttribute('data-md5');
      chrome.runtime.sendMessage(getExtensionId(), {
        action: 'testMD5', url: link, dataId: dataMD5
      });
    }
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

const initialLink = window.location.href.replaceAll(/#.+/g, '');
const board = new Board0(initialLink);
const boardBaseMatch = /4chan(nel)?.org\/[a-z]+\/$/
const catalogMatch = /4chan(nel)?.org\/[a-z]+\/catalog$/
const threadMatch = /boards.4chan(nel)?.org\/[a-z]+\/thread\//

var boardBasePage = boardBaseMatch.test(initialLink);
var catalogPage = !boardBasePage && catalogMatch.test(initialLink);
var threadPage = !boardBasePage && !catalogPage && threadMatch.test(initialLink);

const thread = threadPage ? new Thread4C0(initialLink) : null;
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

function toggleFullscreen() {
  local('fullscreen', !settingOn('fullscreen'));
}

function fullscreen() {
  return document.fullscreen;
}

function setVolume(volume) {
  local('volume', volume);
  thread?.getAudioWebms().forEach( webm => webm.volume = volume );
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

function toggleTestHash() {
  const wasOn = settingOn('testHash');
  local('testHash', !wasOn);
  if (!threadPage) return;
  if (!wasOn) {
    verifyContentFreshness();
  }
}

function toggleAutoExpand() {
  const wasOn = settingOn('autoExpand');
  local('autoExpand', !wasOn);
  if (!threadPage) return;
  if (!wasOn) {
    openImgs();
  } else {
    close();
  }
}

function toggleFilter() {
  const wasOn = settingOn('catalogFilter');
  local('catalogFilter', !wasOn);
  if (!catalogPage) return;
  if (!wasOn) {
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
  for (var i = 0; i < threads.length; i++) {
    const t = threads[i];
    if (filterPattern?.test(t.element.textContent)) {
      console.log("Removing thread " + t.element.textContent);
      t.element.remove();
    }
//    else if (board.isWorkSafe) {
//      continue;
//    }
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

function testThreads() {
  const threads = getThreads()
  for (t of threads) {
    const thumb = getThumbImg(t.element);
    if (t.id && thumb) {
      chrome.runtime.sendMessage(getExtensionId(), {
        action: 'testThread',
        url: thumb.src,
        dataId: thumb.getAttribute('data-id'),
        threadId: t.id,
        teaser: t.getTeaserText()
      })
    }
  }
}


// GENERAL ////////////

function getThreads() {
  if (!threads) {
    threads = [].slice.call(document.querySelectorAll('.thread'))
        .map(threadEl => new Thread4C0(null, threadEl));
  }

  return threads
}

function getThread(threadId) {
  const threads = getThreads();

  for (let t of threads) {
    if (t?.id === threadId) {
      return t;
    }
  }

  return null;
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
  return post?.id.slice(1);
}

function getPostMessage(post) {
  return post.querySelector('.postMessage');
}

function postContent(post, thumb) {
  if (!thumb) {
    thumb = post.querySelector('.fileThumb')
  }
  if (thumb) {
    const expanded = thumbHidden(thumb);
    const thumbImg = getThumbImg(thumb);
    const type = thumbImg ? (webmThumbImg(thumbImg) ? 'webm' : 'img') : null;
    const content = thumbImg ? (expanded && type == 'img' ?
        first(thread.getExpandedImgs([thumb])) : expanded ?
          thread.getVids(post, true) : thumbImg) : false;
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



// ASYNC HANDLING//////////////////////


function sleepAsync(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadData(func, callback) {
  var count = 0;
  while(typeof func !== "function") {
    count++;
    await sleepAsync(200);

    if (count > 10) {
      break;
    }
  }
  callback();
}


// TODO maybe move these local storage handling methods to init content script
setDefault('autoExpand', 'false');
setDefault('fullscreen', 'false');
setDefault('subthreads', 'true');
setDefault('catalogFilter', 'true');
setDefault('testHash', 'true');
setDefault('postDiffHighlight', 'true');

if (!local('volume')) setVolume(0.5); // Set initial volume to 50%

if (boardBasePage || catalogPage) {
  setOrderBy('date');
  if (boardBasePage) { window.location.replace(initialLink + 'catalog'); }
}
if (catalogPage) {
  if (settingOn('catalogFilter')) catalogFilter();
  if (settingOn('runTextTransforms')) transformTeaserTexts();
  if (settingOn('testHash')) testThreads();
}

[].slice.call(document.querySelectorAll('div[class^=ad]'))
  .map( el => el.innerHTML = '' );


if (threadPage) {
  while (n_scripts<3) { sleepAsync(120); }

  try {
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
    if (settingOn('testHash')) {
      thread.verifyContentFreshness();
      setContentStats();
    }

    if (board.name === "pol") {
      loadData(idFlagGraph, function() { reportFlags() });
      loadData(reportNPosts, function() { reportNPosts() });
    }
    else if (board.name === "biz") {
      loadData(reportOpPosts, function() { reportOpPosts() });
      loadData(reportNPosts, function() { reportNPosts() });
    }
  } catch (e) {
    // if the page is not found, we can expect an error
    console.log(e.message);
  }
}

// Defined empty in case of undefined functions
if (!expandImages) var expandImages = function() { }
if (!maxDigits) var maxDigits = function() { }
if (!postDiffHighlight) var postDiffHighlight = function() { }
if (!subthreads) var subthreads = function() { }
if (!idFlagGraph) var idFlagGraph = function() { }
