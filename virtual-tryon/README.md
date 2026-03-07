# AI Virtual Try-On - Chrome Extension

A Chrome Extension that lets users upload their photo, select clothing items from any website, and see how those items look on them using AI-powered image generation.

## Features

- **Photo Upload** - Drag & drop or click to browse. Supports PNG, JPEG, and WebP formats.
- **Automatic Image Extraction** - Extracts all images from the current webpage, including `<img>` tags, CSS backgrounds, `<canvas>` elements, SVGs, meta tags, and more.
- **Image Carousel** - Browse extracted clothing images with previous/next navigation.
- **AI Virtual Try-On** - Sends your photo and the selected garment to the API4AI virtual try-on API and displays the result.
- **Side-by-Side Comparison** - View your original photo alongside the AI-generated try-on result.
- **Download Results** - Save the generated image as a PNG file.
- **Rate Limiting & Retry Logic** - Built-in rate limiter (5 requests/60s), exponential backoff with up to 3 retries.
- **Settings Page** - Configure your API4AI API key to switch from the free demo to the production endpoint.

## Tech Stack

- **Vanilla JavaScript** - No frameworks or build tools
- **HTML5 / CSS3** - Glassmorphism UI with dark theme
- **Chrome Extension Manifest V3**
- **API4AI Virtual Try-On API**

## Project Structure

```
virtual-tryon/
├── manifest.json       # Extension configuration (Manifest V3)
├── popup.html          # Main popup UI
├── popup.js            # Popup logic, state management, API calls
├── popup.css           # Styling (glassmorphism, animations)
├── content.js          # Content script for image extraction
├── options.html        # Settings page UI
├── options.js          # Settings page logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Installation

### Local Development

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked** and select the `virtual-tryon` directory.
5. The extension icon will appear in your toolbar.

### From Chrome Web Store

Search for **"AI Virtual Try-On"** and click **Add to Chrome**.

## Usage

1. Navigate to any webpage with clothing images (e.g., an e-commerce site).
2. Click the extension icon to open the popup.
3. The extension automatically extracts images from the current page.
4. **Step 1** - Upload your photo using drag & drop or the file picker.
5. **Step 2** - Browse the extracted images using the carousel and select a garment.
6. Click **"Try It On"** and wait for the AI to process.
7. View the side-by-side result and download if desired.
8. Click **"Reset"** to start over.

## Configuration

### API Key (Optional)

By default, the extension uses the free demo endpoint which requires no API key. For production use:

1. Click the extension icon, then go to **Options** (or right-click the extension icon and select **Options**).
2. Enter your [API4AI](https://api4ai.cloud/) API key.
3. Click **Save**.

When an API key is configured, requests are sent to the production endpoint (`https://api4ai.cloud/virtual-try-on/v1/results`) with the `X-API-KEY` header.

### Rate Limits

| Setting | Value |
|---------|-------|
| Max requests per window | 5 |
| Rate limit window | 60 seconds |
| Cooldown on rate limit | 30 seconds |
| Cooldown after generation | 5 seconds |
| Max retries | 3 |
| Retry strategy | Exponential backoff |

## API Reference

### Virtual Try-On Endpoint

```
POST https://demo.api4ai.cloud/virtual-try-on/v1/results   (demo)
POST https://api4ai.cloud/virtual-try-on/v1/results        (production)
```

**Request:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `image` | File | User's photo |
| `image-apparel` | File | Selected garment image |

**Response:**

```json
{
  "results": [
    {
      "entities": [
        {
          "image": "<base64-encoded PNG>"
        }
      ]
    }
  ]
}
```

## Image Extraction

The content script (`content.js`) extracts images from 10 different sources on any webpage:

| Source | Details |
|--------|---------|
| `<img>` elements | `src`, `srcset`, `data-src`, `data-old-hires`, `data-lazySrc`, `data-original` |
| `<picture>` / `<source>` | `srcset` attributes |
| `<video>` | `poster` attributes |
| SVG elements | Inline SVGs (>= 40x40px), converted to data URLs |
| CSS backgrounds | Computed `background-image` on all elements |
| `<object>` / `<embed>` | Image sources from embedded objects |
| `<link>` tags | Icons and image-related links |
| `<meta>` tags | `og:image`, `twitter:image` |
| `<a>` tags | Direct links to image files |
| `<canvas>` elements | Exported as PNG data URLs (>= 40x40px) |

## Permissions

| Permission | Purpose |
|------------|---------|
| `activeTab` | Access the current tab to extract images |
| `storage` | Store API key in Chrome sync storage |
| `scripting` | Dynamically inject content script |
| `https://demo.api4ai.cloud/*` | Demo API endpoint |
| `https://api4ai.cloud/*` | Production API endpoint |

## Browser Compatibility

- Google Chrome 88+
- Microsoft Edge (Chromium)
- Brave Browser
- Other Chromium-based browsers

## License

This project is provided as-is for personal and educational use.
