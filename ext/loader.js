const extensionID = String(chrome.runtime.id)

fireEvent('var n_scripts = 0');
fireEvent("const extensionID = \"" + extensionID + "\"");

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
  var action = message.action;
  var filterSettings = message.filterSettings;
  var dataId = message.dataId;
  event = (function(action, filterSettings, dataId) {
    switch (action) {
      case 'expand':         return 'openImgs()'; break;
      case 'close':          return 'close()'; break;
      case 'digits':         return 'console.log(numbersGraph())'; break;
      case 'maxDigits':      return 'console.log(maxDigits())'; break;
      case 'threadGraph':    return 'threadGraph()'; break;
      case 'subthreads':     return 'toggleSubthreads()'; break;
      case 'contentExtract': return 'contentExtract()'; break;
      case 'fullScreen':     return 'toggleFullscreen()'; break;
      case 'catalogFilter':  return 'toggleFilter()'; break;
      
      case 'setVolume': 
        return 'setVolume(' + (filterSettings['volume'] || 50)/100 + ')';
        break;
      
      case 'getVolume': 
        messageOut('volume', window.localStorage['volume']);
        break;
      
      case 'setThreadFilter':
        var pattern = filterSettings['threadFilter'].replaceAll('"', '\\"')
        return 'setThreadFilter("' + pattern + '")';
        break;
      
      case 'setIsSeenContent':
        return 'setIsSeenContent("' + dataId + '")';
        break;
      
      case 'getThreadFilter': 
        messageOut('threadFilter', window.localStorage['threadFilter']);
        break;
      
      default: console.log('Message not understood');
    };
  })(action, filterSettings, dataId);
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

