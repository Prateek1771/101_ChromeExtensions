// Content script: extracts ALL images/assets from the page

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "extractImages") {
    const images = extractAllImages();
    sendResponse({ images });
  }
  return true;
});

function extractAllImages() {
  const urls = new Set();

  // 1. All <img> elements — src, srcset, data-src, data-old-hires, etc.
  document.querySelectorAll("img").forEach(img => {
    addUrl(urls, img.src);
    addUrl(urls, img.dataset.src);
    addUrl(urls, img.dataset.oldHires);
    addUrl(urls, img.dataset.lazySrc);
    addUrl(urls, img.dataset.original);
    addUrl(urls, img.getAttribute("data-srcset"));
    parseSrcset(urls, img.srcset);
    parseSrcset(urls, img.getAttribute("srcset"));
  });

  // 2. <picture> <source> elements
  document.querySelectorAll("picture source").forEach(source => {
    parseSrcset(urls, source.srcset);
    addUrl(urls, source.src);
  });

  // 3. <video> poster attributes
  document.querySelectorAll("video[poster]").forEach(vid => {
    addUrl(urls, vid.poster);
  });

  // 4. <svg> elements — convert inline SVGs to data URLs
  document.querySelectorAll("svg").forEach(svg => {
    // Only grab SVGs that look like standalone images (not tiny icons)
    const rect = svg.getBoundingClientRect();
    if (rect.width >= 40 && rect.height >= 40) {
      try {
        const svgData = new XMLSerializer().serializeToString(svg);
        const dataUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
        urls.add(dataUrl);
      } catch (e) { /* skip if serialization fails */ }
    }
  });

  // 5. CSS background images from all elements
  document.querySelectorAll("*").forEach(el => {
    const style = getComputedStyle(el);
    const bg = style.backgroundImage;
    if (bg && bg !== "none") {
      const matches = bg.matchAll(/url\(["']?(.*?)["']?\)/g);
      for (const match of matches) {
        addUrl(urls, match[1]);
      }
    }
  });

  // 6. <object>, <embed>, <iframe> with image sources
  document.querySelectorAll("object[data], embed[src]").forEach(el => {
    const src = el.data || el.src;
    if (src && isImageUrl(src)) addUrl(urls, src);
  });

  // 7. <link> with image rel (icons, apple-touch-icon, etc.)
  document.querySelectorAll('link[rel*="icon"], link[type*="image"]').forEach(link => {
    addUrl(urls, link.href);
  });

  // 8. <meta> og:image and twitter:image
  document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(meta => {
    addUrl(urls, meta.content);
  });

  // 9. <a> tags linking directly to image files
  document.querySelectorAll("a[href]").forEach(a => {
    if (isImageUrl(a.href)) addUrl(urls, a.href);
  });

  // 10. <canvas> elements — export as data URL
  document.querySelectorAll("canvas").forEach(canvas => {
    try {
      if (canvas.width >= 40 && canvas.height >= 40) {
        const dataUrl = canvas.toDataURL("image/png");
        if (dataUrl && dataUrl !== "data:,") urls.add(dataUrl);
      }
    } catch (e) { /* skip tainted canvases */ }
  });

  return Array.from(urls);
}

function addUrl(set, raw) {
  if (!raw || typeof raw !== "string") return;
  const url = raw.trim();
  if (!url) return;
  // Accept http(s), data URIs, and blob URIs
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) {
    set.add(url);
  } else if (url.startsWith("//")) {
    set.add("https:" + url);
  } else if (url.startsWith("/")) {
    set.add(location.origin + url);
  }
}

function parseSrcset(set, srcset) {
  if (!srcset) return;
  srcset.split(",").forEach(entry => {
    const parts = entry.trim().split(/\s+/);
    if (parts[0]) addUrl(set, parts[0]);
  });
}

function isImageUrl(url) {
  if (!url) return false;
  return /\.(png|jpe?g|gif|svg|webp|avif|bmp|ico|tiff?)(\?|$)/i.test(url);
}
