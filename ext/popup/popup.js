// Setup

var filterSettings = {}
let activeTabParams = {
  active: true,
  currentWindow: true
}

document.addEventListener('DOMContentLoaded', function() {
  mapBtn( select('.autoExpand'),     'autoExpand'      );
  mapBtn( select('.expand'),         'expand'          );
  mapBtn( select('.close'),          'close'           );
  mapBtn( select('.digits'),         'digits'          );
  mapBtn( select('.maxDigits'),      'maxDigits'       );
  mapBtn( select('.threadGraph'),    'threadGraph'     );
  mapBtn( select('.subthreads'),     'subthreads'      );
  mapBtn( select('.contentExtract'), 'contentExtract'  );
  mapBtn( select('.toggleTestSHA1'), 'toggleTestSHA1'  );
  mapBtn( select('.fullScreen'),     'fullScreen'      );
  mapBtn( select('.catalogFilter'),  'catalogFilter'   );
  mapBtn( select('.highlightNew'),   'highlightNew'    );
  mapInput( select('.threadFilter'), 'setThreadFilter' );
  mapSlider( select('#volume'),      'setVolume'       );
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(request);
    switch (request.msg) {
      case ('volume'):
        select('#volume').value = request.data * 100
        break;
      case ('threadFilter'):
        if (request.data === undefined) return
        select('.threadFilter').innerHTML = request.data
        break;
    }
  }
);

select('.threadFilter').addEventListener("keydown", function(e) {
  if (e.keyCode == 13 && !e.shiftKey) {
    event.target.dispatchEvent(new Event("change", {cancelable: true}));
    e.preventDefault();
    return false;
  }
});

function select(selector) {
  return document.querySelector(selector);
}
function mapBtn(btn, msg) {
  btn.addEventListener('click', function() { btnPressed(msg) });
}
function mapInput(input, msg) {
  input.addEventListener('change', function() {
    updateFilter(input.className, input.value);
    setThreadFilter(msg);
  });
}
function mapSlider(slider, msg) {
  slider.addEventListener('change', function() { 
    updateFilter(slider.id, slider.value)
    setVolume(msg);
  });
}
function getVolume() {
  sendMsg({action: 'getVolume'});
}
function getThreadFilter() {
  sendMsg({action: 'getThreadFilter'});
}
function getTextTransforms() {
  sendMsg({action: 'getTextTransforms'});
}

getVolume();
getThreadFilter();
getTextTransforms();

// Message passing

function sendMsg(msg) {
  msg = applyFilter(msg);
  chrome.tabs.query(activeTabParams, messagePush);
  function messagePush(tabs) {
    console.log(msg);
    chrome.tabs.sendMessage(tabs[0].id, msg);
  }
}
function applyFilter(msg) {
  msg['filterSettings'] = filterSettings;
  return msg;
}


// Actions

function btnPressed(msg) {
  console.log('button pressed for ' + msg);
  sendMsg({action: msg});
}
function setVolume(msg) {
  sendMsg({action: msg});
}
function setThreadFilter(msg) {
  sendMsg({action: msg});
}
function updateFilter(inputId, input) {
  filterSettings[inputId] = input;
  console.log('changed filter for ' + inputId + ' to ' + input);
}
function setTextTransforms(msg) {
  sendMsg({action: msg});
}
function updateTextTransforms(inputId, input) {
  filterSettings[inputId] = input;
  console.log('changed filter for ' + inputId + ' to ' + input);
}
