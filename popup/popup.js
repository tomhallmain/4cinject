// Setup

var filterSettings = {};
let activeTabParams = {
  active: true,
  currentWindow: true
};

document.addEventListener('DOMContentLoaded', function() {
  mapBtn( select('.expand'),         'expand'          );
  mapBtn( select('.close'),          'close'           );
  mapBtn( select('.digits'),         'digits'          );
  mapBtn( select('.maxDigits'),      'maxDigits'       );
  mapBtn( select('.threadGraph'),    'threadGraph'     );
  mapBtn( select('.subthreads'),     'subthreads'      );
  mapBtn( select('.contentExtract'), 'contentExtract'  );
  mapBtn( select('.fullScreen'),     'fullScreen'      );
  mapBtn( select('.catalogFilter'),  'catalogFilter'   );
  mapSlider( select('#volume'),      'setVolume'       );
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(request);
    if (request.msg === 'volume') {
      select('#volume').value = request.data * 100
    }
  }
);

function select(className) {
  return document.querySelector(className);
};
function mapBtn(btn, msg) {
  btn.addEventListener('click', function() { btnPressed(msg) });
};
function mapSlider(slider, msg) {
  slider.addEventListener('change', function() { 
    updateFilter(slider.id, slider.value)
    setVolume(msg);
  });
};
function getVolume() {
  sendMsg({action: 'getVolume'});
};

getVolume();


// Message passing

function sendMsg(msg) {
  msg = applyFilter(msg);
  chrome.tabs.query(activeTabParams, messagePush);
  function messagePush(tabs) {
    console.log(msg);
    console.log(tabs[0]);
    chrome.tabs.sendMessage(tabs[0].id, msg);
  };
};
function applyFilter(msg) {
  msg['filterSettings'] = filterSettings;
  return msg;
};


// Actions

function btnPressed(msg) {
  console.log('button pressed for ' + msg);
  sendMsg({action: msg});
};
function setVolume(msg) {
  sendMsg({action: msg});
};
function updateFilter(inputId, input) {
  filterSettings[inputId] = input;
  console.log('changed filter for ' + inputId + ' to ' + input);
};
