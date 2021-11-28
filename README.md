# 4cinject

Simple extension for interfacing with 4Channel DOM.

## Setup
- Clone the repo
- Open chrome://extensions URL on Chrome browser
- Check option for developer mode
- Select `Load Unpacked`
- Select `ext` folder

## Usage

After installation, find the icon popup in the top right corner of the browser. The popup lists options available. Detailed options are listed below.

### Navigation

- *Left/right arrow* - While on a thread, move to the next/previous post with content (image, WebM, etc.)
- *ALT + Left/right arrow* - Jump: While subthreads setting is on move to next/previous _base_ post with content
- *SHIFT + Right arrow* - While post is engaged, set post content to fullscreen
- *SHIFT + Left arrow* - While post is engaged and content is fullscreen, exit fullscreen

### Settings

| Setting        | Default  | Description                                                                                        | 
|----------------|----------|----------------------------------------------------------------------------------------------------|
| ThreadFilter   | unset    | Filter out threads in catalog by regex pattern                                                     |
| Volume         | 50%      | Initial volume level relative to system for all opened WebMs with audio                            |
| Subthreads     | true     | On thread load, redraw the thread posts into a parent-child form                                   |
| CatalogFilter  | true     | On catalog load applies ThreadFilter, highlights posts with high content ratio and challenge posts |
| MaxDigits      | true     | On thread load, show and make links to max digits among thread posts                               |
| Expand         | true     | On thread load, automatically expand all images, including gifs                                    |
| Fullscreen     | false    | When engaging content via arrow keys, will set each image/WebM to full screen                      |
| Close          | n/a      | Close all expanded content on threads (return to site's default state for thread content)          |
| ThreadGraph    | n/a      | Console-based - return the thread graph object                                                     |
| Digits         | n/a      | Console-based - return the digits object                                                           |

### Content Analysis

Because much of the content on the site is often recycled, it may be desirable to set a list of files you already have saved to avoid duplicate downloads.

To do this, create a file *ext/sha1s.json* as a JSON array containing the string of the SHA1s of your existing files to be marked as already seen. For example:

```json
[
  "ee3283ac79b562d7ddb73b3eb7aae9f35ba6a9c3",
  "53df56d39c6080abfc8a4ed67ab9cf4843798c99"
]
```

Be sure to reload the extension in the browser extensions page after adding this file, and reload any previously loaded pages after.

An SHA1 from each file on any thread will be tested against the list of SHA1s provided 20 seconds after thread load. If a match is found, a red border is applied to the associated post element.


