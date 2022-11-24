// Setup

function select(selector) {
  return document.querySelector(selector);
}

function mapBtn(btn, action) {
  btn.addEventListener('click', function() { buttonPressed(action) });
}

function mapInput(input, action, isBackground) {
  input.addEventListener('change', function() {
    var data = input.value;

    if (input.className === 'contentFilter') {
      data = data.split("\n+ *\n+");
      if (data.length === 1 && data[0] === '') {
        data = [];
      }
    }

    updateFilter(input.className, data);

    if (isBackground) {
      sendMessageToBackgroundWithAction(action);
    } else {
      sendMessageWithAction(action);
    }
  });
}

function mapSlider(slider, action) {
  slider.addEventListener('change', function() {
    updateFilter(slider.id, slider.value)
    sendMessageWithAction(action);
  });
}

function addEnterKeyEventListenerToInput(input) {
  input.addEventListener("keydown", function(e) {
    if (e.keyCode == 13 && !e.shiftKey) {
      event.target.dispatchEvent(new Event("change", {cancelable: true}));
      e.preventDefault();
      return false;
    }
  });
}


// Message passing

var filterSettings = {}
let activeTabParams = {
  active: true,
  currentWindow: true
}

function sendMessageToBackgroundPage(message) {
  message = applyFilter(message);
  chrome.runtime.sendMessage(message,
    function (response) {
      console.log("Received response from background: ");
      console.log(response);

      if (response.action === 'contentFilter') {
        if (response.data !== undefined) {
          select('.contentFilter').innerHTML = response.data.join('\n');
        }
      }
    });
}

function sendMessageToBackgroundWithAction(action) {
  sendMessageToBackgroundPage({action: action});
}

function sendMessageToActiveTab(msg) {
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

function sendMessageWithAction(action) {
  return sendMessageToActiveTab({action: action});
}


// Actions

function buttonPressed(action) {
  console.log('button pressed for ' + action);
  sendMessageWithAction(action)
}

function get(data) {
  sendMessageWithAction('get' + data);
}

function getFromBackground(data) {
  sendMessageToBackgroundWithAction('get' + data);
}

function updateFilter(inputId, input) {
  filterSettings[inputId] = input;
  console.log('changed filter for ' + inputId + ' to ' + input);
}


document.addEventListener('DOMContentLoaded', function() {
  mapBtn(    select('.autoExpand'),     'autoExpand'      );
  mapBtn(    select('.expand'),         'expand'          );
  mapBtn(    select('.close'),          'close'           );
  mapBtn(    select('.digits'),         'digits'          );
  mapBtn(    select('.maxDigits'),      'maxDigits'       );
  mapBtn(    select('.threadGraph'),    'threadGraph'     );
  mapBtn(    select('.subthreads'),     'subthreads'      );
  mapBtn(    select('.contentExtract'), 'contentExtract'  );
  mapBtn(    select('.toggleTestHash'), 'toggleTestHash'  );
  mapBtn(    select('.fullScreen'),     'fullScreen'      );
  mapBtn(    select('.highlightNew'),   'highlightNew'    );
  mapBtn(    select('.catalogFilter'),  'catalogFilter'   );
  mapInput(  select('.threadFilter'),   'setThreadFilter' );
  mapInput(  select('.textTransforms'), 'setTextTransforms' );
  mapInput(  select('.contentFilter'),  'setContentFilter', true  );
  mapSlider( select('#volume'),         'setVolume'       );
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(request);
    switch (request.msg) {
      case ('volume'):
        select('#volume').value = request.data * 100
        break;
      case ('threadFilter'):
        if (request.data === undefined || request.data === '') return;
        select('.threadFilter').innerHTML = request.data;
        break;
      case ('textTransforms'):
        if (request.data === undefined || request.data === '') return;
        select('.textTransforms').innerHTML = request.data;
        break;
    }
  }
);

get('Volume');
get('ThreadFilter');
get('TextTransforms');
getFromBackground('ContentFilter');

addEnterKeyEventListenerToInput(select('.contentFilter'));
addEnterKeyEventListenerToInput(select('.threadFilter'));
