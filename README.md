# 4cinject

A Chromium extension (Manifest V3) that adds keyboard navigation, catalog
filtering and seen-content tracking to 4chan boards.

## Setup

Requires Chrome or another Chromium browser, version 111 or later.

1. Clone the repo.
2. Open `chrome://extensions` and turn on developer mode.
3. Click **Load unpacked** and select the `ext` folder.
4. Optionally, add the data files described under
   [Optional files](#optional-files), then click reload on the extension
   card.

After changing any file in `ext`, reload the extension on
`chrome://extensions` and reload open board tabs.

## What it does on each page

- **All board pages:**
  - Switches the site to the Tomorrow style.
  - Clears ad content.
- **Board index:** redirects to the board's catalog.
- **Catalog:**
  - Sets 4chan's catalog options to date order (4chan's `date` order),
    extended mode and small thumbnails, if date order isn't already set.
    The catalog reloads once when this happens.
  - With **CatalogFilter** on:
    - Removes threads matching a thread filter.
    - Colors the rest: teal for challenge threads (YLYL, "u lose"), green for
      image-heavy threads, dark blue for threads containing a link.
  - With **TestHash** on, checks each thread's image:
    - A thread whose teaser or image is filtered is removed.
    - A thread whose image is also another thread's image gets a red border.
      This only covers images first seen on an earlier catalog load.
    - Other threads get a **Filter** link. Clicking it removes the thread,
      adds its image to the content filter, and adds its teaser text to the
      teaser filters. Later catalog loads remove threads whose teaser
      contains a filtered teaser text.
  - Applies text transforms to thread teasers.
  - With **HighlightNew** on, outlines threads that were not in the catalog
    at its previous load.
