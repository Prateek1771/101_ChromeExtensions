# Clarify

A lightweight Chrome extension that lets you have a full conversation with any webpage using the Groq API (LLaMA 3.3 70B). Ask questions, request summaries, extract key points, or dig into any detail on the page — all without leaving your browser tab.

---

## Features

- **Chat with any webpage** — ask questions about the current page's content in plain language
- **Multi-turn conversation** — the extension maintains conversation history so you can ask follow-up questions naturally
- **AI-powered answers** — powered by LLaMA 3.3 70B (via Groq) for fast, high-quality responses
- **Markdown rendering** — responses render with full markdown formatting: headings, bold/italic, code blocks, lists, blockquotes, and horizontal rules
- **Smart content extraction** — automatically extracts the most relevant text from `<article>`, `<main>`, or `<p>` elements, falling back to the full body
- **Content truncation safety** — page content is capped at 30,000 characters to stay within model context limits
- **Animated typing indicator** — shows a pulsing indicator while the AI is generating a response
- **First-run setup flow** — built-in API key setup screen for new users; no separate configuration step required
- **Settings page** — a dedicated options page to update your API key at any time
- **Unsupported page detection** — gracefully handles Chrome internal pages (`chrome://`) that cannot be read
- **Dark theme UI** — clean, minimal dark interface that fits natively in a Chrome popup

---

## File Structure

```
summery/
├── manifest.json     # Extension manifest (MV3): permissions, scripts, popup, options
├── popup.html        # Popup UI: setup screen, chat view, all CSS styles
├── popup.js          # Orchestrator: initialization, state management, event wiring
├── api.js            # Groq API client: builds messages, calls the API, handles errors
├── ui.js             # UI helpers: addMessage, showTyping, removeTyping
├── markdown.js       # Markdown-to-HTML renderer: custom parser, no dependencies
├── content.js        # Content script: extracts page text, responds to popup messages
├── background.js     # Service worker: placeholder (no background logic needed)
├── options.html      # Settings page: standalone API key management
└── logo.png          # Extension icon (30x30, shown in header and Chrome toolbar)
```

---

## How It Works

### Architecture Overview

Clarify is a Manifest V3 Chrome extension composed of four independent layers that communicate using the Chrome Extension messaging API and storage API.

```
┌─────────────────────────────────────────────────────┐
│                   Chrome Tab (webpage)               │
│  ┌──────────────────────────────────────────────┐   │
│  │  content.js (Content Script)                 │   │
│  │  - Injected into every page on load          │   │
│  │  - Listens for GET_ARTICLE_TEXT message      │   │
│  │  - Extracts text: article > main > p > body  │   │
│  │  - Truncates to 30,000 characters            │   │
│  └────────────────────┬─────────────────────────┘   │
└───────────────────────│─────────────────────────────┘
                        │ chrome.tabs.sendMessage
                        ▼
┌─────────────────────────────────────────────────────┐
│                  popup.html + popup.js               │
│  - Checks chrome.storage.sync for saved API key     │
│  - Shows setup screen if no key found               │
│  - Queries active tab, sends GET_ARTICLE_TEXT       │
│  - Maintains conversationHistory array              │
│  - Calls callGroqAPI() on each user message         │
│  - Delegates rendering to ui.js and markdown.js     │
└───────────────────────┬─────────────────────────────┘
                        │ fetch()
                        ▼
┌─────────────────────────────────────────────────────┐
│           api.js → Groq API (external)              │
│  - Endpoint: api.groq.com/openai/v1/chat/completions│
│  - Model: llama-3.3-70b-versatile                   │
│  - Injects page content into system message         │
│  - Sends full conversation history each request     │
│  - Returns assistant's reply text                   │
└─────────────────────────────────────────────────────┘
```

### Request Flow (step by step)

1. User opens the extension popup.
2. `popup.js` reads `GROQ_API_KEY` from `chrome.storage.sync`.
3. If no key exists, the setup screen is displayed so the user can paste their key.
4. Once a key is confirmed, `popup.js` sends a `GET_ARTICLE_TEXT` message to `content.js` running in the active tab.
5. `content.js` extracts readable text from the page (prioritizing semantic elements) and returns it.
6. The popup displays the word count and enables the input field.
7. The user types a question and presses Enter or clicks Send.
8. `popup.js` pushes the user message into `conversationHistory`, shows the typing indicator, and calls `callGroqAPI()`.
9. `api.js` prepends a system message containing the full page content, then sends the complete message array to the Groq API.
10. The API response is returned, the typing indicator is removed, and `ui.js` renders the reply using `markdown.js`.
11. The assistant's reply is pushed into `conversationHistory` so follow-up questions have full context.

---

## Installation

### Prerequisites

