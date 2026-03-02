const colorsList = document.getElementById('colors-list');
const fontsList = document.getElementById('fonts-list');
const assetsList = document.getElementById('assets-list');
const loading = document.getElementById('loading');
const empty = document.getElementById('empty');

// --- Tabs ---
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelector('.tab.active').classList.remove('active');
    document.querySelector('.panel.active').classList.remove('active');
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

// --- Copy to clipboard ---
function copyText(text, badge) {
  navigator.clipboard.writeText(text).then(() => {
    badge.classList.add('show');
    setTimeout(() => badge.classList.remove('show'), 800);
  });
}

// --- Download helper ---
function downloadUrl(url, filename) {
  chrome.downloads.download({ url, filename, saveAs: true });
}

// --- Extract from page ---
async function extract() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: scanPage
  });

  loading.hidden = true;

  if (!results || !results[0] || !results[0].result) {
    empty.hidden = false;
    return;
  }

  const data = results[0].result;
  renderColors(data.colors);
  renderFonts(data.fonts);
  renderAssets(data.assets);
}

// --- Runs in the page context ---
function scanPage() {
  const colorMap = {};
  const fontMap = {};
  const assetMap = new Map(); // url → { url, type }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function parseColor(str) {
    if (!str || str === 'transparent' || str === 'rgba(0, 0, 0, 0)') return null;
    const rgba = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgba) return rgbToHex(+rgba[1], +rgba[2], +rgba[3]);
    if (str.startsWith('#')) return str.length === 4
      ? '#' + str[1]+str[1] + str[2]+str[2] + str[3]+str[3]
      : str;
    return null;
  }

  function addColor(hex) {
    if (!hex) return;
    const key = hex.toLowerCase();
    colorMap[key] = (colorMap[key] || 0) + 1;
  }

  function cleanFontName(name) {
    return name.replace(/["']/g, '').trim();
  }

  function guessType(url) {
    const ext = url.split('?')[0].split('#')[0].split('.').pop().toLowerCase();
    if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
    if (['svg'].includes(ext)) return 'svg';
    if (['ico'].includes(ext)) return 'icon';
    if (['gif'].includes(ext)) return 'gif';
    if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'bmp', 'tiff'].includes(ext)) return 'image';
    return 'image';
  }

  function addAsset(url, type) {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return;
    if (!assetMap.has(url)) {
      assetMap.set(url, { url, type: type || guessType(url) });
    }
  }

  const allEls = document.querySelectorAll('body *');

  allEls.forEach(el => {
    const style = getComputedStyle(el);

    // Colors
    addColor(parseColor(style.color));
    addColor(parseColor(style.backgroundColor));
    addColor(parseColor(style.borderColor));

    // Fonts
    const families = style.fontFamily.split(',').map(cleanFontName).filter(Boolean);
    const primary = families[0];
    if (primary) {
      if (!fontMap[primary]) {
        fontMap[primary] = {
          name: primary,
          stack: style.fontFamily,
          weights: new Set(),
          styles: new Set()
        };
      }
      fontMap[primary].weights.add(style.fontWeight);
      fontMap[primary].styles.add(style.fontStyle);
    }

    // Background images
    const bg = style.backgroundImage;
    if (bg && bg !== 'none') {
      const matches = bg.matchAll(/url\(["']?(.*?)["']?\)/g);
      for (const m of matches) {
        addAsset(m[1]);
      }
    }
  });

  // <img>
  document.querySelectorAll('img[src]').forEach(img => {
    addAsset(img.src, 'image');
  });

  // <video> and <video source>
  document.querySelectorAll('video').forEach(vid => {
    if (vid.src) addAsset(vid.src, 'video');
    if (vid.poster) addAsset(vid.poster, 'image');
  });
  document.querySelectorAll('video source[src]').forEach(source => {
    addAsset(source.src, 'video');
  });

  // <picture> <source>
  document.querySelectorAll('picture source[srcset]').forEach(source => {
    const first = source.srcset.split(',')[0].trim().split(/\s+/)[0];
    addAsset(first);
  });

  // Favicons and icons from <link>
  document.querySelectorAll('link[rel*="icon"], link[rel="apple-touch-icon"]').forEach(link => {
    if (link.href) addAsset(link.href, 'icon');
  });

  // Open Graph / meta images
  document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(meta => {
    const content = meta.getAttribute('content');
    if (content) {
      try {
        addAsset(new URL(content, location.origin).href, 'image');
      } catch {}
    }
  });

  // Inline <svg> — serialize to data URL for preview
  document.querySelectorAll('svg').forEach(svg => {
    // Only meaningful SVGs (skip tiny icons under 20px unless they have viewBox)
    const rect = svg.getBoundingClientRect();
    if (rect.width < 5 && rect.height < 5) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(serialized)));
    const key = 'svg-' + serialized.length + '-' + serialized.slice(0, 80);
    if (!assetMap.has(key)) {
      assetMap.set(key, { url: blob, type: 'svg', svgRaw: serialized });
    }
  });

  // Convert sets in fonts
  const fonts = Object.values(fontMap).map(f => ({
    name: f.name,
    stack: f.stack,
    weights: [...f.weights].sort(),
    styles: [...f.styles]
  }));

  // Sort colors by usage count
  const colors = Object.entries(colorMap)
    .sort((a, b) => b[1] - a[1])
    .map(([hex, count]) => ({ hex, count }));

  return {
    colors,
    fonts,
    assets: [...assetMap.values()]
  };
}

