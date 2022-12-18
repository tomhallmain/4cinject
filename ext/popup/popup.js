// Setup

var contentFilter = [];

function select(selector) {
  return document.querySelector(selector);
}

function mapBtn(btn, action, isActiveTab) {
  if (action === 'downloadFilteredHashes') {
    btn.addEventListener('click', function() {
      downloadFilteredHashes();
    });
  } else {
    btn.addEventListener('click', function() {
      buttonPressed(action, isActiveTab);
    });
  }
}

function mapInput(input, action, isActiveTab) {
  input.addEventListener('change', function() {
    var data = input.value;

    if (input.className === 'contentFilter') {
      data = data.split("\n+ *\n+");
      if (data.length === 1 && data[0] === '') {
        data = [];
      }
    }

    updateFilter(input.className, data);

    if (isActiveTab) {
      sendMessageWithAction(action);
    } else {
      sendMessageToBackgroundWithAction(action);
    }
  });
}

function mapSlider(slider, action) {
  slider.addEventListener('change', function() {
    updateFilter(slider.id, slider.value)
    sendMessageToBackgroundWithAction(action);
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
          contentFilter = response.data;
          select('.contentFilter').innerHTML = contentFilter.join('\n');
        }
      }
    });
}

function sendMessageToBackgroundWithAction(action) {
  msg = {action: action};
  msg = applyFilter(msg);
  sendMessageToBackgroundPage(msg);
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


function saveDataToDownloadedFile(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

function downloadFilteredHashes() {
  if (contentFilter.length > 0) {
    const data = "[\n\t\"" + contentFilter.join("\",\n\t\"") + "\"\n]";
    saveDataToDownloadedFile(data, "filteredMD5s", "application/json");
  }
}


// Actions

function buttonPressed(action, isActiveTab) {
  console.log('button pressed for ' + action);

  if (isActiveTab) {
    sendMessageWithAction(action)
  } else {
    sendMessageToBackgroundWithAction(action);
  }
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
  mapBtn(    select('.downloadFilteredHashes'), 'downloadFilteredHashes' );
  mapInput(  select('.threadFilter'),   'setThreadFilter' );
  mapInput(  select('.textTransforms'), 'setTextTransforms' );
  mapInput(  select('.contentFilter'),  'setContentFilter'  );
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
