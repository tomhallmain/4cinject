
// Reporting

function threadGraph(posts, includeNoRef) {
  posts = checkP(posts);
  var graph = {};
  posts.map( post => {
    var pBacklinks = getBacklinks(post);
    if (includeNoRef || pBacklinks.length > 0) {
      graph[getPostId(post)] = [getQuoteLinks(post), pBacklinks];
    };
  });
  return graph;
};

function subthreads() {
  const graph = threadGraph(null, false);
  var postIds = Object.keys(graph);
  var counts = {};
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
    };
  };
};

function numbersGraph(posts) {
  posts = checkP(posts);
  var postIds = posts.map( post => getPostId(post) );
  var graph = {};
  const postLength = postIds[0].length // Assuming all posts will have same length
  postIds.map( postId => {
    count = 1;
    var numbers = postId.split('').reverse();
    for (var i=1; i < postLength; i++) {
      if (numbers[i] === numbers[i-1]) {
        count++
      } else { break };
    };
    if (count > 1) {
      (graph[count] = graph[count] || []).push([postId]);
    };
  });
  return graph;
};

function maxDigits() {
  var graph = numbersGraph();
  if (!empty(graph)) {
    var maxDigits = Math.max(...Object.keys(graph));
    var maxDigitPosts = graph[maxDigits].map(pid => getPostById(pid));
    return [maxDigits, maxDigitPosts];
  } else {
    console.log('No worthwhile digits found');
  };
};

function contentExtract() {
  openAll();
  var imageContent = getExpandedImgs();
  var vids = getVids();
  threadElement.innerHTML = '';
  imageContent.map( img => threadElement.append(img) );
  vids.map( vid => threadElement.append(vid) );
};



