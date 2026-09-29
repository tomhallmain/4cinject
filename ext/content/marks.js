'use strict';

// Visible marks the extension puts on posts and catalog threads. State that
// other code reads back is also kept in data attributes, so it doesn't
// depend on the colors.
const Marks = {
  COLORS: Object.freeze({
    seenStored: 'red',
    seenSession: 'orange',
    newPost: '#3f4b63',
    newThread: '#81a2be',
    botThread: 'red',
    subthread: 'gray',
    catalogChallenge: 'teal',
    catalogImages: 'green',
    catalogExternalLink: 'darkblue',
  }),

  // `isStored`: listed in md5s.json, rather than seen on an earlier load.
  setSeen(post, isStored) {
    post.style.borderColor = isStored ? Marks.COLORS.seenStored : Marks.COLORS.seenSession;
    post.dataset.cijSeen = isStored ? 'stored' : 'session';
  },

  isSeen(post) {
    return Boolean(post?.dataset.cijSeen);
  },

  markNewPost(post) {
    post.style.backgroundColor = Marks.COLORS.newPost;
    post.dataset.cijNew = '';
  },

  // An outline, since catalog threads' background and border colors already
  // carry the catalog filter and bot-thread marks.
  markNewThread(threadElement) {
    threadElement.style.outline = '2px solid ' + Marks.COLORS.newThread;
    threadElement.dataset.cijNew = '';
  },

  markBotThread(threadElement) {
    threadElement.style.borderColor = Marks.COLORS.botThread;
    threadElement.dataset.cijBot = '';
  },

  markSubthreadPost(post) {
    post.style.borderColor = Marks.COLORS.subthread;
  },
};
