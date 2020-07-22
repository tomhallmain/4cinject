
// TODO: Add slider for global tab volumne

// Setup

document.addEventListener('DOMContentLoaded', function() {
  mapBtn( select('.expand'),         'expand'          );
  mapBtn( select('.close'),          'close'           );
  mapBtn( select('.digits'),         'digits'          );
  mapBtn( select('.maxDigits'),      'maxDigits'       );
  mapBtn( select('.threadGraph'),    'threadGraph'     );
  mapBtn( select('.subthreads'),     'subthreads'      );
  mapBtn( select('.contentExtract'), 'contentExtract'  );
});

function select(className) {
  return document.querySelector(className);
}

// Message passing

let activeTabParams = {
  active: true,
  currentWindow: true
};
function sendMsg(msg) {
  chrome.tabs.query(activeTabParams, messagePush);
  function messagePush(tabs) {
    console.log(msg);
    console.log(tabs[0]);
    chrome.tabs.sendMessage(tabs[0].id, msg);
  };
};


// Actions

function mapBtn(btn, msg) {
  btn.addEventListener('click', function() { btnPressed(msg) });
};

function btnPressed(msg) {
  console.log('button pressed for ' + msg);
  sendMsg(msg);
};



