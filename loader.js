
function loadScript(fileName) {
  var s = document.createElement('script');
  s.src = chrome.runtime.getURL(fileName);
  s.onload = function() { this.remove() };
  (document.head || document.documentElement).appendChild(s);
};

files = ['helpers.js', 'agent.js', 'reporter.js', 'base.js']
files.map( file => loadScript(file) );

chrome.runtime.onMessage.addListener(messageIn);

function messageIn(message) {
  console.log('Content script received message: ');
  console.log(message);
  var action = message['action'];
  var filterSettings = message['filterSettings'];
  event = (function(action, filterSettings) {
    switch (action) {
      case 'expand': return 'openImgs()'; break;
      case 'close': return 'close()'; break;
      case 'digits': return 'console.log(numbersGraph())'; break;
      case 'maxDigits': return 'console.log(maxDigits())'; break;
      case 'threadGraph': return 'threadGraph()'; break;
      case 'subthreads': return 'subthreads()'; break;
      case 'contentExtract': return 'contentExtract()'; break;
      case 'fullScreen': return 'toggleFullscreen()'; break;
      case 'setVolume': 
        return 'setVolume(' + filterSettings['volume']/100 + ')';
        break;
      case 'getVolume': 
        messageOut('volume', window.localStorage['volume']);
        break;
      default: console.log('Message not understood');
    };
  })(action, filterSettings);
  console.log(event);
  if (event) fireEvent(event);
};

function fireEvent(toFire) {
  var s = document.createElement('script');
  s.appendChild(document.createTextNode(toFire + ';'));
  (document.head || document.documentElement).appendChild(s);
};

function messageOut(message, data) {
  chrome.runtime.sendMessage({
    msg: message, 
    data: data
  });
};

