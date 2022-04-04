
// REPORTING /////////

function threadGraph(posts, includeNoRef) {
  posts = checkP(posts)
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
  var counts = {}
  for (var postId of postIds) {
    var post = getPostById(postId)
    var [pLinks, pBacklinks] = graph[postId]
    for (var blPostId of pBacklinks) {
      var blPost = getPostById(blPostId)
      var count = counts[blPostId]
      if (count) {
        var blPostCopy = blPost.cloneNode()
        blPostCopy.style.borderColor = 'white'
        blPostCopy.id = blPostId + "-" + count
        updateIdsNames(blPostCopy.getElementsByTagName("*"), new RegExp(blPostId), count)
        post.appendChild(blPostCopy)
        counts[blPostId]++
      } else {
        var blPostContainer = blPost.parentElement
        blPost.style.borderColor = 'white'
        post.appendChild(blPost)
        blPostContainer.remove()
        counts[blPostId] = 1
      }
    }
  }
  const graphRedrawn = true;
}

function numbersGraph(posts) {
  posts = checkP(posts)
  var postIds = posts.map( post => getPostId(post) )
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

function reportDigits() {
  const digits = maxDigits()
  var digitsReporter = document.createElement('div')
  digitsReporter.className = 'digits desktop'
  if (typeof(digits) == 'string') {
    digitsReporter.textContent = digits
  } else {
    var nDigits = document.createElement('h3')
    nDigits.textContent = 'Max digits: ' + digits[0]
    digitsReporter.appendChild(nDigits)
    digits[1].forEach( pid => {
      link = document.createElement('a')
      link.href = initialLink + '#p' + pid
      link.textContent = pid + ' '
      digitsReporter.appendChild(link)
    })
  }
  const nld = document.querySelector('.navLinks.desktop')
  insertAfter(nld, digitsReporter)
}

function getFlagsForPosters(posterId, posts) {
  posts = checkP(posts)
  uniqueFlags = {}
  posterFlags = {}

  for (var i = 0; i < posts.length; i++) {
    post = posts[i]
    posterId = getPosterId(post)
    thisFlag = getFlag(post)
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
  posts = checkP(posts)
  var flagsData = getFlagsForPosters(posts)

  var posterFlags = flagsData[0]
  items = Object.keys(posterFlags).map(function(key) {
    return [key, posterFlags[key]]
  })
  items.sort(function(first, second) {
    return Object.keys(second[1]).length - Object.keys(first[1]).length
  })
  uniqueFlagsSorted={}
  for (var item of items) {
    uniqueFlagsSorted[item[0]] = item[1]
  }

  var posterDetails = flagsData[1]
  items = Object.keys(posterDetails).map(function(key) {
    return [key, posterDetails[key]]
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
  posterDetailsSorted = {}
  flagSwitchers = []
  for (var item of items) {
    posterId = item[0]
    flags = item[1]
    firstPost = getPostsByPosterId(posterId, posts)[0]
    postId = getPostId(firstPost)
    details = { flags: flags, postId: postId, id: posterId }
    if (flags.length > 1) {
      flagSwitchers.push(details)
    }
    posterDetailsSorted[posterId] = details
  }

  return [uniqueFlagsSorted, posterDetailsSorted, flagSwitchers]
}

function reportFlags() {
  const idFlags = idFlagGraph()
  var idFlagReporter = document.createElement('div')
  idFlagReporter.className = 'flags desktop'
  var opDetails = document.createElement('h3')
  opDetails.textContent = 'Posts by OP: ' + getPostsByPosterId(getPosterId(getOriginalPost())).length
  idFlagReporter.appendChild(opDetails)
  var header = document.createElement('h3')
  flagPosters = idFlags[0]
  posterDetails = idFlags[1]
  flagSwitchers = idFlags[2]
  header.textContent = 'Total flags: ' + Object.keys(flagPosters).length
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
      p.textContent = details.flags.join(' ')
      div.appendChild(p)
      idFlagReporter.appendChild(div)
    }
  }

  unhideFlagPostersLink = document.createElement('a')
  unhideFlagPostersLink.onclick = function() {
      flagPostersDiv = document.querySelector("[class*='flag-posters-details']")

      if (flagPostersDiv.className.includes('mobile')) {
        flagPostersDiv.className = 'flag-posters-details '
      }
      else {
        flagPostersDiv.className = 'flag-posters-details mobile'
      }
    }
  unhideFlagPostersLink.textContent = 'Toggle flag poster details'
  idFlagReporter.appendChild(unhideFlagPostersLink)
  flagPostersDiv = document.createElement('div')
  flagPostersDiv.className = 'flag-posters-details mobile'

  for (var flag in flagPosters) {
    div = document.createElement('div')
    flagDiv = document.createElement('div')
    flagDiv.textContent = flag + ': '
    div.appendChild(flagDiv)
    for (var posterId of flagPosters[flag]) {
      details = posterDetails[posterId]
      link = document.createElement('a')
      link.href = initialLink + '#p' + details.postId
      link.textContent = details.id + '  '
      div.appendChild(link)
    }
    flagPostersDiv.appendChild(div)
  }

  idFlagReporter.appendChild(flagPostersDiv)
  const nld = document.querySelector('.navLinks.desktop')
  insertAfter(nld, idFlagReporter)
}

function setSeenStats() {
  if (numContentItems == 0) {
    return;
  }

  const proportionSeen = numSeenContentItems / numContentItems;

  if (proportionSeen == 0) {
    return;
  }

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

  seenTitle.textContent = 'Seen content ratio: ' + proportionSeen;

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
  threadElement.innerHTML = '';
  imageContent.map( img => threadElement.append(img) );
  vids.map( vid => threadElement.append(vid) );
  const graphRedrawn = true
}

if (!n_scripts) var n_scripts = 0;
n_scripts++
