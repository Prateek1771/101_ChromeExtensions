# Cloak

A minimal, zero-dependency Chrome extension that extracts design assets — colors, fonts, and images — from any webpage with a single click.

---

## Overview

Cloak is a browser extension built for designers, developers, and anyone who wants to quickly reverse-engineer the visual identity of a website. Open the popup on any page and Cloak immediately scans the live DOM to surface every color used, every typeface loaded, and every image or media asset present — all without leaving the browser.

---

## Features

### Colors
- Scans every element in the DOM using `getComputedStyle` to collect `color`, `background-color`, and `border-color` values
- Deduplicates colors and sorts them by usage frequency so the most dominant colors appear first
- Converts all `rgb()` and `rgba()` values to clean hex codes
- Click any color row to copy its hex value to the clipboard instantly
- "Copied" badge confirms the copy action with a brief animation

### Fonts
- Reads the computed `font-family` stack from every element
- Deduplicates fonts and records all font weights and styles in use across the page
- Click a font row to copy the font name to the clipboard
- Down-arrow button opens a Google Fonts search for the font in a new tab

### Assets
- Collects images from `<img src>`, `<picture> <source srcset>`, CSS `background-image` URLs, `<video src>`, `<video poster>`, `<video source>`, favicon and icon `<link>` tags, and Open Graph / Twitter Card meta tags
- Serializes inline `<svg>` elements and makes them available for download as `.svg` files
- Shows a live thumbnail preview for every non-video asset
- Displays asset type label (`image`, `svg`, `gif`, `icon`, `video`)
- Click the filename to copy the asset URL (or raw SVG markup for inline SVGs) to the clipboard
- Down-arrow button downloads the asset — inline SVGs download as a proper `.svg` file; all other assets open in a new tab

### General
- Clean dark-mode popup UI — 360 px wide, scrollable panels capped at 500 px height
- Tab-based layout to switch between Colors, Fonts, and Assets panels
- Loading state shown while the page scan runs; empty state shown if nothing is found
- Broken image thumbnails are silently removed from the list

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension Platform | Chrome Extension Manifest V3 |
| Scripting | Vanilla JavaScript (ES2020+) |
| Styling | Plain CSS3 |
| Markup | HTML5 |
| Browser APIs | `chrome.tabs`, `chrome.scripting`, `chrome.downloads`, `navigator.clipboard` |
| Build Tooling | None — runs directly from source |
| Dependencies | Zero — no npm, no bundler, no frameworks |

---

## Project Structure

```
focus/
├── manifest.json       # Extension manifest (MV3) — declares permissions, icons, and popup
├── popup.html          # Extension popup shell — tab structure and panel containers
├── popup.js            # All extension logic — page scanner, renderers, clipboard, downloads
├── popup.css           # Dark-mode popup styles
├── icon16.png          # Toolbar icon (16x16)
├── icon48.png          # Extension management page icon (48x48)
└── icon128.png         # Chrome Web Store icon (128x128)
```

### File Responsibilities

**`manifest.json`**
Declares the extension to Chrome. Uses Manifest V3. Requests three permissions:
- `activeTab` — to access the current tab's identity
- `scripting` — to inject and execute the `scanPage` function in the page context
- `downloads` — to trigger file downloads via `chrome.downloads.download`

**`popup.js`**
Contains all logic split into four concerns:
1. Tab switching — attaches click handlers to the three tab buttons and swaps active CSS classes
2. `scanPage()` — runs inside the page context via `chrome.scripting.executeScript`. Walks the entire DOM, reads computed styles, collects assets from all sources, and returns a plain serializable object `{ colors, fonts, assets }`
3. `extract()` — the entry point called on popup load. Queries the active tab, injects `scanPage`, receives results, hides the loading state, and calls the three render functions
4. `renderColors()`, `renderFonts()`, `renderAssets()` — build DOM nodes and attach interaction handlers for copy and download

**`popup.css`**
Single-file stylesheet covering the container, tab bar, color items, font items, asset items, loading/empty states, and a custom scrollbar. Uses CSS transitions for hover and copy-badge animations.

---

## Installation

Cloak is a local unpacked extension. No build step is required.

### Prerequisites
- Google Chrome (or any Chromium-based browser that supports Manifest V3 extensions, such as Edge or Brave)

### Steps

1. Download or clone this repository to your local machine.

