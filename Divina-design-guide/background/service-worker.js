/**
 * Service Worker - Message router, script injection, screenshot capture, API proxy.
 */

/**
 * AI Client - Sends screenshots to Groq API for golden ratio analysis.
 */
const AIClient = {
  async analyze(apiKey, screenshotBase64) {
    // Strip any non-ASCII characters (smart quotes, zero-width spaces from copy-paste)
    const cleanKey = apiKey.replace(/[^\x20-\x7E]/g, '').trim();

    const prompt = `Analyze this website screenshot for overall design quality across 7 criteria.

Return ONLY valid JSON with this exact structure:
{
  "score": <number 1-10, overall design quality>,
  "designScores": {
    "goldenRatio": <1-10, phi alignment of layout proportions>,
    "typography": <1-10, type hierarchy, scale, and readability>,
    "colorContrast": <1-10, WCAG-like text/background contrast>,
    "whitespace": <1-10, breathing room and balance>,
    "colorDistribution": <1-10, adherence to 60-30-10 color rule>,
    "visualHierarchy": <1-10, focal points and reading flow>,
    "spacingConsistency": <1-10, consistent spacing rhythm>
  },
  "guides": [
    {"type": "v", "position": <0-1 fraction of viewport width>},
    {"type": "h", "position": <0-1 fraction of viewport height>},
    {"type": "rect", "x": <0-1>, "y": <0-1>, "w": <0-1>, "h": <0-1>}
  ],
  "suggestions": [
    "<actionable suggestion 1>",
    "<actionable suggestion 2>",
    "<actionable suggestion 3>"
  ],
  "summary": "<brief summary of design analysis>"
}

Guidelines for guides:
- Add vertical lines at golden ratio split points (e.g., 0.382, 0.618 of width)
- Add horizontal lines at golden ratio split points of height
- Add rectangles around elements that could be better aligned
- Maximum 8 guides total

Be specific and actionable in suggestions. Cover layout proportions, spacing, typography, color usage, and visual hierarchy.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: screenshotBase64 }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }],
        max_tokens: 2048,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error (${response.status}): ${err}`);
    }

    const result = await response.json();
    const text = result.choices[0].message.content;

    const jsonMatch = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('AI returned invalid JSON');
    }
  }
};

/**
 * Read content.css and return it as a string for Shadow DOM injection.
 */
async function getOverlayCSS() {
  const url = chrome.runtime.getURL('content/content.css');
  const resp = await fetch(url);
  return await resp.text();
}

/**
 * Check if content scripts are already injected in a tab.
 */
async function isInjected(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => !!window.__goldenRatioInjected
    });
    return result.result;
  } catch {
    return false;
  }
}

/**
 * Inject content scripts into a tab if not already injected.
 */
async function injectContentScripts(tabId) {
  if (await isInjected(tabId)) return;

  const css = await getOverlayCSS();

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (cssText) => { globalThis.OVERLAY_CSS = cssText; },
    args: [css]
  });

  const scripts = [
    'lib/golden-ratio-math.js',
    'content/svg-renderer.js',
    'content/ai-overlay.js',
    'content/overlay-manager.js',
    'content/content.js'
  ];

  for (const file of scripts) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [file]
    });
  }
}

/**
 * Send a message to the content script in a tab.
 */
async function sendToTab(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

/**
 * Capture a screenshot of the visible tab.
 */
async function captureScreenshot() {
  return chrome.tabs.captureVisibleTab(null, { format: 'png' });
}

/**
 * Check if a tab URL is restricted (can't inject scripts).
 */
function isRestrictedUrl(url) {
  if (!url) return true;
  return url.startsWith('chrome://') ||
         url.startsWith('chrome-extension://') ||
         url.startsWith('edge://') ||
         url.startsWith('about:') ||
         url.includes('chromewebstore.google.com');
}

/* ── Message Router ──────────────────────────────────── */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch(err => {
    sendResponse({ error: err.message });
  });
  return true;
});

async function handleMessage(msg) {
  switch (msg.action) {
    case 'enableOverlay': {
      const tab = await chrome.tabs.get(msg.tabId);
      if (isRestrictedUrl(tab.url)) {
        return { error: 'Cannot inject overlay on this page.' };
      }

      await injectContentScripts(msg.tabId);
      await sendToTab(msg.tabId, {
        action: 'showOverlay',
        options: msg.options
      });
      return { ok: true };
    }

    case 'disableOverlay': {
      try {
        await sendToTab(msg.tabId, { action: 'hideOverlay' });
      } catch {
        // Content script may not be injected
      }
      return { ok: true };
    }

    case 'updateOverlay': {
      try {
        await sendToTab(msg.tabId, {
          action: 'updateOverlayContent',
          options: msg.options
        });
      } catch {
        // Tab might not have content script yet
      }
      return { ok: true };
    }

    case 'analyzeDesign': {
      const screenshot = await captureScreenshot();
      const result = await AIClient.analyze(msg.apiKey, screenshot);
      return result;
    }

    case 'showAIGuides': {
      await injectContentScripts(msg.tabId);
      await sendToTab(msg.tabId, {
        action: 'renderAIGuides',
        guides: msg.guides,
        score: msg.score
      });
      return { ok: true };
    }

    default:
      return { error: 'Unknown action: ' + msg.action };
  }
}
