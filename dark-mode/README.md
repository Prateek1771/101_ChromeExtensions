# Dev Dark Mode

A lightweight Chrome extension that converts light-themed websites into a comfortable dark theme using a clean black, white, and gray palette. Toggle it on or off instantly — no page reload required.

---

## Features

- **Instant Toggle** — Enable or disable dark mode on any website without reloading the page
- **Monochrome Palette** — Pure black, white, and gray color scheme for a consistent look
- **Comprehensive Coverage** — Applies dark styles to:
  - Page backgrounds and text
  - Headings, paragraphs, and links
  - Cards, modals, dropdowns, tooltips, and menus (detected by class name patterns)
  - Tables with alternating row shading
  - Form inputs, buttons, textareas, and selects
  - Scrollbars and text selection highlights
- **Code Block Preservation** — Keeps syntax highlighting intact for `<pre>`, `<code>`, Prism, Highlight.js, CodeMirror, and Monaco editor blocks
- **Media Safe** — Images, videos, canvases, and SVGs are left untouched
- **Synced Preference** — Your on/off state is saved via `chrome.storage.sync` and persists across browser sessions and devices
- **Early Injection** — Content script runs at `document_start` to prevent a flash of light content

---

## Project Structure

```
dark-mode/
├── manifest.json      # Extension configuration (Manifest V3)
├── content.js         # Injected into every page — applies/removes dark CSS
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic — reads/writes toggle state
├── styles.css         # Popup styling (dark themed)
├── icons/
│   ├── icon16.png     # Toolbar icon (16x16)
│   ├── icon48.png     # Extensions page icon (48x48)
│   └── icon128.png    # Chrome Web Store icon (128x128)
└── README.md
```

---

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** using the toggle in the top-right corner
4. Click **Load unpacked**
5. Select the `dark-mode` folder
6. The extension icon will appear in your toolbar

---

## Usage

1. Click the **Dev Dark Mode** icon in the Chrome toolbar
2. Toggle the switch to **On**
3. The current page (and all other open pages) will switch to dark mode instantly
4. Toggle it **Off** to restore the original page styles

Your preference is saved automatically and will persist across browser restarts.

---

## How It Works

### Popup (`popup.html` + `popup.js` + `styles.css`)

The popup provides a minimal UI with a toggle switch. When toggled, it writes the `enabled` state to `chrome.storage.sync`. No page reload is triggered.

### Content Script (`content.js`)

Injected into every page at `document_start`. It does two things:

1. **On page load** — Reads the stored `enabled` value. If `true`, it injects a `<style>` tag with dark mode CSS into the page.
2. **On storage change** — Listens to `chrome.storage.onChanged` so that when the user toggles the popup, dark mode is applied or removed live without any reload.

### Dark Mode CSS

The injected stylesheet uses `!important` overrides to convert light pages to dark. Key design decisions:

| Element | Treatment |
|---|---|
| Backgrounds | `#121212` (near black) |
| Card/panel surfaces | `#1e1e1e` (dark gray) |
| Text | `#cccccc` to `#e0e0e0` (light gray) |
| Headings | `#ffffff` (white) |
| Links | `#b0b0b0` (medium gray, underlined) |
| Borders | `#333333` to `#444444` |
| Inputs/buttons | `#2a2a2a` / `#333333` |
| Code blocks | `#0a0a0a` with inherited syntax colors |
| Images/video | No filter applied |

---

## Color Palette

| Swatch | Hex | Usage |
|---|---|---|
| ![#0a0a0a](https://via.placeholder.com/12/0a0a0a/0a0a0a.png) | `#0a0a0a` | Code block background |
| ![#121212](https://via.placeholder.com/12/121212/121212.png) | `#121212` | Page background |
| ![#1e1e1e](https://via.placeholder.com/12/1e1e1e/1e1e1e.png) | `#1e1e1e` | Cards, panels, surfaces |
| ![#2a2a2a](https://via.placeholder.com/12/2a2a2a/2a2a2a.png) | `#2a2a2a` | Input fields |
| ![#333333](https://via.placeholder.com/12/333333/333333.png) | `#333333` | Borders, buttons |
| ![#444444](https://via.placeholder.com/12/444444/444444.png) | `#444444` | Input borders, scrollbar |
| ![#777777](https://via.placeholder.com/12/777777/777777.png) | `#777777` | Placeholder text |
| ![#999999](https://via.placeholder.com/12/999999/999999.png) | `#999999` | Visited links |
| ![#b0b0b0](https://via.placeholder.com/12/b0b0b0/b0b0b0.png) | `#b0b0b0` | Links |
| ![#cccccc](https://via.placeholder.com/12/cccccc/cccccc.png) | `#cccccc` | Body text |
| ![#e0e0e0](https://via.placeholder.com/12/e0e0e0/e0e0e0.png) | `#e0e0e0` | Primary text |
| ![#ffffff](https://via.placeholder.com/12/ffffff/ffffff.png) | `#ffffff` | Headings, active states |

---

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Save the on/off preference across sessions |
| `activeTab` | Access the currently active tab for scripting |
| `scripting` | Programmatic script injection capability |

The extension also declares `<all_urls>` in `content_scripts.matches` so the dark mode CSS can be injected on any website.

---

## Browser Compatibility

- **Chrome** 88+ (Manifest V3 support)
- **Edge** 88+ (Chromium-based)
- **Brave**, **Opera**, **Vivaldi**, and other Chromium-based browsers

> Firefox uses a different extension format and is not supported without modifications.

---

## Known Limitations

- Websites with aggressive inline styles or Shadow DOM components may not be fully themed
- Some CSS-in-JS frameworks inject styles after page load, which can override the dark theme
- Sites that already have a native dark mode may look odd with double-dark styling
- The `!important` overrides can occasionally conflict with site-specific layouts

---

## Customization

To adjust the dark theme colors, edit the `darkStyles` string in `content.js`. All color values are plain hex codes grouped by section (base, text, links, containers, tables, forms, code, scrollbar, selection).

To change the popup appearance, edit `styles.css`.

---

## License

MIT License. Free to use, modify, and distribute.
