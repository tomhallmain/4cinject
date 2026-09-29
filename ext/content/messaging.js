'use strict';

const Messaging = {
  // Sends a request to the worker. Resolves to its response, or to null if
  // the request failed (the failure is logged).
  async request(action, payload = {}) {
    try {
      const response = await chrome.runtime.sendMessage({action, ...payload});
      if (response?.error) {
        console.error('Worker failed to handle ' + action + ': ' + response.error);
        return null;
      }
      return response;
    } catch (e) {
      console.error('Request ' + action + ' failed', e);
      return null;
    }
  },

  // Handles messages sent to this tab by the popup. A handler's return value
  // (or resolved promise value) is sent back as the response.
  listen(handlers) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const handler = handlers[request?.action];
      if (!handler) {
        console.log('Message not understood: ' + request?.action);
        return false;
      }
      Promise.resolve()
        .then(() => handler(request))
        .then(
          (response) => sendResponse(response || {}),
          (error) => {
            console.error('Failed to handle ' + request.action, error);
            sendResponse({error: String(error)});
          });
      return true; // the response is sent asynchronously
    });
  },
};
