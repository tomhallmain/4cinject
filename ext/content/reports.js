'use strict';

// Thread statistics shown in the page header or logged from the popup.
const Reports = {
  // Post ID -> [quoted post IDs, backlinked post IDs], for posts that have
  // backlinks (or all posts with `includeNoRef`).
  threadGraph(posts, includeNoRef) {
    posts = Page.thread.checkP(posts);
    const graph = {};
    posts.forEach(post => {
      const pBacklinks = Dom.getBacklinks(post);
      if (includeNoRef || pBacklinks.length > 0) {
        graph[Dom.getPostId(post)] = [Dom.getQuoteLinks(post), pBacklinks];
      }
    });
    return graph;
  },

  // Number of repeated trailing digits -> post IDs ending in that many
  // repeated digits (only counts above 1).
  numbersGraph() {
    const postIds = Page.thread.getPostIds();
    if (!postIds || !postIds[0]) {
      return;
    }
    const graph = {};
    const postLength = postIds[0].length; // Assuming all posts IDs will have same length
    postIds.forEach(postId => {
      let count = 1;
      const numbers = postId.split('').reverse();
      for (let i = 1; i < postLength; i++) {
        if (numbers[i] === numbers[i - 1]) {
          count++;
        } else {
          break;
        }
      }
      if (count > 1) {
        (graph[count] = graph[count] || []).push([postId]);
      }
    });
    return graph;
  },

  maxDigits() {
    const graph = Reports.numbersGraph();
    if (Util.isEmpty(graph)) {
      return 'No worthwhile digits found';
    }
    const maxDigits = Math.max(...Object.keys(graph));
    return [maxDigits, graph[maxDigits]];
  },

  reportDigits() {
    const digits = Reports.maxDigits();
    const digitsReporter = document.createElement('div');
    digitsReporter.className = 'digits desktop';

    if (typeof digits == 'string') {
      digitsReporter.textContent = digits;
    } else {
      const nDigits = document.createElement('h3');
      nDigits.textContent = 'Max digits: ' + digits[0];
      digitsReporter.appendChild(nDigits);
      digits[1].forEach(pid => {
        const link = document.createElement('a');
        link.href = Page.initialLink + '#p' + pid;
        link.textContent = pid + ' ';
        digitsReporter.appendChild(link);
      });
    }

    Dom.attachToHeader(digitsReporter);
  },

  // [flag -> poster IDs using it, poster ID -> {flag -> post count}]
  getFlagsForPosters(posts) {
    posts = Page.thread.checkP(posts);
    const uniqueFlags = {};
    const posterFlags = {};

    for (const post of posts) {
      const posterId = Dom.getPosterId(post);
      const thisFlag = Dom.getFlag(post);

      if (posterId == null || thisFlag == null) {
        continue;
      }

      const flags = posterFlags[posterId] || {};
      flags[thisFlag] = (flags[thisFlag] || 0) + 1;

      if (!uniqueFlags[thisFlag]) {
        uniqueFlags[thisFlag] = [];
      }
      uniqueFlags[thisFlag].push(posterId);
      posterFlags[posterId] = flags;
    }

    return [uniqueFlags, posterFlags];
  },

  // [flags sorted by poster count, poster details sorted by flag count then
  // post count, posters who used more than one flag, number of posts]
  idFlagGraph(posts) {
    const thread = Page.thread;
    posts = thread.checkP(posts);
    const [uniqueFlags, posterFlags] = Reports.getFlagsForPosters(posts);

    const flagItems = Object.entries(uniqueFlags);
    flagItems.sort((first, second) => Object.keys(second[1]).length - Object.keys(first[1]).length);
    const uniqueFlagsSorted = Object.fromEntries(flagItems);

    const totalPosts = (flags) => Object.values(flags).reduce((sum, value) => sum + value, 0);
    const posterItems = Object.entries(posterFlags);
    posterItems.sort((first, second) => {
      const flags1 = Object.keys(first[1]).length;
      const flags2 = Object.keys(second[1]).length;
      if (flags1 != flags2) {
        return flags2 - flags1;
      }
      return totalPosts(second[1]) - totalPosts(first[1]);
    });

    const posterDetailsSorted = {};
    const flagSwitchers = [];

    for (const [posterId, flags] of posterItems) {
      const firstPost = thread.getPostsByPosterId(posterId, posts)[0];
      const details = {flags, postId: Dom.getPostId(firstPost), id: posterId};
      if (flags && Object.keys(flags).length > 1) {
        flagSwitchers.push(details);
      }
      posterDetailsSorted[posterId] = details;
    }

    return [uniqueFlagsSorted, posterDetailsSorted, flagSwitchers, posts.length];
  },

  makeOpDetailsElement(nAllPosts) {
    const thread = Page.thread;
    const opDetails = document.createElement('h3');
    const nOpPosts = thread.getPostsByOP().length;

    if (!nAllPosts) {
      nAllPosts = thread.getPosts().length;
    }

    if (nOpPosts == 1 && nAllPosts > 10) {
      opDetails.textContent = 'Posts by OP: ' + nOpPosts + ' (BOT THREAD)';
      opDetails.style.color = 'red';
    } else if (nOpPosts < 2 || nOpPosts / nAllPosts <= 0.025) {
      opDetails.textContent = 'Posts by OP: ' + nOpPosts + ' (WARNING - LOW)';
      opDetails.style.color = 'darkorange';
    } else {
      opDetails.textContent = 'Posts by OP: ' + nOpPosts;
    }

    return opDetails;
  },

  postLink(postId, text) {
    const link = document.createElement('a');
    link.href = Page.initialLink + '#p' + postId;
    link.textContent = text;
    return link;
  },

  reportFlags() {
    const [flagPosters, posterDetails, flagSwitchers, nPosts] = Reports.idFlagGraph();
    const idFlagReporter = document.createElement('div');
    idFlagReporter.className = 'flags desktop';
    idFlagReporter.appendChild(Reports.makeOpDetailsElement(nPosts));

    const uniqueFlagsString = Object.keys(flagPosters)
        .map(key => key + " (" + flagPosters[key].length + ")")
        .join(", ");
    const header = document.createElement('h3');
    header.textContent = 'Total flags: ' + Object.keys(flagPosters).length + ' - ' + uniqueFlagsString;
    idFlagReporter.appendChild(header);

    if (flagSwitchers.length > 0) {
      const h4 = document.createElement('h4');
      h4.textContent = "Flag switchers found:";
      idFlagReporter.appendChild(h4);

      for (const details of flagSwitchers) {
        const div = document.createElement('div');
        div.appendChild(Reports.postLink(details.postId, details.id));
        const p = document.createElement('p');
        p.textContent = Object.keys(details.flags).join(' ');
        div.appendChild(p);
        idFlagReporter.appendChild(div);
      }
    }

    // 4chan's `mobile` class hides the details on desktop.
    const flagPostersDiv = document.createElement('div');
    flagPostersDiv.className = 'flag-posters-details mobile';

    const toggleLink = document.createElement('a');
    toggleLink.textContent = 'Toggle flag poster details';
    toggleLink.onclick = function() {
      flagPostersDiv.className = flagPostersDiv.className.includes('mobile')
          ? 'flag-posters-details '
          : 'flag-posters-details mobile';
    };
    idFlagReporter.appendChild(toggleLink);

    for (const flag in flagPosters) {
      const div = document.createElement('div');
      const flagDiv = document.createElement('div');
      flagDiv.textContent = flag + ': ';
      div.appendChild(flagDiv);

      for (const posterId of flagPosters[flag]) {
        const details = posterDetails[posterId];
        div.appendChild(Reports.postLink(details.postId, details.id + '  '));
      }

      flagPostersDiv.appendChild(div);
    }

    idFlagReporter.appendChild(flagPostersDiv);
    Dom.attachToHeader(idFlagReporter);
  },

  reportOpPosts() {
    const idFlagReporter = document.createElement('div');
    idFlagReporter.className = 'flags desktop';
    idFlagReporter.appendChild(Reports.makeOpDetailsElement());
    Dom.attachToHeader(idFlagReporter);
  },

  // Adds "N posts" after each poster ID.
  reportNPosts() {
    const posts = Page.thread.getPosts();
    const ids = {};

    for (const post of posts) {
      const posterId = Dom.getPosterId(post);
      if (!posterId) continue;
      ids[posterId] = (ids[posterId] || 0) + 1;
    }

    for (const post of posts) {
      const infoDesktop = post?.querySelector('.postInfo.desktop');
      if (!infoDesktop) continue;
      const idEl = infoDesktop.querySelector('[class*="posteruid"]');
      if (!idEl) continue;
      const posterId = Dom.getPosterId(post);
      if (!posterId) continue;

      const nPostsTag = document.createElement('span');
      nPostsTag.className = 'npoststag ' + posterId;
      const postsCount = ids[posterId];
      nPostsTag.textContent = postsCount == 1 ? ' 1 post' : ' ' + postsCount + ' posts';
      Dom.insertAfter(idEl, nPostsTag);
    }
  },

  setContentStats() {
    const proportionSeen = Page.thread.getProportionSeenContent();

    if (proportionSeen <= 0) {
      return;
    }

    const proportionString = (Math.round(proportionSeen * 1000) / 10) + "%";
    let seenReporter = document.querySelector('.seenContent.desktop');
    let seenTitle;

    if (seenReporter) {
      seenTitle = seenReporter.querySelector('h3');
      seenTitle.textContent = 'Seen content ratio: ' + proportionString;
      return;
    }

    seenReporter = document.createElement('div');
    seenReporter.className = 'seenContent desktop';
    seenTitle = document.createElement('h3');
    seenTitle.textContent = 'Seen content ratio: ' + proportionString;
    seenReporter.appendChild(seenTitle);
    Dom.attachToHeader(seenReporter);
  },
};
