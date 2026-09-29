'use strict';

const Md5 = {
  hexToBase64(str) {
    return btoa(String.fromCharCode.apply(null,
      str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" "))
    );
  },

  // Base64 of the binary MD5 of the file at `url`: the same encoding 4chan
  // uses in thumbnails' data-md5 attributes.
  async encodedMD5(url) {
    if (!url) return null;
    const blob = await fetch(url).then(res => res.blob());
    const data = await blob.arrayBuffer();
    return Md5.hexToBase64(SparkMD5.ArrayBuffer.hash(data, false));
  },
};
