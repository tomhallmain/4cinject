
function loadScript(fileName) {
  var s = document.createElement('script');
  s.src = chrome.runtime.getURL(fileName);
  s.onload = function() { this.remove() };
  (document.head || document.documentElement).appendChild(s);
};

files = ['helpers.js', 'agent.js', 'reporter.js', 'base.js']
files.map( file => loadScript(file) );

chrome.runtime.onMessage.addListener(messageHandler);

function messageHandler(message) {
  console.log('Content script received message: ' + message);
  event = (function(message) {
    switch (message) {
      case 'expand': return 'open()'; break;
      case 'close': return 'close()'; break;
      case 'digits': return 'console.log(numbersGraph())'; break;
      case 'maxDigits': return 'console.log(maxDigits())'; break;
      case 'threadGraph': return 'threadGraph()'; break;
      case 'subthreads': return 'subthreads()'; break;
      case 'contentExtract': return 'contentExtract()'; break;
      default: console.log('Message not understood');
    };
  })(message);
  console.log(event);
  if (event) fireEvent(event);
};

function fireEvent(toFire) {
  var s = document.createElement('script');
  s.appendChild(document.createTextNode(toFire + ';'));
  (document.head || document.documentElement).appendChild(s);
};



