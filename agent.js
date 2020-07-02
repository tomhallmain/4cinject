

// Interaction

function open(thumbImgs) {
  thumbImgs = thumbImgs || getThumbImgs();
  thumbImgs = thumbImgs.filter( img => ! /.webm$/.test(img.parentElement.href) );
  for (var i = 0; i < thumbImgs.length; i++) {
    setTimeout(ImageExpansion.toggle(thumbImgs[i]), i*100);
  };
  console.log('Opened ' + thumbImgs.length + ' file thumbs');
};
function openAll(thumbImgs) {
  thumbImgs = thumbImgs || getThumbImgs();
  for (var i = 0; i < thumbImgs.length; i++) {
    var thumb = thumbImgs[i].parentElement;
    setTimeout(ImageExpansion.toggle(thumbImgs[i]), i*100);
    if ( /.webm$/.test(thumb.href) ) {
      thumb.nextSibling.pause();
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
  thumbImgs.length > 0 ? open(thumbImgs) : true;
};

function mute(video) {
  video.muted = true;
};

function unmute(video) {
  video.muted = false;
};



