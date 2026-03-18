// WebRoast — Background Service Worker
// Handles screenshot capture (requires background context in some Chrome versions)

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'captureScreenshot') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 65 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, screenshot: dataUrl });
      }
    });
    return true; // keep channel open for async response
  }
});
