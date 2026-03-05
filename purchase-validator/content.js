(() => {
  const sites = window.__PV_SITES || [];

  function getMatchedSite() {
    const hostname = window.location.hostname;
    return sites.find(s => s.matchPattern.test(hostname));
  }

  function getText(selectorStr) {
    if (!selectorStr) return "";
    const selectors = selectorStr.split(",").map(s => s.trim());
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el.textContent.trim();
      } catch (_) {}
    }
    return "";
  }

  function getImage(selectorStr) {
    if (!selectorStr) return "";
    const selectors = selectorStr.split(",").map(s => s.trim());
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el.src || el.getAttribute("data-old-hires") || el.getAttribute("data-a-dynamic-image") && Object.keys(JSON.parse(el.getAttribute("data-a-dynamic-image")))[0] || "";
      } catch (_) {}
    }
    return "";
  }

  function getMeta(property) {
    const el = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
    return el ? el.getAttribute("content") || "" : "";
  }

  function scrapeProduct(site) {
    const s = site.selectors;
    const title = getText(s.title) || getMeta("og:title");
    const price = getText(s.price) || getMeta("product:price:amount");
    const description = getText(s.description) || getMeta("description");
    const category = getText(s.category);
    const imageUrl = getImage(s.image) || getMeta("og:image");

    if (!title) return null;

    return {
      title,
      price,
      description: description.substring(0, 500),
      category,
      imageUrl,
      url: window.location.href,
      site: site.name
    };
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "GET_PRODUCT_DATA") {
      const site = getMatchedSite();
      if (!site || !site.isProductPage()) {
        sendResponse({ product: null });
        return;
      }
      const product = scrapeProduct(site);
      sendResponse({ product });
    }
    return true;
  });
})();
