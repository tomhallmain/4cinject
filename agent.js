// Interaction

function openImgs(thumbImgs) {
  thumbImgs = thumbImgs || getThumbImgs();
  thumbImgs = thumbImgs.filter( img => ! webmThumbImg(img) );
  for (var i = 0; i < thumbImgs.length; i++) {
    setTimeout(ImageExpansion.toggle(thumbImgs[i]), i*100);
  };
  const opened = thumbImgs.length
  if (opened > 0) {
    console.log('Opened ' + thumbImgs.length + ' file thumbs');
  } else {
    console.log('Could not find any image thumbs to expand');
  };
};

function openAll(thumbImgs, play) {
  thumbImgs = thumbImgs || getThumbImgs();
  for (var i = 0; i < thumbImgs.length; i++) {
    var thumb = thumbImgs[i].parentElement;
    setTimeout(ImageExpansion.toggle(thumbImgs[i]), i*100);
    if ( webmThumbImg(thumb) ) {
      if (! play === true) thumb.nextSibling.pause();
    };
  };
  console.log('Opened ' + thumbImgs.length + ' file thumbs');
};

function close(imgsExp) {
  // Close videos
  var closeLinks = getCloseLinks();
  for (var i = 0; i < closeLinks.length; i++) { closeLinks[i].click() };
  // Toggle expanded images off
  imgsExp = imgsExp || getExpandedImgs();
  for (var i = 0; i < imgsExp.length; i++) { ImageExpansion.toggle(imgsExp[i]) };
  console.log('Closed ' + closeLinks.length + ' videos and ' + imgsExp.length + ' images');
};

function expandImages(thumbImgs) {
  thumbImgs = thumbImgs || getThumbImgs();
  thumbImgs.length > 0 ? openImgs(thumbImgs) : true;
};

function closeVideo(video) {
  if (video.tagName === "VIDEO") {
    closedWebmThumbs.push(getThumb(video));
    getCloseLink(video).click();
  };
};

function openVideo(videoThumb) {
  closedWebmThumbs = arrayRemove(closedWebmThumbs, videoThumb);
  openAll(getThumbImgs([videoThumb]), true);
};

function openNextVideo(currentVideo) {
  const webmThumbImgs = getThumbImgs(null, true)
    .filter( img => webmThumbImg(img) );
  const currentThumbImg = getThumbImg(getThumb(currentVideo));
  var currentIndex = (currentVideo ? webmThumbImgs.indexOf(currentThumbImg) : -1);
  currentIndex++
  const nextThumbImg = webmThumbImgs[currentIndex] 
  openAll([nextThumbImg], true);
  getPostFromElement(nextThumbImg).scrollIntoView();
};

function openPreviousVideo(currentVideo) {
  const webmThumbImgs = getThumbImgs(null, true)
    .filter( img => webmThumbImg(img) );
  const currentThumbImg = getThumbImg(getThumb(currentVideo));
  var currentIndex = (currentVideo ? webmThumbImgs.indexOf(currentThumbImg) : 1);
  currentIndex--
  const previousThumbImg = webmThumbImgs[currentIndex] 
  openAll([previousThumbImg], true);
  getPostFromElement(previousThumbImg).scrollIntoView();
};

function nextContent(thumbs) {
  thumbs = checkT(thumbs);
  if (thumbs && (currentContent + 1) < thumbs.length) {
    currentContent++
    const thumb = thumbs[currentContent];
    const next = getPostFromElement(thumb);
    const {type, content, expanded} = postContent(next);
    const webm = type == 'webm'
    var nextContent = content
    if (!expanded) {
      if (webm) {
        openVideo(thumb, true);
        nextContent = getVids(next, true);
      } else { // type == 'img'
        ImageExpansion.toggle(content);
        nextContent = first(getExpandedImgs([thumb]));
      };
    };
    if (settingOn('fullscreen')) {
      const v = vh + 50;
      if ((!webm && nextContent.height > v) 
        || (webm && nextContent.videoHeight > v)) {
        nextContent.requestFullscreen();
        //fullScreenRequests++
      } else if (fullscreen()) {
        exitFullscreen();
      };
    };
    next.scrollIntoView();
  } else {
    if (settingOn('fullscreen') && fullscreen()) exitFullscreen();
  };
};

function previousContent(thumbs) {
  thumbs = checkT(thumbs);
  if (thumbs && (currentContent - 1) >= 0) {
    currentContent--
    const thumb = thumbs[currentContent];
    const previous = getPostFromElement(thumb);
    const {type, content, expanded} = postContent(previous);
    const webm = type == 'webm'
    var prevContent = content
    if (!expanded) {
      if (webm) {
        openVideo(thumb, true);
        prevContent = getVids(next, true);
      } else { // type == 'img'
        ImageExpansion.toggle(content);
        prevContent = first(getExpandedImgs([thumb]));
      };
    };
    if (settingOn('fullscreen')) {
      const v = vh + 50;
      if ((!webm && prevContent.height > v) 
        || (webm && prevContent.videoHeight > v) ) {
        prevContent.requestFullscreen();
        //fullScreenRequests++
      } else if (fullscreen()) {
        exitFullscreen();
      };
    };
    previous.scrollIntoView();
  } else {
    if (settingOn('fullscreen') && fullscreen()) exitFullscreen();
  };
};

function mute(video) {
  video.muted = true;
};

function unmute(video) {
  video.muted = false;
};

function exitFullscreen() {
  try { document.exitFullscreen() }
  catch (e) { }; // suppress error
  if (document.fullScreenElement && fullscreen()) {
    exitFullscreen()
  };
};