// --- Render ---

function renderColors(colors) {
  if (!colors.length) return;
  colors.forEach(({ hex, count }) => {
    const item = document.createElement('div');
    item.className = 'color-item';
    item.innerHTML = `
      <div class="color-swatch" style="background:${hex}"></div>
      <div class="color-info">
        <div class="color-hex">${hex.toUpperCase()}</div>
        <div class="color-count">Used ${count}x</div>
      </div>
      <span class="copied-badge">Copied</span>
    `;
    const badge = item.querySelector('.copied-badge');
    item.addEventListener('click', () => copyText(hex.toUpperCase(), badge));
    colorsList.appendChild(item);
  });
}

function renderFonts(fonts) {
  if (!fonts.length) return;
  fonts.forEach(f => {
    const item = document.createElement('div');
    item.className = 'font-item';
    const searchUrl = 'https://fonts.google.com/?query=' + encodeURIComponent(f.name);
    item.innerHTML = `
      <div class="font-details">
        <div class="font-name">${f.name}</div>
        <div class="font-meta">${f.weights.join(', ')} &middot; ${f.styles.join(', ')}</div>
        <span class="copied-badge">Copied</span>
      </div>
      <button class="font-download" title="Download from Google Fonts">&#8595;</button>
    `;
    const badge = item.querySelector('.copied-badge');
    const details = item.querySelector('.font-details');
    details.addEventListener('click', () => copyText(f.name, badge));
    const btn = item.querySelector('.font-download');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(searchUrl, '_blank');
    });
    fontsList.appendChild(item);
  });
}

function renderAssets(assets) {
  if (!assets.length) return;
  assets.forEach(a => {
    const item = document.createElement('div');
    item.className = 'asset-item';

    const filename = a.url.startsWith('data:')
      ? 'inline-svg'
      : (a.url.split('/').pop().split('?')[0] || 'asset');

    const isPreviewable = a.type !== 'video';
    const thumbHtml = isPreviewable
      ? `<img class="asset-thumb" src="${a.url}" alt="" loading="lazy">`
      : `<div class="asset-thumb" style="display:flex;align-items:center;justify-content:center;height:60px;color:#444;font-size:11px;">Video</div>`;

    item.innerHTML = `
      ${thumbHtml}
      <div class="asset-row">
        <span class="asset-type">${a.type}</span>
        <span class="asset-name" title="${a.url.startsWith('data:') ? 'Inline SVG' : a.url}">${filename}</span>
        <span class="copied-badge">Copied</span>
        <button class="asset-download" title="Download">&#8595;</button>
      </div>
    `;

    const thumb = item.querySelector('.asset-thumb');
    if (thumb.tagName === 'IMG') {
      thumb.addEventListener('error', () => { item.remove(); });
    }

    const badge = item.querySelector('.copied-badge');
    const nameEl = item.querySelector('.asset-name');
    nameEl.addEventListener('click', () => {
      const text = a.url.startsWith('data:') && a.svgRaw ? a.svgRaw : a.url;
      copyText(text, badge);
    });

    const dlBtn = item.querySelector('.asset-download');
    dlBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (a.url.startsWith('data:') && a.svgRaw) {
        // Download inline SVG as file
        const blob = new Blob([a.svgRaw], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'image.svg';
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Open in new tab (direct download blocked cross-origin)
        window.open(a.url, '_blank');
      }
    });

    assetsList.appendChild(item);
  });
}

// --- Go ---
extract();
