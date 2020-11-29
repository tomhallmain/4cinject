# 4cinject

Simple extension for interfacing with 4Chan DOM.

# Setup
- Clone the repo
- Open chrome://extensions URL on Chrome browser
- Check option for developer mode
- Select `Load Unpacked`
- Select `ext` folder

# Usage

After installation, find the icon popup in the top right corner of the browser. Click it and see the options available.

When on a thread page, navigate through threads using the arrow keys: ight moves down the thread, left moves up. When using arrow keys, only posts with content (images, WebMs, etc.) are the target of navigation.

While subthreads setting is on, ALT + arrow key jumps to next base post, instead of the next post with content.

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
| Close          | n/a      | Close all expanded content - on thread loads this is the site's default state                      |
| ThreadGraph    | n/a      | Console-based - return the thread graph object                                                     |
| Digits         | n/a      | Console-based - return the digits object                                                           |

