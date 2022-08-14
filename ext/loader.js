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

function getArrayString(array) {
  var arrayString = "["
  for (i = 1; i <= array.length; i++) {
    item = array[i-1]
    switch (typeof(item)) {
      case 'number':
      case 'boolean':
        arrayString = arrayString + item;
        break;
      case 'undefined':
        arrayString = arrayString + 'undefined';
        break;
      case 'string':
        arrayString = arrayString + '"' + item + '"';
        break;
    }

    if (i < array.length) {
      arrayString = arrayString + ","
    }
  }
  arrayString = arrayString + "]"
  return arrayString
}

function messageIn(message) {
  console.log('Content script received message: ');
  console.log(message);
  event = (function(message) {
    const filterSettings = message.filterSettings;
    switch (message.action) {
      case 'autoExpand':     return 'toggleAutoExpand()';
      case 'expand':         return 'openImgs()';
      case 'close':          return 'close()';
      case 'digits':         return 'console.log(numbersGraph())';
      case 'maxDigits':      return 'console.log(maxDigits())';
      case 'threadGraph':    return 'threadGraph()';
      case 'subthreads':     return 'toggleSubthreads()';
      case 'contentExtract': return 'contentExtract()';
      case 'fullScreen':     return 'toggleFullscreen()';
      case 'catalogFilter':  return 'toggleFilter()';
      case 'toggleTestSHA1': return 'toggleTestSHA1()';
      case 'highlightNew':   return 'togglePostDiffHighlight()';
      
      case 'setVolume': 
        return 'setVolume(' + (filterSettings['volume'] || 50)/100 + ')';
      
      case 'getVolume': 
        messageOut('volume', window.localStorage['volume']);
        break;
      
      case 'setThreadFilter':
        var pattern = filterSettings['threadFilter'].replaceAll("\\", "\\\\").replaceAll('"', '\\"')
        return 'setThreadFilter("' + pattern + '")';
      
      case 'getThreadFilter': 
        messageOut('threadFilter', window.localStorage['threadFilter']);
        break;
      
      case 'setTextTransforms':
        var pattern = filterSettings['textTransforms'].replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n")
        return 'setTextTransforms("' + pattern + '")';
      
      case 'getTextTransforms': 
        messageOut('textTransforms', window.localStorage['textTransforms']);
        break;
      
      case 'setIsSeenContent':
        return 'setIsSeenContent("' + message.dataId + '", true)';
      
      case 'setIsSeenContentNotStored':
        return 'setIsSeenContent("' + message.dataId + '", false)';

      case 'setNewPostStyle':
        return 'highlightNewPosts(' + getArrayString(message.postIds) + ')';

      case 'setIsBotThread':
        return 'setIsBotThread("' + message.dataId + '")'
      
      default: console.log('Message not understood');
    };
  })(message);
  if (event) {
    console.log(event);
    fireEvent(event);
  }
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

