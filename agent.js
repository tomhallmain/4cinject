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
    const next = getPostFromElement(thumbs[currentContent]);
    const {type, content} = postContent(next);
    var nextContent = content
    if (type == 'webm') {
      if (empty(getVids(next))) {
        openAll(nextContent, true);
      };
      nextContent = getVids(next);
    };
    if ((type == 'img' && nextContent.height > vh + 50) 
        || (type == 'webm' && nextContent.videoHeight > vh + 50)) {
      nextContent.requestFullscreen();
      fullScreenRequests++
    } else {
      exitFullscreen();
    };
    next.scrollIntoView();
  } else {
    exitFullscreen();
  };
};

function previousContent(thumbs) {
  thumbs = checkT(thumbs);
  if (thumbs && (currentContent - 1) >= 0) {
    currentContent--
    const previous = getPostFromElement(thumbs[currentContent]);
    const {type, content} = postContent(previous);
    var prevContent = content
    if (type == 'webm') {
      if (empty(getVids(previous))) {
        openAll(prevContent, true);
      };
      prevContent = getVids(previous);
    };
    if ((type == 'img' && prevContent.height > vh + 50) 
        || (type == 'webm' && prevContent.videoHeight > vh + 50)) {
      prevContent.requestFullscreen();
      fullScreenRequests++
    } else {
      exitFullscreen();
    };
    previous.scrollIntoView();
  } else {
    exitFullscreen();
  };
};

function mute(video) {
  video.muted = true;
};

function unmute(video) {
  video.muted = false;
};

function exitFullscreen() {
  while (fullScreenRequests > 0) {
    if (document.fullScreenElement) {
      document.exitFullscreen();
      fullScreenRequests--
    };
  };
};

