// INTERACTION /////////

function openImgs(thumbImgs) {
  thumbImgs = thumbImgs || thread.getThumbImgs();
  thumbImgs = thumbImgs.filter( img => ! webmThumbImg(img) );
  for (var i = 0; i < thumbImgs.length; i++) {
    setTimeout(ImageExpansion.toggle(thumbImgs[i]), i*100);
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
    setTimeout(ImageExpansion.toggle(thumbImgs[i]), i*100);
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
  thumbs = checkT(thumbs);
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
  thumbs = checkT(thumbs);
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

function addFilterHash(thumbImg, md5) {
  chrome.runtime.sendMessage(extensionID, {
    action: 'updateContentFilter',
    md5: md5
  });
  var post = getPostFromElement(thumbImg);
  post.remove();
}

function addFilterContentLink(thumbImg, dataMD5) {
  if (!dataMD5) {
    return;
  }

  const fileText = thumbImg?.parentElement?.previousSibling;

  if (!fileText) {
    return;
  }

  const isLinkPresent = fileText.querySelector('#filter-link');

  if (isLinkPresent) {
    console.log(isLinkPresent);
    console.log("Unable to add filter link: fileText element not present or link already added.");
    return;
  }

  var link = document.createElement('a');
  link.textContent = " Filter";
  link.onclick = function(e) {
    addFilterHash(thumbImg, dataMD5);
  };
  link.id = 'filter-link';
  fileText.appendChild(link);
}

function handleUnseenContent(dataMD5) {
  const thumbImg = getElementByDataMD5(dataMD5);
  if (!thumbImg) { return; }

  if (!board.isGif && settingOn('autoExpand')) {
    if (!webmThumbImg(thumbImg)) {
      ImageExpansion.toggle(thumbImg);
    }
  }

  addFilterContentLink(thumbImg, dataMD5);
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

  addFilterContentLink(thumbImg, dataMD5);
  setContentStats();
}

function setIsBotThread(dataId) {
  const thumb = getElementByDataId(dataId);

  if (!thumb) {
    return
  }

  const botThread = getThreadFromElement(thumb)
  botThread.style.borderColor = 'red';
}

if (!n_scripts) var n_scripts = 0;
n_scripts++
