// HELPERS ///////////

const debug = false;
//var extensionID = null;
var n_scripts = 1;

function setExtensionID(id) {
  extensionID = id;
}

function getExtensionId() {
  return extensionID;
}

function isEmpty(ob){
    for(var i in ob){ if(ob.hasOwnProperty(i)){return false;}}
    return true;
}

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


function roughSizeOfObject( object ) {
    var objectList = [];
    var stack = [ object ];
    var bytes = 0;

    while ( stack.length ) {
        var value = stack.pop();

        if ( typeof value === 'boolean' ) {
            bytes += 4;
        }
        else if ( typeof value === 'string' ) {
            bytes += value.length * 2;
        }
        else if ( typeof value === 'number' ) {
            bytes += 8;
        }
        else if
        (
            typeof value === 'object'
            && objectList.indexOf( value ) === -1
        )
        {
            objectList.push( value );

            for( var i in value ) {
                stack.push( value[ i ] );
            }
        }
    }
    return bytes;
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

// technically could make use of a mutation element to inject if it is
// observed by the scripts loaded to the page as source (not as content script)

function setMutationElement() {
  el = document.createElement('div');
  el.id = 'mutation-element';
  el.hidden = true;
  document.head.appendChild(el);
}

function getMutationElement() {
  return document.head.querySelector('#mutation-element');
}

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

function hexToBase64(str) {
  return btoa(String.fromCharCode.apply(null,
    str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" "))
  );
}

async function getEncodedMD5(url) {
  let blob = await fetch(url).then(res => res.blob());
  let data = await blob.arrayBuffer();
  let hash = SparkMD5.ArrayBuffer.hash(data, false);
  let hashBase64 = hexToBase64(hash);
  return hashBase64;
}


if (!n_scripts) var n_scripts = 0;
n_scripts++
