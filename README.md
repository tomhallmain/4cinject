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
- *SHIFT + SPACE* - If HighlightNew is set and new posts are found, move between the new posts

### Settings

| Setting        | Default  | Description                                                                                        |
|----------------|----------|----------------------------------------------------------------------------------------------------|
| ThreadFilter   | unset    | Filter out threads in catalog by regex pattern                                                     |
| TextTransforms | unset    | Replace all text in thread teasers and posts if matching regex pattern                             |
| Volume         | 50%      | Initial volume level relative to system for all opened WebMs with audio                            |
| Subthreads     | true     | On thread load, redraw the thread posts into a parent-child form                                   |
| CatalogFilter  | true     | On catalog load applies ThreadFilter, highlights posts with high content ratio and challenge posts |
| HighlightNew   | true     | Highlight posts created since last thread load                                                     |
| MaxDigits      | true     | On thread load, show and make links to max digits among thread posts                               |
| TestHash       | true     | Test content hashes and highlight or filter posts based on the results                             |
| Fullscreen     | false    | When engaging content via arrow keys, will set each image/WebM to full screen                      |
| Auto Expand    | false    | On thread load, automatically expand all images, including gifs                                    |
| Expand         | n/a      | Expand all images on threads on click                                                              |
| Close          | n/a      | Close all expanded images on threads (return to site's default state for thread content) on click  |
| ThreadGraph    | n/a      | Console-based - return the thread graph object                                                     |
| Digits         | n/a      | Console-based - return the digits object                                                           |

### Content Analysis

Because much of the content on the site is often recycled, it may be desirable to set a list of files you already have saved to avoid duplicate downloads.

To do this, create a file *ext/md5s.json* as a JSON array containing base 64 encodings of binary md5 hashes of your existing files to be marked as already seen. For example:

```json
[
  "f7oN1WfuSYjwtGao7bDK5Q==",
  "2pyVwevIJV9BS7VWpvuVtw=="
]
```

Be sure to reload the extension in the browser extensions page after adding this file, and reload any previously loaded pages after.

If setting TestHash is turned on, MD5s from each file on any thread will be tested against the list of hashes provided upon thread load. If a match is found, a red border is applied to the associated post. Recently seen content will have an orange border applied, and a filter can be set on any content.

### Content Filtering

Image and video content can be filtered by clicking on the "Filter" links created on posts with content. The

To store filtered content across sessions, click the button in popup to download content filter, and add it to the folder as *ext/filteredMD5s.json*. Like the seen hashes file, the file content is a simple JSON array containing the hashes of the content filtered.
