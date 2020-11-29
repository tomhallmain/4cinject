# 4cinject

Simple extension for interfacing with 4Chan DOM.

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

