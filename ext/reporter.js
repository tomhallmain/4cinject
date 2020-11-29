
// REPORTING /////////

function threadGraph(posts, includeNoRef) {
  posts = checkP(posts);
  var graph = {};
  posts.map( post => {
    var pBacklinks = getBacklinks(post);
    if (includeNoRef || pBacklinks.length > 0) {
      graph[getPostId(post)] = [getQuoteLinks(post), pBacklinks];
    }
  });
  return graph;
}

function subthreads() {
  const graph = threadGraph(null, false);
  var postIds = Object.keys(graph);
  var counts = {}
  for (var postId of postIds) {
    var post = getPostById(postId);
    var [pLinks, pBacklinks] = graph[postId];
    for (var blPostId of pBacklinks) {
      var blPost = getPostById(blPostId);
      var count = counts[blPostId];
      if (count) {
        var blPostCopy = blPost.cloneNode();
        blPostCopy.style.borderColor = 'white';
        blPostCopy.id = blPostId + "-" + count;
        updateIdsNames(blPostCopy.getElementsByTagName("*"), new RegExp(blPostId), count);
        post.appendChild(blPostCopy);
        counts[blPostId]++;
      } else {
        var blPostContainer = blPost.parentElement
        blPost.style.borderColor = 'white';
        post.appendChild(blPost);
        blPostContainer.remove();
        counts[blPostId] = 1;
      }
    }
  }
  const graphRedrawn = true;
}

function numbersGraph(posts) {
  posts = checkP(posts);
  var postIds = posts.map( post => getPostId(post) );
  var graph = {}
  const postLength = postIds[0].length // Assuming all posts will have same length
  postIds.map( postId => {
    count = 1;
    var numbers = postId.split('').reverse();
    for (var i=1; i < postLength; i++) {
      if (numbers[i] === numbers[i-1]) {
        count++
      } else { break }
    }
    if (count > 1) {
      (graph[count] = graph[count] || []).push([postId]);
    }
  });
  return graph;
}

function maxDigits() {
  var graph = numbersGraph();
  if (!empty(graph)) {
    var maxDigits = Math.max(...Object.keys(graph));
    var maxDigitPosts = graph[maxDigits];
    return [maxDigits, maxDigitPosts];
  } else {
    return 'No worthwhile digits found';
  }
}

function reportDigits() {
  const digits = maxDigits();
  var digitsReporter = document.createElement('div');
  digitsReporter.className = 'digits desktop';
  if (typeof(digits) == 'string') {
    digitsReporter.textContent = digits;
  } else {
    var nDigits = document.createElement('h3');
    nDigits.textContent = 'Max digits: ' + digits[0];
    digitsReporter.appendChild(nDigits);
    digits[1].forEach( pid => {
      link = document.createElement('a');
      link.href = initialLink + '#p' + pid;
      link.textContent = pid + ' ';
      digitsReporter.appendChild(link);
    });
  }
  const nld = document.querySelector('.navLinks.desktop');
  insertAfter(nld, digitsReporter);
}

function contentExtract() {
  openAll();
  var imageContent = getExpandedImgs();
  var vids = getVids();
  threadElement.innerHTML = '';
  imageContent.map( img => threadElement.append(img) );
  vids.map( vid => threadElement.append(vid) );
  const graphRedrawn = true
}

if (!n_scripts) var n_scripts = 0;
n_scripts++