2. Open Chrome and navigate to the extensions page:
   ```
   chrome://extensions
   ```

3. Enable **Developer mode** using the toggle in the top-right corner of the page.

4. Click **Load unpacked**.

5. Select the `focus` folder (the one that contains `manifest.json`).

6. The **Cloak** extension will appear in your extensions list and its icon will be pinned to the Chrome toolbar.

---

## Usage

1. Navigate to any website you want to inspect.

2. Click the **Cloak** icon in the Chrome toolbar. The popup opens and immediately begins scanning the page ("Scanning page..." message is shown briefly).

3. Once the scan completes, the **Colors** tab is shown by default with all colors sorted by usage frequency.

4. Switch between tabs to explore:
   - **Colors** — click any row to copy the hex code
   - **Fonts** — click a font name to copy it; click the down-arrow to search it on Google Fonts
   - **Assets** — click a filename to copy the URL or SVG source; click the down-arrow to download or open the asset

---

## How It Works

### Architecture

Cloak follows the standard Chrome Extension popup architecture:

```
[Chrome Toolbar Click]
        |
        v
  popup.html loads
        |
        v
  popup.js executes
        |
        v
  extract() called
        |
  chrome.scripting.executeScript injects scanPage()
        |
        v
  scanPage() runs IN THE PAGE CONTEXT
  (has full access to live DOM and computed styles)
        |
  returns serialized { colors, fonts, assets }
        |
        v
  renderColors() / renderFonts() / renderAssets()
  build UI in the popup DOM
```

### Page Scanner — `scanPage()`

The scanner runs entirely inside the inspected page via `chrome.scripting.executeScript`. This is necessary because computed style data (`getComputedStyle`) and the live DOM are only accessible from within the page context — not from the extension popup.

The function:
1. Iterates over every element matching `body *` and calls `getComputedStyle`
2. Parses `color`, `backgroundColor`, and `borderColor` into normalized hex values
3. Reads `fontFamily`, `fontWeight`, and `fontStyle` to build a deduplicated font map
4. Extracts `background-image` URL references via regex
5. Queries `img`, `video`, `picture source`, `link[rel*="icon"]`, and OG meta tags for asset URLs
6. Serializes inline `<svg>` elements to base64 data URLs for preview, and stores raw SVG markup for clean file downloads
7. Returns a plain object (Maps and Sets are converted to arrays/objects before return to survive the structured-clone serialization boundary between page and extension contexts)

### Color Normalization

- `rgba(0, 0, 0, 0)` and `transparent` are excluded (fully transparent)
- `rgb(r, g, b)` and `rgba(r, g, b, a)` are converted to `#rrggbb` hex
- Shorthand hex `#rgb` is expanded to `#rrggbb`
- All hex values are lowercased for deduplication, uppercased for display

### Asset Filtering

- `data:` URIs (except inline SVGs which are generated internally) are excluded from the list
- `blob:` URIs are excluded
- Assets that fail to load their thumbnail are silently removed from the panel

---

## Permissions Reference

| Permission | Why It Is Needed |
|---|---|
| `activeTab` | Identifies the currently active tab to inject the scanner script |
| `scripting` | Executes `scanPage()` inside the page context via `chrome.scripting.executeScript` |
| `downloads` | Triggers file downloads via `chrome.downloads.download` (used for inline SVG exports) |

---

## Browser Compatibility

| Browser | Supported |
|---|---|
| Google Chrome 88+ | Yes (Manifest V3 minimum) |
| Microsoft Edge 88+ | Yes |
| Brave | Yes |
| Firefox | No (uses different extension API; MV3 support is partial) |
| Safari | No |

---

## Contributing

Contributions are welcome. The codebase is intentionally dependency-free to keep the extension auditable and lightweight. Before opening a pull request, please keep these principles in mind:

- Do not introduce a build step, bundler, or framework unless there is a compelling reason
- Keep the total extension size small — users are trusting the extension to run in their page context
- All logic should remain auditable in plain source files
- Test manually in Chrome against a variety of page types before submitting

### Suggested areas for contribution
- Support for CSS custom properties (`--var`) color extraction
- Copy-all button to export a full color palette as CSS variables or a JSON file
- Filter or search within long asset lists
- Font preview rendered in the actual detected typeface
- Firefox / MV2 compatibility layer

---

## License

No license file is included in this repository. All rights reserved by the author unless otherwise stated. Contact the repository owner before using this code in other projects.
