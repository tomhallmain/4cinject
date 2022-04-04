// HELPERS ///////////

const debug = false;

function empty(data) {
  if (data === null) return true;
  switch (typeof(data)) {
    case 'number':    return false; break;
    case 'boolean':   return false; break;
    case 'undefined': return true;  break;
  }
  if (typeof(data.length) != 'undefined') return data.length == 0;
  var count = 0;
  for (var i in data) { if (data.hasOwnProperty(i)) count++ }
  return count == 0;
}

function objectMap(object, mapFn) {
  return Object.keys(object).reduce(function(result, key) {
    result[key] = mapFn(object[key]);
    return result;
  }, {});
}

function replaceKey(obj, oldKey, newKey) {
  if (oldKey !== newKey) {
    Object.defineProperty(obj, newKey,
      Object.getOwnPropertyDescriptor(obj, oldKey));
    delete obj[oldKey];
  }
}

function updateIdsNames(elms, regex, suffix) {
  for(var i=0; i < elms.length; i++) {
    var id = elms[i].id;
    var name = elms[i].name;
    if (!id && !name) continue;
    if (id && regex.test(id)) {
      elms[i].id = id + '-' + suffix;
    }
    if (name && regex.test(name)) {
      elms[i].name = name + '-' + suffix;
    }
  }
}

var lockF = function () {
  var lock = null;
  return function () {
    if (lock != null) return true;
    lock = setTimeout(function () {
      lock = null;
    }, 300);
    return false;
  }
}

function arrayRemove(arr, value) {
  return arr.filter(function(el) {
    return el != value;
  });
}

function first(arr) {
  return arr[0];
}

function last(arr) {
  return arr[arr.length - 1];
}

function insertAfter(referenceNode, newNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function toDataURL(url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url);
    xhr.responseType = 'blob';
    xhr.onload = function() {
      if (this.status >= 200 && this.status < 300) {
        var fr = new FileReader();

        fr.onload = function() {
          if ((typeof this.result) == "string") {
            resolve(this.result);
          }
          else {
            reject({
              status: this.status,
              statusText: "Invalid type of result: " + String(typeof this.result)
            });
          }
        };

        fr.readAsDataURL(xhr.response);
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function() {
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };

    xhr.send();
  });
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 20000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(id);
  return response;
}

async function getSHA1(url) {
  let blob = await fetch(url).then(res => res.blob());
  let arrayBuf = await blob.arrayBuffer();
  let hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)

if (!n_scripts) var n_scripts = 0;
n_scripts++
