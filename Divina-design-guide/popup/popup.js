/* ── Tab Switching ─────────────────────────────────────── */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

/* ── Helpers ──────────────────────────────────────────── */
function sendMessage(msg) {
  return chrome.runtime.sendMessage(msg);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setStatus(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'status-msg ' + (type || '');
}

/** Escape HTML to prevent XSS. */
function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Simple debounce helper. */
function debounce(fn, ms) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/* ── Overlay Tab ──────────────────────────────────────── */
const toggleBtn   = document.getElementById('toggle-overlay');
const modeSelect  = document.getElementById('overlay-mode');
const opacitySldr = document.getElementById('opacity-slider');
const opacityVal  = document.getElementById('opacity-value');
const customGroup = document.getElementById('custom-png-group');
const customPng   = document.getElementById('custom-png');
const colorPicker = document.getElementById('overlay-color');

let overlayActive = false;

// Restore state from storage
chrome.storage.local.get(['overlayActive', 'overlayMode', 'overlayOpacity', 'overlayRotation', 'overlayColor'], (data) => {
  if (data.overlayMode) modeSelect.value = data.overlayMode;
  if (data.overlayOpacity != null) {
    opacitySldr.value = data.overlayOpacity;
    opacityVal.textContent = data.overlayOpacity;
  }
  if (data.overlayColor) colorPicker.value = data.overlayColor;
  if (data.overlayRotation != null) {
    document.querySelectorAll('.rotation-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.deg) === data.overlayRotation);
    });
  } else {
    // Default: 0° active
    const defaultBtn = document.querySelector('.rotation-btn[data-deg="0"]');
    if (defaultBtn) defaultBtn.classList.add('active');
  }
  if (data.overlayMode === 'custom') customGroup.style.display = 'block';
  if (data.overlayActive) {
    overlayActive = true;
    toggleBtn.textContent = 'Disable Overlay';
    toggleBtn.classList.add('active');
  }
});

toggleBtn.addEventListener('click', async () => {
  const tab = await getActiveTab();
  if (!tab) return;

  // Check for restricted pages before enabling
  if (!overlayActive && tab.url &&
      (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') ||
       tab.url.startsWith('edge://') || tab.url.startsWith('about:') ||
       tab.url.includes('chromewebstore.google.com'))) {
    setStatus('overlay-status', 'Cannot overlay restricted Chrome pages.', 'error');
    return;
  }

  overlayActive = !overlayActive;
  toggleBtn.textContent = overlayActive ? 'Disable Overlay' : 'Enable Overlay';
  toggleBtn.classList.toggle('active', overlayActive);
  chrome.storage.local.set({ overlayActive });

  if (overlayActive) {
    const response = await sendMessage({
      action: 'enableOverlay',
      tabId: tab.id,
      options: getCurrentOverlayOptions()
    });
    if (response && response.error) {
      overlayActive = false;
      toggleBtn.textContent = 'Enable Overlay';
      toggleBtn.classList.remove('active');
      chrome.storage.local.set({ overlayActive: false });
    }
  } else {
    sendMessage({ action: 'disableOverlay', tabId: tab.id });
  }
});

function getCurrentOverlayOptions() {
  return {
    mode: modeSelect.value,
    opacity: parseFloat(opacitySldr.value),
    rotation: getActiveRotation(),
    color: colorPicker.value,
  };
}

function getActiveRotation() {
  const active = document.querySelector('.rotation-btn.active');
  return active ? parseInt(active.dataset.deg) : 0;
}

// Mode change
modeSelect.addEventListener('change', () => {
  const mode = modeSelect.value;
  customGroup.style.display = mode === 'custom' ? 'block' : 'none';
  chrome.storage.local.set({ overlayMode: mode });
  if (overlayActive) updateOverlay();
});

// Debounced overlay update for rapid-fire controls
const debouncedUpdateOverlay = debounce(() => {
  if (overlayActive) updateOverlay();
}, 100);

// Opacity change (debounced)
opacitySldr.addEventListener('input', () => {
  opacityVal.textContent = opacitySldr.value;
  chrome.storage.local.set({ overlayOpacity: parseFloat(opacitySldr.value) });
  debouncedUpdateOverlay();
});

// Rotation buttons
document.querySelectorAll('.rotation-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.rotation-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    chrome.storage.local.set({ overlayRotation: parseInt(btn.dataset.deg) });
    if (overlayActive) updateOverlay();
  });
});

// Color change (debounced)
colorPicker.addEventListener('input', () => {
  chrome.storage.local.set({ overlayColor: colorPicker.value });
  debouncedUpdateOverlay();
});

// Custom PNG upload
customPng.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    chrome.storage.local.set({ customPngData: reader.result });
    if (overlayActive && modeSelect.value === 'custom') updateOverlay();
  };
  reader.readAsDataURL(file);
});

async function updateOverlay() {
  const tab = await getActiveTab();
  if (!tab) return;
  const options = getCurrentOverlayOptions();
  if (options.mode === 'custom') {
    const data = await chrome.storage.local.get('customPngData');
    options.customPng = data.customPngData;
  }
  sendMessage({ action: 'updateOverlay', tabId: tab.id, options });
}

/* ── Calculator Tab ───────────────────────────────────── */
const PHI = 1.6180339887498948;
const TOLERANCE = 0.05;

const calcA   = document.getElementById('calc-a');
const calcB   = document.getElementById('calc-b');
const calcBtn = document.getElementById('calc-btn');

