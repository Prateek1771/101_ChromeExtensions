const STYLE_ID = "dev-dark-mode";

const darkStyles = `
/* ===== BASE ===== */
html, body {
  background-color: #121212 !important;
  color: #e0e0e0 !important;
}

/* ===== TEXT & HEADINGS ===== */
h1, h2, h3, h4, h5, h6 {
  color: #ffffff !important;
}

p, span, li, td, th, label, legend, figcaption, blockquote, dt, dd, summary {
  color: #cccccc !important;
}

/* ===== LINKS ===== */
a {
  color: #b0b0b0 !important;
  text-decoration: underline !important;
}
a:visited {
  color: #999999 !important;
}
a:hover {
  color: #ffffff !important;
}

/* ===== CONTAINERS & SURFACES ===== */
div, section, article, aside, main, header, footer, nav, form, fieldset, details {
  background-color: transparent !important;
  border-color: #333333 !important;
}

/* ===== CARDS & PANELS ===== */
[class*="card"], [class*="Card"],
[class*="panel"], [class*="Panel"],
[class*="modal"], [class*="Modal"],
[class*="dialog"], [class*="Dialog"],
[class*="dropdown"], [class*="Dropdown"],
[class*="popover"], [class*="Popover"],
[class*="tooltip"], [class*="Tooltip"],
[class*="menu"], [class*="Menu"] {
  background-color: #1e1e1e !important;
  color: #cccccc !important;
  border-color: #333333 !important;
}

/* ===== TABLES ===== */
table {
  border-color: #333333 !important;
}
thead, tfoot {
  background-color: #1e1e1e !important;
}
tr {
  background-color: transparent !important;
  border-color: #333333 !important;
}
tr:nth-child(even) {
  background-color: rgba(255,255,255,0.03) !important;
}

/* ===== FORMS & INPUTS ===== */
input, textarea, select, button {
  background-color: #2a2a2a !important;
  color: #e0e0e0 !important;
  border-color: #444444 !important;
}
input::placeholder, textarea::placeholder {
  color: #777777 !important;
}
button, [role="button"], input[type="submit"], input[type="button"] {
  background-color: #333333 !important;
  color: #e0e0e0 !important;
}

/* ===== CODE BLOCKS (preserve syntax highlighting) ===== */
pre, code, .hljs, [class*="prism"], [class*="highlight"], [class*="code-block"],
[class*="CodeMirror"], [class*="monaco"] {
  background-color: #0a0a0a !important;
  color: inherit !important;
  border-color: #333333 !important;
}

/* ===== MEDIA (don't break images/videos) ===== */
img, video, canvas, svg, picture {
  filter: none !important;
}

/* ===== SCROLLBAR ===== */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-track {
  background: #121212;
}
::-webkit-scrollbar-thumb {
  background: #444444;
  border-radius: 5px;
}
::-webkit-scrollbar-thumb:hover {
  background: #555555;
}

/* ===== SELECTION ===== */
::selection {
  background-color: #444444 !important;
  color: #ffffff !important;
}

/* ===== MISC ===== */
hr {
  border-color: #333333 !important;
}
iframe {
  opacity: 0.95;
}
`;

function applyDarkMode() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = darkStyles;
  (document.head || document.documentElement).appendChild(style);
}

function removeDarkMode() {
  const existing = document.getElementById(STYLE_ID);
  if (existing) existing.remove();
}

// Apply on load based on stored preference
chrome.storage.sync.get(["enabled"], (result) => {
  if (result.enabled) applyDarkMode();
});

// Listen for live toggle changes (no reload needed)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    if (changes.enabled.newValue) {
      applyDarkMode();
    } else {
      removeDarkMode();
    }
  }
});
