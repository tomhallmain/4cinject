// INTERACTION /////////

function openImgs(thumbImgs) {
  thumbImgs = thumbImgs || getThumbImgs();
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
  thumbImgs = thumbImgs || getThumbImgs();
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
  var closeLinks = getCloseLinks();
  for (var i = 0; i < closeLinks.length; i++) { closeLinks[i].click() }
  // Toggle expanded images off
  imgsExp = imgsExp || getExpandedImgs();
  for (var i = 0; i < imgsExp.length; i++) { ImageExpansion.toggle(imgsExp[i]) }
  if (debug) console.log('Closed ' + closeLinks.length + ' videos and ' + imgsExp.length + ' images');
}

function expandImages(thumbImgs) {
  thumbImgs = thumbImgs || getThumbImgs();
  thumbImgs.length > 0 ? openImgs(thumbImgs) : true;
}

function closeVideo(video) {
  if (video.tagName === "VIDEO") {
    closedWebmThumbs.push(getThumb(video));
    getCloseLink(video).click();
  }
}

function openVideo(videoThumb) {
  closedWebmThumbs = arrayRemove(closedWebmThumbs, videoThumb);
  openAll(getThumbImgs([videoThumb]), true);
}

function openNextVideo(currentVideo) {
  const webmThumbImgs = getThumbImgs(null, true)
    .filter( img => webmThumbImg(img) );
  const currentThumbImg = getThumbImg(getThumb(currentVideo));
  var currentIndex = (currentVideo ? webmThumbImgs.indexOf(currentThumbImg) : -1);
  currentIndex++
  const nextThumbImg = webmThumbImgs[currentIndex] 
  openAll([nextThumbImg], true);
  getPostFromElement(nextThumbImg).scrollIntoView();
}

function openPreviousVideo(currentVideo) {
  const webmThumbImgs = getThumbImgs(null, true)
    .filter( img => webmThumbImg(img) );
  const currentThumbImg = getThumbImg(getThumb(currentVideo));
  var currentIndex = (currentVideo ? webmThumbImgs.indexOf(currentThumbImg) : 1);
  currentIndex--
  const previousThumbImg = webmThumbImgs[currentIndex] 
  openAll([previousThumbImg], true);
  getPostFromElement(previousThumbImg).scrollIntoView();
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
        engageContent = getVids(post, true);
      } else { // type == 'img'
        ImageExpansion.toggle(content);
        engageContent = first(getExpandedImgs([thumb]));
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
  if (newPostIds.length == 0) return;
  if ((currentNewPost - 1) >= 0) {
    currentNewPost--
    const post = getPostById(newPostIds[currentNewPost])
    const thumb = post?.querySelector('.fileThumb')
    engagePost(post, thumb)
  }
}

function nextNewPost() {
  if (newPostIds.length == 0) return;
  if ((currentNewPost + 1) < newPostIds.length) {
    currentNewPost++
    const post = getPostById(newPostIds[currentNewPost])
    const thumb = post?.querySelector('.fileThumb')
    engagePost(post, thumb)
  }
}

function nextContent(thumbs) {
  thumbs = checkT(thumbs);
  if (thumbs && (currentContent + 1) < thumbs.length) {
    currentContent++
    const thumb = thumbs[currentContent];
    const next = getPostFromElement(thumb);
    engagePost(next, thumb);
  } else {
    if (settingOn('fullscreen') && fullscreen()) exitFullscreen();
  }
}

function previousContent(thumbs) {
  thumbs = checkT(thumbs);
  if (thumbs && (currentContent - 1) >= 0) {
    currentContent--
    const thumb = thumbs[currentContent];
    const previous = getPostFromElement(thumb);
    engagePost(previous, thumb);
  } else {
    if (settingOn('fullscreen') && fullscreen()) exitFullscreen();
  }
}

function jump(forward) {
  var base = basePost(currentPost());
  var searching = true
  var jumpPost = null
  while (!jumpPost || searching) {
    var jumpBase = forward ? nextPost(base) : previousPost(base);
    if (jumpBase) {
      var thumb = first(getThumbs(postContainer(jumpBase)));
      if (thumb) {
        jumpPost = getPostFromElement(thumb);
        currentContent = getThumbs().indexOf(thumb);
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

function setIsSeenContent(dataId) {
  numSeenContentItems++;
  thumb = getElementByDataMD5(dataId);

  if (!thumb) {
    return;
  }

  /*
  if (thumb.nextSibling) {
    contentClass = thumb.nextSibling.className;
    if (contentClass == "expanded-thumb") {
      close([thumb.nextSibling]);
    }
    else if (contentClass == "expandedWebm") {
      closeVideo(thumb.nextSibling);
    }
  }
  */

  const stalePost = getPostFromElement(thumb);
  stalePost.style.borderColor = 'red';
  
  if (gifsPage) {
    setSeenStats();
  }
}

if (!n_scripts) var n_scripts = 0;
n_scripts++
