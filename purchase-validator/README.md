# Purchase Validator - Chrome Extension

A Chrome extension that helps you avoid impulse purchases. When you visit a product page on a supported shopping site, it scrapes the product details, uses AI to generate tailored questions that probe whether you truly need the item, evaluates your answers, and delivers a **Buy It / Skip It** verdict with a 1-10 need score.

## How It Works

1. **Visit a product page** on any supported shopping site
2. **Click the extension icon** — it automatically detects and displays the product
3. **Click "Validate This Purchase"** — AI generates 5 questions (4 multiple-choice + 1 open-ended) tailored to the specific product
4. **Answer honestly** — questions probe financial readiness, existing alternatives, urgency, emotional state, and practical need
5. **Get your verdict** — AI analyzes your answers and returns a Buy/Skip recommendation, a 1-10 need score, reasoning, and actionable tips

## Supported Shopping Sites

| Site | Regions | Product Detection |
|------|---------|-------------------|
| Amazon | .com, .in, .co.uk | `/dp/`, `/gp/product/` URLs |
| Flipkart | .com | `/p/` URLs |
| eBay | .com | `/itm/` URLs |
| Walmart | .com | `/ip/` URLs |
| AliExpress | .com | `/item/` URLs |

Each site has a dedicated scraper config with CSS selector fallbacks and universal meta tag fallback (`og:title`, `product:price:amount`, `og:image`) for resilience against layout changes.

## Tech Stack

- **Chrome Extension Manifest V3** with ES module service worker
- **Vanilla HTML/CSS/JS** — no frameworks, no build step
- **Groq API** (free tier) with `llama-3.3-70b-versatile` model
- **JSON mode** for structured AI responses

## Installation

### 1. Get the code

```bash
git clone <repo-url>
cd validator
```

Or download and extract the ZIP.

### 2. Load in Chrome

1. Open `chrome://extensions/` in Chrome
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `validator` folder

### 3. Set your API key

1. Click the extension icon in the toolbar, or right-click it and select **Options**
2. Enter your Groq API key
3. Click **Save API Key**

To get a free Groq API key, visit [console.groq.com/keys](https://console.groq.com/keys). The free tier provides generous rate limits sufficient for personal use.

## File Structure

```
validator/
  manifest.json              # Extension manifest (Manifest V3)
  background.js              # Service worker — message router, calls Groq API
  content.js                 # Injected into shopping sites, scrapes product data
  lib/
    groq.js                  # Groq API client (question generation + evaluation)
  sites/
    amazon.js                # Selector config for Amazon
    flipkart.js              # Selector config for Flipkart
    ebay.js                  # Selector config for eBay
    walmart.js               # Selector config for Walmart
    aliexpress.js            # Selector config for AliExpress
  popup/
    popup.html               # Extension popup UI
    popup.css                # Popup styles
    popup.js                 # Popup logic and state management
  options/
    options.html             # API key settings page
    options.js               # Settings logic
  icons/
    icon16.png               # Toolbar icon
    icon48.png               # Extensions page icon
    icon128.png              # Chrome Web Store icon
```

## Architecture

```
┌─────────────┐     GET_PRODUCT_DATA     ┌──────────────┐
│   popup.js  │ ◄──────────────────────► │  content.js  │
│  (UI layer) │                          │  (scraper)   │
└──────┬──────┘                          └──────┬───────┘
       │                                        │
       │  GENERATE_QUESTIONS                    │  reads from
       │  EVALUATE_ANSWERS                      │  sites/*.js
       │                                        │  configs
       ▼                                        │
┌──────────────┐         fetch           ┌──────┴───────┐
│ background.js│ ──────────────────────► │   Groq API   │
│ (svc worker) │ ◄────────────────────── │  (Llama 3.3) │
└──────────────┘       JSON response     └──────────────┘
       │
       │  chrome.storage.local
       ▼
┌──────────────┐
│  Evaluation  │
│   History    │
│  (last 50)   │
└──────────────┘
```

**Message flow:**
1. Popup opens → sends `GET_PRODUCT_DATA` to the content script in the active tab
2. Content script finds the matching site config from `window.__PV_SITES`, scrapes the page, returns product data
3. User clicks "Validate" → popup sends `GENERATE_QUESTIONS` to the background service worker
4. Background worker calls Groq API with product context → returns 5 structured questions
5. User answers all questions → popup sends `EVALUATE_ANSWERS` to the background worker
6. Background worker calls Groq API with Q&A pairs → returns verdict, score, reasoning, and tips
7. Result is displayed and saved to `chrome.storage.local`

## Popup UI States

The popup cycles through these states based on context:

| State | Shown When |
|-------|------------|
| **Loading** | Scanning the current tab for product data |
| **No Product** | Current page is not a recognized product page |
| **No API Key** | Groq API key has not been configured |
| **Product Detected** | Product found — shows title, price, image, and site badge |
| **Questions** | AI-generated questions displayed one at a time with progress bar |
| **Evaluating** | AI is analyzing answers |
| **Result** | Verdict badge (green/red), score ring, reasoning, and tips |

## API Usage

The extension makes **2 API calls per validation**:

1. **Question generation** — sends product details, receives 5 structured questions
2. **Answer evaluation** — sends Q&A pairs, receives verdict and analysis

Both calls use Groq's JSON mode (`response_format: { type: "json_object" }`) for reliable structured output. The model used is `llama-3.3-70b-versatile` on Groq's free tier.

**Approximate token usage per validation:** ~1,500 input + ~500 output tokens across both calls.

## Adding a New Shopping Site

1. Create a new file in `sites/` (e.g., `sites/bestbuy.js`):

```js
window.__PV_SITES = window.__PV_SITES || [];
window.__PV_SITES.push({
  name: "Best Buy",
  matchPattern: /bestbuy\.com/,
  isProductPage() {
    return window.location.pathname.includes("/site/") &&
      !!document.querySelector("h1.heading-5");
  },
  selectors: {
    title: "h1.heading-5, .sku-title h1",
    price: ".priceView-customer-price span",
    description: ".product-description",
    category: ".breadcrumb",
    image: ".primary-image img"
  }
});
```

2. Add the new file to `manifest.json` under `content_scripts[0].js` (before `content.js`)
3. Add the host pattern to both `host_permissions` and `content_scripts[0].matches`:
   ```json
   "https://*.bestbuy.com/*"
   ```
4. Reload the extension in `chrome://extensions`

## Privacy

- **No data leaves your browser** except API calls to Groq for question generation and answer evaluation
- Product data and answers are sent to Groq's API only when you click "Validate This Purchase"
- Your API key is stored locally in `chrome.storage.sync`
- Evaluation history (last 50) is stored locally in `chrome.storage.local`
- No analytics, tracking, or third-party services

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Extension icon is grayed out | Make sure you're on a supported shopping site's product page, not a search/category page |
| "No product detected" on a product page | The site may have updated its layout. Check the site config selectors in `sites/` |
| API error 401 | Your Groq API key is invalid or expired. Get a new one at [console.groq.com/keys](https://console.groq.com/keys) |
| API error 429 | Rate limit exceeded. Wait a minute and try again |
| Questions seem generic | The AI tailors questions to scraped product details. If the scraper missed the description/category, questions will be more generic |

## License

MIT
