
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
  var postIds = thread.getPostIds()
  var graph = {}
  const postLength = postIds[0].length // Assuming all posts IDs will have same length
  postIds.map( postId => {
    count = 1
    var numbers = postId.split('').reverse()
    for (var i=1; i < postLength; i++) {
      if (numbers[i] === numbers[i-1]) {
        count++
      } else { break }
    }
    if (count > 1) {
      (graph[count] = graph[count] || []).push([postId])
    }
  })
  return graph
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
  chrome.runtime.sendMessage(extensionID, {
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