function runCalculation() {
  const a = parseFloat(calcA.value);
  const b = parseFloat(calcB.value);

  if (isNaN(a) || isNaN(b) || a <= 0 || b <= 0) {
    return;
  }

  const larger  = Math.max(a, b);
  const smaller = Math.min(a, b);
  const ratio   = larger / smaller;
  const diff    = Math.abs(ratio - PHI) / PHI;
  const isGolden = diff <= TOLERANCE;

  const resultBox  = document.getElementById('calc-result');
  const ratioDisp  = document.getElementById('calc-ratio');
  const verdictEl  = document.getElementById('calc-verdict');
  const suggestEl  = document.getElementById('calc-suggestion');

  resultBox.style.display = 'block';
  ratioDisp.textContent = ratio.toFixed(6);
  ratioDisp.className = 'ratio-display ' + (isGolden ? 'golden' : 'not-golden');

  if (isGolden) {
    verdictEl.textContent = 'Golden Ratio! (' + (diff * 100).toFixed(1) + '% deviation)';
    verdictEl.className = 'golden';
    suggestEl.textContent = '';
  } else {
    verdictEl.textContent = 'Not golden ratio (' + (diff * 100).toFixed(1) + '% deviation)';
    verdictEl.className = 'not-golden';

    // Suggest nearest golden pair
    const sugA = Math.round(smaller * PHI);
    const sugB = Math.round(larger / PHI);
    suggestEl.innerHTML =
      'Suggestions:<br>' +
      '&bull; Keep ' + smaller.toFixed(1) + ', change ' + larger.toFixed(1) + ' &rarr; <b>' + sugA + '</b> (ratio ' + (sugA / smaller).toFixed(4) + ')<br>' +
      '&bull; Keep ' + larger.toFixed(1) + ', change ' + smaller.toFixed(1) + ' &rarr; <b>' + sugB + '</b> (ratio ' + (larger / sugB).toFixed(4) + ')';
  }
}

calcBtn.addEventListener('click', runCalculation);

// UX: Enter key triggers calculation
[calcA, calcB].forEach(input => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runCalculation();
  });
});

/* ── AI Analyzer Tab ──────────────────────────────────── */
const apiKeyInput = document.getElementById('api-key');
const saveKeyBtn  = document.getElementById('save-key');
const analyzeBtn  = document.getElementById('analyze-btn');

// Restore saved API key
chrome.storage.sync.get('groqApiKey', (data) => {
  if (data.groqApiKey) apiKeyInput.value = data.groqApiKey;
});

saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) return;
  chrome.storage.sync.set({ groqApiKey: key });
  setStatus('ai-status', 'Key saved.', 'success');
  setTimeout(() => setStatus('ai-status', ''), 2000);
});

analyzeBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setStatus('ai-status', 'Please enter an API key first.', 'error');
    return;
  }

  const tab = await getActiveTab();
  if (!tab) {
    setStatus('ai-status', 'No active tab found.', 'error');
    return;
  }

  // Check for restricted pages
  if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.includes('chromewebstore.google.com'))) {
    setStatus('ai-status', 'Cannot analyze restricted Chrome pages.', 'error');
    return;
  }

  setStatus('ai-status', 'Capturing screenshot and analyzing...', 'loading');
  analyzeBtn.disabled = true;

  try {
    const response = await sendMessage({
      action: 'analyzeDesign',
      tabId: tab.id,
      apiKey: key
    });

    // Fix #4: null response check
    if (!response || response.error) {
      setStatus('ai-status', (response && response.error) || 'No response from background.', 'error');
      return;
    }

    setStatus('ai-status', 'Analysis complete!', 'success');

    const resultBox = document.getElementById('ai-result');
    const scoreEl   = document.getElementById('ai-score');
    const suggestEl = document.getElementById('ai-suggestions');

    resultBox.style.display = 'block';
    scoreEl.textContent = response.score || '?';

    // Render sub-scores if available
    const subscoresEl = document.getElementById('ai-subscores');
    if (response.designScores && typeof response.designScores === 'object') {
      subscoresEl.style.display = 'block';
      subscoresEl.querySelectorAll('.subscore-row').forEach(row => {
        const key = row.dataset.key;
        const val = response.designScores[key];
        const bar = row.querySelector('.subscore-bar');
        const valueEl = row.querySelector('.subscore-value');
        if (val != null && !isNaN(val)) {
          bar.style.width = (val * 10) + '%';
          valueEl.textContent = val;
        } else {
          bar.style.width = '0%';
          valueEl.textContent = '-';
        }
      });
    } else {
      subscoresEl.style.display = 'none';
    }

    // Fix #7: XSS-safe rendering of AI suggestions
    if (response.suggestions && response.suggestions.length) {
      const ul = document.createElement('ul');
      response.suggestions.forEach(s => {
        const li = document.createElement('li');
        li.textContent = s;
        ul.appendChild(li);
      });
      suggestEl.textContent = '';
      suggestEl.appendChild(ul);
    } else {
      suggestEl.textContent = response.summary || 'No suggestions.';
    }

    // Send guide lines to content script
    if (response.guides && response.guides.length) {
      sendMessage({
        action: 'showAIGuides',
        tabId: tab.id,
        guides: response.guides,
        score: response.score
      });
    }
  } catch (err) {
    setStatus('ai-status', 'Error: ' + err.message, 'error');
  } finally {
    analyzeBtn.disabled = false;
  }
});