- Google Chrome (version 88 or later, for Manifest V3 support)
- A free Groq API key — get one at [console.groq.com/keys](https://console.groq.com/keys)

### Load as Unpacked Extension

1. Download or clone this repository to your local machine.

2. Open Chrome and navigate to:
   ```
   chrome://extensions
   ```

3. Enable **Developer mode** using the toggle in the top-right corner.

4. Click **Load unpacked**.

5. Select the `summery` folder (the one containing `manifest.json`).

6. The Clarify extension will appear in your extensions list. Pin it to the toolbar for easy access by clicking the puzzle-piece icon and pinning Clarify.

---

## API Key Setup

Clarify requires a Groq API key to call the LLaMA model. Groq provides a generous free tier — no credit card required.

1. Go to [console.groq.com/keys](https://console.groq.com/keys) and sign in (or create a free account).
2. Click **Create API Key**, give it a name, and copy the generated key (it starts with `gsk_`).
3. Open the Clarify popup in Chrome.
4. On the setup screen, paste your key into the **API Key** field and click **Continue**.

Your key is stored securely in `chrome.storage.sync` (local to your Chrome profile, never transmitted anywhere except directly to the Groq API).

To update your key later, right-click the extension icon and choose **Options**, or navigate to `chrome://extensions` and click **Extension options** under Clarify.

---

## Usage Guide

1. Navigate to any webpage you want to chat with.
2. Click the Clarify icon in your Chrome toolbar.
3. Wait for the status indicator to show **"N words loaded"** — this confirms the page content has been read successfully.
4. Type your question in the input field at the bottom and press **Enter** or click **Send**.
5. The AI will respond based solely on the content of the current page.
6. Ask follow-up questions freely — the conversation history is maintained for the entire session.

### Example questions you can ask

- "What is this article about?"
- "Summarize the main points in bullet form."
- "What does the author say about X?"
- "List all the steps mentioned in the tutorial."
- "Are there any prices or dates mentioned?"
- "What is the conclusion of this page?"

### Notes

- The extension cannot read Chrome internal pages (`chrome://`, `chrome-extension://`) or the Chrome Web Store.
- If a page has no extractable text (e.g., a pure image or canvas-based page), the popup will notify you.
- If you open the popup before a page has fully loaded, refresh the page and reopen the popup.
- Conversation history resets each time you close and reopen the popup.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension Platform | Chrome Extensions API — Manifest V3 |
| AI Model | LLaMA 3.3 70B Versatile (via Groq) |
| API Protocol | OpenAI-compatible REST API (`/v1/chat/completions`) |
| Frontend | Vanilla HTML, CSS, JavaScript (no frameworks) |
| Markdown Rendering | Custom zero-dependency parser (`markdown.js`) |
| Storage | `chrome.storage.sync` for API key persistence |
| Messaging | `chrome.tabs.sendMessage` / `chrome.runtime.onMessage` |
| Styling | Pure CSS with CSS custom properties, dark theme |

---

## File Descriptions

### `manifest.json`

The extension's configuration file, using Manifest Version 3. Declares the following:

- **Permissions:** `scripting`, `activeTab`, `storage` — the minimum required to read the active tab's content and persist the API key.
- **Host permissions:** `<all_urls>` — needed for `content.js` to be injected into all websites, and for the popup to `fetch()` the Groq API directly.
- **Action:** Points to `popup.html` as the default popup and `logo.png` as the toolbar icon.
- **Content scripts:** Injects `content.js` into every page (`<all_urls>`) at document load.
- **Background:** Registers `background.js` as a service worker (currently a placeholder).
- **Options page:** Registers `options.html` for the settings screen accessible from the extensions management page.

### `popup.html`

The main popup window (420 × 520 px). Contains all CSS styles inline (no external stylesheet). Defines two mutually exclusive views:

- **Setup screen** (`#setup`): Shown when no API key is stored. Has a password input for the key and a Continue button.
- **Chat view** (`#chat-view`): The main chat interface. Contains a scrollable messages container and a fixed input bar at the bottom.

Loads scripts in dependency order: `markdown.js` → `api.js` → `ui.js` → `popup.js`.

### `popup.js`

The central orchestrator. Responsibilities:

- **Initialization:** Reads the API key from `chrome.storage.sync` on popup open. Shows the setup screen or chat view accordingly.
- **API key saving:** Writes the entered key to sync storage when the user clicks Continue; handles Enter key as a shortcut.
- **Page content loading:** Queries the active tab and sends a `GET_ARTICLE_TEXT` message to `content.js`. Displays word count and enables the input field on success. Handles edge cases: `chrome://` pages, missing content scripts, empty responses.
- **Message sending:** Appends the user message to `conversationHistory`, shows the typing indicator, calls `callGroqAPI()`, and appends the reply. Re-enables the input after each exchange.
- **State management:** Holds three module-level variables — `apiKey`, `pageContent`, and `conversationHistory` — which persist for the popup session.

### `api.js`

The Groq API client. Exports the single function `callGroqAPI(apiKey, pageContent, conversationHistory)`.

- Constructs a system message embedding the full page content between `---PAGE CONTENT---` delimiters.
- Prepends the system message to the conversation history array before each API call, ensuring the model always has page context.
- Calls `https://api.groq.com/openai/v1/chat/completions` with model `llama-3.3-70b-versatile`, temperature `0.7`, and `max_tokens: 1024`.
- Handles HTTP errors explicitly: throws a user-friendly message for 401 (invalid key) and a detailed message including status code for all other errors.

### `ui.js`

DOM manipulation helpers for the chat messages container. Exports three functions:

- **`initUI(messagesContainer)`** — stores a reference to the `#messages` DOM element. Must be called once before any other UI function.
- **`addMessage(role, text)`** — creates and appends a message bubble. For `assistant` role, renders `text` through `renderMarkdown()` and sets `innerHTML`. For `user` and `system` roles, sets `textContent` (safe, no XSS risk). Automatically scrolls the messages container to the bottom.
- **`showTyping()`** — appends an animated three-dot typing indicator and returns the element reference.
- **`removeTyping(el)`** — removes the typing indicator element from the DOM.

### `markdown.js`

A lightweight, zero-dependency markdown-to-HTML parser. Exports `renderMarkdown(text)`. Processing pipeline (in order):

1. HTML-encodes `&`, `<`, `>` to prevent XSS.
2. Converts fenced code blocks (`` ```lang\ncode\n``` ``) to `<pre><code>` blocks.
3. Converts inline code (`` `code` ``) to `<code>` spans.
4. Converts `###`, `##`, `#` headings to `<h3>`, `<h2>`, `<h1>`.
5. Converts `---` to `<hr>`.
6. Converts `***text***` to `<strong><em>`, `**text**` to `<strong>`, `*text*` to `<em>`.
7. Converts `> text` blockquotes to `<blockquote>`.
8. Converts unordered lists (`-` or `*` prefixed lines) to `<ul><li>` blocks.
9. Converts ordered lists (`1.` prefixed lines) to `<ol><li>` blocks.
10. Wraps remaining double-newline-separated paragraphs in `<p>` tags, converting single newlines within a paragraph to `<br>`.

### `content.js`

The content script, injected automatically into every webpage by the browser. Listens for the `GET_ARTICLE_TEXT` message from the popup.

Content extraction priority order:
1. `<article>` element — semantic article content
2. `<main>` element — primary page content region
3. All `<p>` elements — joined with newlines (covers most editorial pages)
4. `document.body.innerText` — full page text as a last resort

Truncates extracted text to 30,000 characters before sending it back, keeping API calls within practical context limits.

### `background.js`

A Manifest V3 service worker. Currently a no-op placeholder — all extension logic is handled by the popup and content script. The file exists to satisfy the manifest declaration and can be extended in the future for features like context menus or cross-tab state.

### `options.html`

A standalone settings page accessible from `chrome://extensions` → Clarify → Extension options. Allows the user to view and update their stored Groq API key at any time. On load, reads the current key from `chrome.storage.sync` and pre-fills the password input. On save, writes the new key to sync storage and displays a success or error message. The page auto-hides the confirmation message after 3 seconds.

### `logo.png`

The extension icon displayed in both the Chrome toolbar and the popup header. Used as the `default_icon` in the manifest action declaration.

---

## Groq API Details

| Property | Value |
|---|---|
| API Endpoint | `https://api.groq.com/openai/v1/chat/completions` |
| Model | `llama-3.3-70b-versatile` |
| Temperature | `0.7` |
| Max Tokens per Response | `1,024` |
| Max Page Content | `30,000 characters` |
| API Key Format | Starts with `gsk_` |
| Pricing | Free tier available at [console.groq.com](https://console.groq.com) |

The Groq API is OpenAI API-compatible, meaning the request and response format follows the standard `chat/completions` schema. The extension calls the API directly from the popup using `fetch()` — no backend server or proxy is involved.

---

## Limitations

- **Session-only history** — conversation history is held in memory and resets when the popup is closed.
- **30,000 character content cap** — very long pages are truncated. The most important content (typically at the top) is preserved.
- **No streaming** — responses appear all at once after the full completion is received.
- **Chrome only** — this extension targets the Chrome Extensions API (Manifest V3) and is not compatible with Firefox or Safari without modification.
- **No chrome:// pages** — browser internal pages cannot be accessed by content scripts by design.

---

## License

This project is open source. Use it, fork it, and build on it freely.