- **Thread:**
  - Shows the thread's best "digits" (post IDs ending in repeated digits)
    below the top navigation links.
  - With **Subthreads** on, moves each reply under the post it replies to.
  - With **HighlightNew** on, gives posts made since the last load of the
    thread a blue-gray background.
  - Applies text transforms to the subject and post messages.
  - With **TestHash** on, checks each file against your seen and filtered
    content (see [Content analysis](#content-analysis)), and shows the share
    of seen content.
  - On /pol/: a report of flags and poster IDs that used more than one flag,
    the number of posts by OP, and each poster ID's post count.
  - On /biz/: the number of posts by OP, and each poster ID's post count.
  - Expanded videos are unmuted and set to the Volume setting.
  - With **AutoExpand** on, expands all images, skipping seen content, one
    second after the page loads.

## Keyboard

On thread pages. Keys typed into text fields are left alone.

| Keys | Action |
|------|--------|
| Right / Left arrow | Next / previous post with content, skipping seen content (red/orange borders). Expands it if AutoExpand is on, and shows it fullscreen if Fullscreen is on. |
| Alt + Right / Left arrow | Next / previous *base* post with content (one not nested under another by Subthreads) |
| Shift + Right arrow | Show the current content fullscreen |
| Shift + Left arrow | Exit fullscreen |
| Shift + Space / Alt + Space | Next / previous new post (with HighlightNew) |

On /gif/ and /wsg/, the arrow keys work on videos:
- Right / Left open the next / previous video and close the current one.
- Shift + Right shows the current video fullscreen.
- Shift + Left closes it.

## Popup

Click the extension icon to open the popup. Buttons act on the active tab.

| Control | Action |
|---------|--------|
| Expand | Turns AutoExpand on and reloads the page |
| Close | Turns AutoExpand off and reloads the page |
| Auto Expand | Toggles AutoExpand; reloads thread pages |
| Digits / MaxDigits | Logs the thread's digits / best digits to the page console |
| Thread Graph | Logs the thread's reply graph to the page console |
| Reveal Subthreads | Toggles Subthreads. Turning it on applies it now; turning it off reloads the page. |
| Extract Content | Expands all content, then replaces the thread with only its images and (paused) videos |
| Test Hash | Toggles TestHash. Turning it on checks the thread now. |
| Full Screen | Toggles Fullscreen |
| Catalog Filter | Toggles CatalogFilter. Turning it on applies it now; turning it off reloads the catalog. |
| Highlight New | Toggles HighlightNew |
| Audio Volume | Volume for expanded videos with audio |
| Thread Filters | One regex per line, saved when the box loses focus. Lines that are not valid regexes are listed and nothing is saved. |
| Post Text Transforms | See [Text transforms](#text-transforms) |
| Content Filter | See [Content filtering](#content-filtering) |

### Settings

Settings are stored in the site's local storage, so `4chan.org` and
`4channel.org` each have their own.

| Setting | Default | |
|---------|---------|-|
| AutoExpand | off | Expand all images on thread load |
| Fullscreen | off | Show content fullscreen when moving to it with the arrow keys |
| Subthreads | on | Nest replies under the posts they reply to |
| CatalogFilter | on | Apply thread filters and colors on the catalog |
| TestHash | on | Check content and catalog thread images against seen and filtered hashes |
| HighlightNew | on | Highlight posts that are new since the last load of the thread, and catalog threads that are new since the last load of the catalog |
| Volume | 50% | Volume of expanded videos |
| Thread filters | none | Regexes; catalog threads whose text matches any of them are removed |
| Text transforms | none | See below |

### Text transforms

Entries have the form `regex==replacement` and are separated by newlines or
commas, so a pattern cannot contain a comma. Each regex is applied globally
to the HTML of catalog teasers, thread subjects and post messages. Patterns
can therefore match markup, and replacements can use `$1` etc.

Entries with an empty pattern, no `==`, or an invalid regex are skipped. A
thread page reloads when the transforms are saved.

## Content analysis

A lot of content on the site is reposted. To mark files you already have,
create `ext/md5s.json` with a JSON array of the files' MD5 hashes, each
base64-encoded from the binary digest. This is the format 4chan uses in its
`data-md5` attributes. For example:

```json
[
  "f7oN1WfuSYjwtGao7bDK5Q==",
  "2pyVwevIJV9BS7VWpvuVtw=="
]
```

To generate the file from a folder of saved files:

```sh
python3 -c 'import base64, hashlib, json, pathlib, sys; print(json.dumps([base64.b64encode(hashlib.md5(p.read_bytes()).digest()).decode() for p in pathlib.Path(sys.argv[1]).rglob("*") if p.is_file()], indent=2))' /path/to/saved/files > ext/md5s.json
```

With TestHash on, each file in a thread is checked when the thread loads:

| Result | Mark |
|--------|------|
| In `md5s.json` | Red border |
| Seen on an earlier page load | Orange border |
| In the content filter | Post removed |
| Otherwise | None |

Posts that are not removed get a **Filter** link next to the file name. Top-level
posts also get **Filter All** (filters every file in the post and its
nested replies) and **Download All** (downloads those files).

## Content filtering

Clicking **Filter** on a post adds its file's hash to the content filter
and removes the post. The content filter is kept in the extension's storage.

**Editing in the popup.** The Content Filter box shows the whole list, one
hash per line. To change it:

1. Edit the box and click **Save Content Filter**.
   - Save is enabled only after the list has loaded.
   - Lines that are not base64 MD5 hashes are listed and nothing is saved.
2. The popup shows how many entries would be added and removed. Nothing is
   stored until you click **Confirm**.
   - Emptying the list, or removing more than 10 entries or more than a
     quarter of it, also asks you to type the number of entries being
     removed before Confirm is enabled.
3. If the list changed after the popup opened, for example from a Filter
   click on a page, the save is refused and your text is kept. Click Save
   again to review your text against the current list.

**Backups.** Each save keeps the previous list as a backup; the last 5 are
kept. **Load Previous Version** puts the next older backup in the box. Save
and Confirm it to restore it.

**`ext/filteredMD5s.json`.** The extension's storage is cleared when the
extension is removed. To keep the list outside it, click **Download Content
Filter (Hash)** and save the file as `ext/filteredMD5s.json`. Its hashes are
added to the content filter each time the extension starts. So a hash that
is in this file comes back after a restart even if you removed it in the
popup; remove it from the file as well.

## Optional files

All of these are gitignored.

| File | Contents |
|------|----------|
| `ext/md5s.json` | JSON array of base64 MD5 hashes of files you already have |
| `ext/filteredMD5s.json` | JSON array of base64 MD5 hashes to add to the content filter |
| `ext/filters/threadFilters.json` | JSON array of regex strings, e.g. `["pattern one", "(?:foo\|bar)baz"]`. Used as the thread filters when none are set. |
| `ext/filters/transforms.txt` | Text transforms in the format above, used when none are set |

A missing or invalid file is treated as empty, with a warning in the
extension's service worker console.

## Development

The extension is plain JavaScript with no build step. Tooling is for static
checks only:

```sh
npm install
npm run lint
```
