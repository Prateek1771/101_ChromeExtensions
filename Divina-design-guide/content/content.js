/**
 * Content Script - Main orchestrator.
 * Loaded programmatically by service worker. Sets up Shadow DOM and handles messages.
 */

// Guard against double injection
if (!window.__goldenRatioInjected) {
  window.__goldenRatioInjected = true;

  // OVERLAY_CSS is injected by the service worker before this script runs
  // (it reads content.css and injects it as a string constant)

  // Listen for messages from service worker
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.action) {
      case 'showOverlay':
        if (msg.options.mode === 'custom' && !msg.options.customPng) {
          chrome.storage.local.get('customPngData', (data) => {
            msg.options.customPng = data.customPngData;
            OverlayManager.show(msg.options);
            sendResponse({ ok: true });
          });
          return true; // Keep channel open for async storage callback
        }
        OverlayManager.show(msg.options);
        sendResponse({ ok: true });
        break;

      case 'updateOverlayContent':
        if (msg.options.mode === 'custom' && !msg.options.customPng) {
          chrome.storage.local.get('customPngData', (data) => {
            msg.options.customPng = data.customPngData;
            OverlayManager.update(msg.options);
            sendResponse({ ok: true });
          });
          return true; // Keep channel open for async storage callback
        }
        OverlayManager.update(msg.options);
        sendResponse({ ok: true });
        break;

      case 'hideOverlay':
        OverlayManager.destroy();
        sendResponse({ ok: true });
        break;

      case 'renderAIGuides':
        const root = OverlayManager.getShadowRoot();
        AIOverlay.show(root, msg.guides, msg.score);
        sendResponse({ ok: true });
        break;
    }
    return true; // Keep message channel open
  });
}
