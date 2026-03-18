// ═══════════════════════════════════════════
//  WebRoast — popup.js  (all UI logic)
// ═══════════════════════════════════════════

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const VISION_MODEL = 'llama-3.2-90b-vision-preview';
const TEXT_MODEL = 'llama-3.3-70b-versatile';
const MAX_HISTORY = 20;

// ── State ────────────────────────────────────────────────────────────
let apiKey = '';
let currentTab = null;
let currentPersona = 'gordon';
let currentRoast = null;
let currentShot = null;       // full-page screenshot (for AI analysis)
let currentViewportShot = null; // first-viewport screenshot (for thumbnails/card)
let currentData = null;


// ── Personas ─────────────────────────────────────────────────────────
const PERSONAS = {
  gordon: {
    name: 'Gordon Ramsay', emoji: '👨‍🍳',
    system: 'You are Gordon Ramsay. Channel your unfiltered, passionate fury. Use signature phrases like "This is RAW!", "Bloody hell!", "It\'s a disaster!", and "Donkey!" Be brutal, specific, and devastatingly funny. Never hold back.',
  },
  genz: {
    name: 'Gen Z Critic', emoji: '💅',
    system: 'You are a ruthless Gen Z internet critic. Use current slang: no cap, lowkey, slay, it\'s giving, NPC, mid, ate and left no crumbs, understood the assignment, rent free, main character, rizz, delulu, caught in 4K, understood the assignment, not it. Be unfiltered and savage.',
  },
  techbro: {
    name: 'Tech Bro', emoji: '🚀',
    system: 'You are a smug Silicon Valley tech bro who raised a $50M Series A. Judge everything through the lens of scalability, disruption, and 10x thinking. Use jargon like: pivot, synergy, bandwidth, product-market fit, North Star metric, growth hacking, move fast, technical debt, disruptive, paradigm shift. Be condescending.',
  },
};

// ── Platform label helpers ───────────────────────────────────────────
function getPlatformLabel(p) {
  return { github_profile: 'GitHub', github_repo: 'GitHub Repo', linkedin: 'LinkedIn', twitter: 'Twitter/X', generic: 'Website' }[p] || 'Website';
}
function getPlatformClass(p) {
  if (p.startsWith('github')) return 'github';
  if (p === 'linkedin') return 'linkedin';
  if (p === 'twitter') return 'twitter';
  return 'website';
}
function isProfile(p) { return ['github_profile', 'linkedin', 'twitter'].includes(p); }

// ── Prompt Builder ───────────────────────────────────────────────────
function buildPrompt(persona, data, screenshot) {
  const p = data.platform;
  let context = '';

  if (p === 'github_profile') {
    const pins = data.pinnedRepos?.map(r => `"${r.name}" (⭐${r.stars}): ${r.desc}`).join('; ') || 'nothing pinned';
    context = `GitHub Profile:
Username: @${data.username}
Name: ${data.name}
Bio: "${data.bio || 'No bio — true mystery or just lazy?'}"
Location: ${data.location || 'Unknown'} | Company: ${data.company || 'Unemployed?'}
Followers: ${data.followers} | Following: ${data.following} | Repos: ${data.repoCount}
Contributions: ${data.contributions}
Languages: ${data.langs?.join(', ') || 'None shown'}
Pinned Projects: ${pins}`;
  } else if (p === 'github_repo') {
    context = `GitHub Repository: ${data.username}/${data.reponame}
Description: "${data.desc || 'No description'}"
Stars: ${data.stars} | Forks: ${data.forks}
Language: ${data.language} | Topics: ${data.topics?.join(', ')}
Open Issues: ${data.openIssues || 'Unknown'} | License: ${data.license || 'None'}
README excerpt: "${data.readme?.slice(0, 800)}"`;
  } else if (p === 'linkedin') {
    const exp = data.experiences?.map(e => `${e.title} @ ${e.company}`).join('; ') || 'None visible';
    context = `LinkedIn Profile:
Name: ${data.name}
Headline: "${data.headline || 'No headline'}"
Location: ${data.location || 'Unknown'}
About: "${data.about || 'No about section'}"
Connections: ${data.connections || 'Unknown'}
Experience: ${exp}
Recent Posts: ${data.posts?.join(' | ') || 'No posts'}
Skills: ${data.skills?.join(', ') || 'None'}`;
  } else if (p === 'twitter') {
    const tweets = data.tweets?.map((t, i) => `${i + 1}. "${t.slice(0, 140)}"`).join('\n') || 'No tweets visible';
    context = `Twitter/X Profile:
@${data.username} (${data.displayName})${data.isBlueTick ? ' ✓ Blue Tick' : ''}
Bio: "${data.bio || 'No bio'}"
Followers: ${data.followers} | Following: ${data.following}
Location: ${data.location || 'Unknown'} | Joined: ${data.joined}
Recent tweets:\n${tweets}`;
  } else {
    context = `Website: ${data.title}
URL: ${data.url}
Description: "${data.metaDesc || 'No meta description'}"
H1s: ${data.h1s?.join(', ')}
H2s: ${data.h2s?.join(', ')}
Stats: ${data.imgs} images, ${data.links} links, ${data.buttons} buttons
Font: ${data.font} | Framework: ${data.framework}
Content: "${data.bodyText?.slice(0, 1000)}"`;
  }

  const profileScores = isProfile(p)
    ? `"cringe_level": 7, "delusion_score": 8, "clout_score": 3, "touch_grass_urgency": 9, "overall_roast_score": 75`
    : `"color_palette": 4, "typography": 5, "layout": 3, "ux": 4, "overall_roast_score": 68`;

  const screenshotNote = screenshot
    ? (isProfile(p) ? 'A screenshot of this profile page is also provided — comment on visual elements you can see.' : 'A screenshot of this website is also provided — comment on visual design elements you can see.')
    : '';

  return `${context}
${screenshotNote}

Return ONLY a valid JSON object, no prose, no markdown, no code fences. Use this exact structure with real numbers (integers only):
{
  "roast_headline": "Your savage short headline here",
  "roast": "Paragraph 1 of savage roast.\n\nParagraph 2 with specific detail.\n\nParagraph 3 with killing blow.",
  "scores": { ${profileScores} },
  "verdict": "One devastating final sentence.",
  "highlight": "The single most roastable thing."
}`;
}

// ── Groq API Call ────────────────────────────────────────────────────
async function callGroq(data, screenshot, persona) {
  const personaDef = PERSONAS[persona];
  const promptText = buildPrompt(persona, data, screenshot);

  const systemMsg = personaDef.system +
    ' CRITICAL: Your entire response must be ONLY a valid JSON object. No markdown, no code blocks, no prose before or after the JSON.';

  // ── Step 1: Primary call — text model with guaranteed JSON format ──
  async function textOnlyCall() {
    const messages = [
      { role: 'system', content: systemMsg },
      { role: 'user', content: promptText },
    ];
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages,
        temperature: 0.85,
        max_tokens: 1800,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      let msg = `Groq API error ${res.status}`;
      try { msg = JSON.parse(errText).error?.message || msg; } catch (_) {}
      throw new Error(msg);
    }
    const json = await res.json();
    return parseJSON(json.choices[0].message.content);
  }

  // ── Step 2: Optional vision enrichment (if screenshot available) ──
  async function visionCall(roastResult) {
    if (!screenshot) return roastResult;
    try {
      const visionPrompt = `Look at this screenshot carefully. You already have this roast data: ${JSON.stringify(roastResult.scores)}.
Update the scores based on what you ACTUALLY SEE visually. Also add 1-2 sentences to the roast about specific visual elements.
Respond with ONLY a JSON object with keys: "scores" (updated) and "visual_note" (1-2 sentences about the visual design).`;
      const messages = [
        { role: 'system', content: 'You are a design critic. Respond with ONLY a JSON object.' },
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: screenshot } },
          { type: 'text', text: visionPrompt },
        ]},
      ];
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: VISION_MODEL, messages, temperature: 0.7, max_tokens: 600 }),
      });
      if (!res.ok) return roastResult; // vision is optional, don't fail
      const json = await res.json();
      const visionData = parseJSON(json.choices[0].message.content);
      // Merge vision scores and note into result
      if (visionData.scores) roastResult.scores = { ...roastResult.scores, ...visionData.scores };
      if (visionData.visual_note) roastResult.roast += '\n\n' + visionData.visual_note;
      return roastResult;
    } catch (_) {
      return roastResult; // vision enrichment is optional
    }
  }

  const result = await textOnlyCall();
  return await visionCall(result);
}

function parseJSON(text) {
  if (!text) throw new Error('Empty response from API');
  try { return JSON.parse(text); } catch (_) {}
  // Strip markdown code fences
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) try { return JSON.parse(m[1].trim()); } catch (_) {}
  // Extract the outermost JSON object
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
  }
  console.error('Failed to parse Groq response:', text);
  throw new Error('AI returned an unexpected format. Please try again.');
}

// ── State Switcher ───────────────────────────────────────────────────
function setState(id) {
  ['setupState', 'idleState', 'loadingState', 'resultState', 'errorState']
    .forEach(s => document.getElementById(s).classList.toggle('hidden', s !== id));
}

function setLoader(msg) {
  document.getElementById('loaderText').textContent = msg;
}

// ── Init ─────────────────────────────────────────────────────────────
async function init() {
  const store = await chrome.storage.local.get(['apiKey']);
  apiKey = store.apiKey || '';

  // Get active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    document.getElementById('siteTitle').textContent = tab.title || 'Unknown Page';
    document.getElementById('siteUrl').textContent = new URL(tab.url).hostname;
    const favicon = document.getElementById('siteFavicon');
    favicon.src = `https://www.google.com/s2/favicons?domain=${tab.url}&sz=32`;
    favicon.onerror = () => { favicon.style.display = 'none'; };

    // detect platform
    const platform = detectPlatformFromUrl(tab.url);
    const pill = document.getElementById('platformPill');
    pill.textContent = getPlatformLabel(platform);
    pill.className = `platform-pill ${getPlatformClass(platform)}`;
  } catch (_) {}

  setState(apiKey ? 'idleState' : 'setupState');
}

function detectPlatformFromUrl(url) {
  if (/github\.com\/[^\/\?#]+\/[^\/\?#]+/.test(url)) return 'github_repo';
  if (/github\.com\/[^\/\?#]+/.test(url)) return 'github_profile';
  if (/linkedin\.com\/in\//.test(url)) return 'linkedin';
  if (/twitter\.com|x\.com/.test(url)) return 'twitter';
  return 'generic';
}

// ── Image Helpers ──────────────────────────────────────────────────
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// Draw image filling the box (cover style — no squishing)
function drawCover(ctx, img, x, y, w, h) {
  const ir = img.naturalWidth / img.naturalHeight;
  const br = w / h;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ir > br) {
    sw = sh * br;            // image wider than box — crop sides equally
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = sw / br;            // image taller than box — crop bottom, show top
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Scroll-and-stitch full-page screenshot (max 5 viewports)
async function captureFullPage() {
  setLoader('Capturing screenshot…');
  try {
    // scroll to top first, capture viewport shot
    await chrome.tabs.sendMessage(currentTab.id, { action: 'scrollTo', y: 0 }).catch(() => {});
    await new Promise(r => setTimeout(r, 120));

    const vpResp = await chrome.runtime.sendMessage({ action: 'captureScreenshot' });
    const vpShot = vpResp?.success ? vpResp.screenshot : null;
    currentViewportShot = vpShot; // always save viewport-only for thumbnails

    // Ask content script for page dimensions
    const info = await chrome.tabs.sendMessage(currentTab.id, { action: 'getPageInfo' }).catch(() => null);
    if (!info || info.totalHeight <= info.viewportHeight * 1.1) {
      // page fits in one viewport, restore scroll and return
      await chrome.tabs.sendMessage(currentTab.id, { action: 'scrollTo', y: info?.originalScrollY || 0 }).catch(() => {});
      return vpShot;
    }

    const { totalHeight, viewportHeight, originalScrollY } = info;
    const maxHeight = Math.min(totalHeight, viewportHeight * 5);

    // Load first image to get DPR-scaled pixel dimensions
    const firstImg = await loadImage(vpShot);
    const scale = firstImg.naturalHeight / viewportHeight;
    const capWidth = firstImg.naturalWidth;

    // Create full-page canvas
    const canvas = document.createElement('canvas');
    canvas.width = capWidth;
    canvas.height = Math.round(maxHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(firstImg, 0, 0); // draw first viewport

    let y = viewportHeight;
    while (y < maxHeight) {
      setLoader(`Capturing page… ${Math.round((y / maxHeight) * 100)}%`);
      await chrome.tabs.sendMessage(currentTab.id, { action: 'scrollTo', y }).catch(() => {});
      await new Promise(r => setTimeout(r, 200)); // wait for paint

      const shot = await chrome.runtime.sendMessage({ action: 'captureScreenshot' });
      if (!shot?.success) break;

      const img = await loadImage(shot.screenshot);
      const drawH = Math.min(viewportHeight, maxHeight - y);
      ctx.drawImage(img,
        0, 0, capWidth, Math.round(drawH * scale),        // src
        0, Math.round(y * scale), capWidth, Math.round(drawH * scale) // dest
      );
      y += viewportHeight;
    }

    // Restore original scroll position
    await chrome.tabs.sendMessage(currentTab.id, { action: 'scrollTo', y: originalScrollY }).catch(() => {});
    return canvas.toDataURL('image/jpeg', 0.65);

  } catch (e) {
    console.warn('Full-page capture failed, using viewport:', e);
    return currentViewportShot;
  }
}

// ── Main Roast Flow ──────────────────────────────────────────────────
async function startRoast() {
  if (!apiKey) { setState('setupState'); return; }
  setState('loadingState');
  currentViewportShot = null;

  try {
    // 1. Full-page screenshot (stitched), viewport shot saved separately
    let screenshot = null;
    try {
      screenshot = await captureFullPage(); // sets currentViewportShot as side-effect
      currentShot = screenshot;
    } catch (_) {
      // last resort: single viewport capture
      const shotResp = await chrome.runtime.sendMessage({ action: 'captureScreenshot' });
      if (shotResp?.success) {
        screenshot = shotResp.screenshot;
        currentShot = screenshot;
        currentViewportShot = screenshot;
      }
    }

    // 2. Extract page data
    setLoader('Extracting page data…');
    let pageData = null;
    try {
      const dataResp = await chrome.tabs.sendMessage(currentTab.id, { action: 'extractData' });
      if (dataResp?.success) pageData = dataResp.data;
    } catch (_) {}

    if (!pageData) {
      pageData = { platform: 'generic', url: currentTab.url, title: currentTab.title, bodyText: '', h1s: [], h2s: [], metaDesc: '' };
    }
    currentData = pageData;

    // 3. Call Groq
    setLoader('Roasting in progress…');
    const roastData = await callGroq(pageData, screenshot, currentPersona);
    currentRoast = roastData;

    // 4. Save to history
    await addToHistory({
      url: pageData.url,
      title: currentTab.title,
      platform: pageData.platform,
      persona: currentPersona,
      roastHeadline: roastData.roast_headline,
      score: roastData.scores?.overall_roast_score ?? 0,
      timestamp: Date.now(),
    });

    renderResult(roastData, pageData.platform);
    setState('resultState');

  } catch (err) {
    document.getElementById('errorMsg').textContent = err.message || 'Unknown error';
    setState('errorState');
  }
}

// ── Render Result ────────────────────────────────────────────────────
function renderResult(data, platform) {
  document.getElementById('roastHeadline').textContent = data.roast_headline || 'No headline';
  document.getElementById('roastBody').textContent = data.roast || '';
  document.getElementById('verdictText').textContent = data.verdict || '';
  document.getElementById('highlightText').textContent = data.highlight || '';

  // Meta row
  document.getElementById('resultSiteName').textContent = currentTab?.title?.slice(0, 40) || '';
  document.getElementById('resultPersonaTag').textContent = `Roasted by ${PERSONAS[currentPersona]?.emoji} ${PERSONAS[currentPersona]?.name}`;

  // Use viewport-only shot for popup thumbnail (clean, fast)
  const thumbSrc = currentViewportShot || currentShot;
  if (thumbSrc) {
    const thumb = document.getElementById('resultThumb');
    thumb.src = thumbSrc;
    thumb.style.display = 'block';
  } else {
    document.getElementById('resultThumb').style.display = 'none';
  }

  // Scores
  renderScores(data.scores || {}, platform);
}

function renderScores(scores, platform) {
  const labels = {
    color_palette: 'Color Palette', typography: 'Typography', layout: 'Layout', ux: 'UX',
    cringe_level: 'Cringe Level', delusion_score: 'Delusion', clout_score: 'Clout', touch_grass_urgency: 'Touch Grass',
  };

  const barsEl = document.getElementById('scoreBars');
  barsEl.innerHTML = '';

  const barItems = [];

  Object.entries(scores).forEach(([key, value]) => {
    if (key === 'overall_roast_score') return;
    const label = labels[key] || key.replace(/_/g, ' ');
    const div = document.createElement('div');
    div.className = 'score-bar-item';
    div.innerHTML = `
      <span class="score-bar-label">${label}</span>
      <div class="score-bar-track"><div class="score-bar-fill" data-val="${value}"></div></div>
      <span class="score-bar-value">${value}</span>`;
    barsEl.appendChild(div);
    barItems.push(div.querySelector('.score-bar-fill'));
  });

  // Animate bars after frame
  requestAnimationFrame(() => {
    barItems.forEach(bar => {
      const val = parseInt(bar.dataset.val, 10);
      bar.style.width = `${val * 10}%`;
    });
  });

  // Ring
  const overall = scores.overall_roast_score ?? 0;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (overall / 100) * circumference;
  const ring = document.getElementById('ringFill');
  const numEl = document.getElementById('ringNumber');

  // Add gradient def
  const svg = ring.closest('svg');
  if (!svg.querySelector('defs')) {
    svg.insertAdjacentHTML('afterbegin', `<defs>
      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FF4500"/>
        <stop offset="100%" stop-color="#FF8C00"/>
      </linearGradient>
    </defs>`);
  }

  setTimeout(() => {
    ring.style.strokeDashoffset = offset;
    // Animate number
    let count = 0;
    const step = Math.ceil(overall / 40);
    const interval = setInterval(() => {
      count = Math.min(count + step, overall);
      numEl.textContent = count;
      if (count >= overall) clearInterval(interval);
    }, 30);
  }, 200);
}

// ── Roast Card (Canvas) ──────────────────────────────────────────────
function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, curY);
      line = word + ' ';
      curY += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, curY);
  return curY + lineH;
}

async function generateRoastCard() {
  if (!currentRoast) return;
  const canvas = document.getElementById('roastCanvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, 1200, 630);
  bg.addColorStop(0, '#0A0A0A');
  bg.addColorStop(1, '#1A0808');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 630);

  // Fire top bar
  const fire = ctx.createLinearGradient(0, 0, 1200, 0);
  fire.addColorStop(0, '#FF4500');
  fire.addColorStop(1, '#FF8C00');
  ctx.fillStyle = fire;
  ctx.fillRect(0, 0, 1200, 7);

  // Screenshot thumbnail (left side) — use viewport shot only, cover-crop to avoid squishing
  const cardThumb = currentViewportShot || currentShot;
  if (cardThumb) {
    await new Promise(res => {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        roundedRect(ctx, 36, 36, 530, 350, 14);
        ctx.clip();
        drawCover(ctx, img, 36, 36, 530, 350); // cover-crop, no squish
        ctx.restore();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        roundedRect(ctx, 36, 36, 530, 350, 14);
        ctx.stroke();
        res();
      };
      img.onerror = res;
      img.src = cardThumb;
    });
  }

  // Scores below screenshot
  const scores = currentRoast.scores || {};
  const scoreKeys = Object.keys(scores).filter(k => k !== 'overall_roast_score');
  let sx = 36, sy = 408;
  scoreKeys.slice(0, 4).forEach((key, i) => {
    const val = scores[key];
    const bw = 260, bh = 38;
    const bx = sx + (i % 2) * 278, by = sy + Math.floor(i / 2) * 50;
    // track
    ctx.fillStyle = '#222';
    roundedRect(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    // fill
    ctx.fillStyle = fire;
    roundedRect(ctx, bx, by, (val / 10) * bw, bh, 8);
    ctx.fill();
    // label
    ctx.fillStyle = '#EEE';
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.fillText(key.replace(/_/g, ' ').toUpperCase() + '  ' + val + '/10', bx + 10, by + 24);
  });

  // Right column
  const rx = 606;
  // Branding
  ctx.font = 'bold 26px -apple-system, sans-serif';
  ctx.fillStyle = '#FF6020';
  ctx.fillText('🔥 WebRoast', rx, 68);

  // URL
  const url = currentData?.url || '';
  ctx.font = '14px -apple-system, sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText(url.replace(/^https?:\/\//, '').slice(0, 55), rx, 96);

  // Headline
  ctx.font = 'bold 28px -apple-system, sans-serif';
  ctx.fillStyle = '#F0F0F0';
  let nextY = wrapText(ctx, currentRoast.roast_headline || '', rx, 138, 560, 36);

  // Roast excerpt
  ctx.font = '15px -apple-system, sans-serif';
  ctx.fillStyle = '#AAAAAA';
  const excerpt = (currentRoast.roast || '').split('\n')[0]?.slice(0, 220) || '';
  nextY = Math.max(nextY + 10, 220);
  wrapText(ctx, excerpt, rx, nextY, 556, 22);

  // Overall score area
  ctx.font = '900 80px -apple-system, sans-serif';
  ctx.fillStyle = '#FF4500';
  ctx.fillText(scores.overall_roast_score ?? '??', rx, 530);
  ctx.font = '18px -apple-system, sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText('/ 100  ROAST SCORE', rx + 100, 530);

  // Verdict
  ctx.font = 'italic 14px -apple-system, sans-serif';
  ctx.fillStyle = '#888';
  wrapText(ctx, '"' + (currentRoast.verdict || '') + '"', rx, 566, 560, 20);

  // Bottom branding strip
  ctx.fillStyle = '#141414';
  ctx.fillRect(0, 608, 1200, 22);
  ctx.font = '11px -apple-system, sans-serif';
  ctx.fillStyle = '#444';
  ctx.fillText('Made with WebRoast 🔥 Chrome Extension', 36, 623);
  ctx.fillStyle = '#333';
  ctx.textAlign = 'right';
  ctx.fillText(`Roasted by ${PERSONAS[currentPersona]?.emoji} ${PERSONAS[currentPersona]?.name}`, 1200 - 36, 623);
  ctx.textAlign = 'left';

  // Download
  const link = document.createElement('a');
  link.download = `webroast-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── History ──────────────────────────────────────────────────────────
async function addToHistory(entry) {
  const store = await chrome.storage.local.get(['roastHistory']);
  const history = store.roastHistory || [];
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  await chrome.storage.local.set({ roastHistory: history });
}

async function loadHistory() {
  const store = await chrome.storage.local.get(['roastHistory']);
  return store.roastHistory || [];
}

async function renderHistory() {
  const history = await loadHistory();
  const el = document.getElementById('historyList');
  if (!history.length) {
    el.innerHTML = '<div class="history-empty">No roasts yet. Go savage a website!</div>';
    return;
  }
  el.innerHTML = '';
  history.forEach(item => {
    const d = new Date(item.timestamp);
    const timeStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const icon = { github_profile: '🐙', github_repo: '📦', linkedin: '💼', twitter: '🐦', generic: '🌐' }[item.platform] || '🌐';
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <span class="history-item-icon">${icon}</span>
      <div class="history-item-body">
        <div class="history-item-title">${item.roastHeadline || item.title?.slice(0, 50) || 'Untitled'}</div>
        <div class="history-item-sub">${item.url?.replace(/^https?:\/\//, '').slice(0, 40)} · ${timeStr}</div>
      </div>
      <span class="history-item-score">${item.score}</span>`;
    el.appendChild(div);
  });
}

// ── Clipboard ─────────────────────────────────────────────────────────
async function copyRoast() {
  if (!currentRoast) return;
  const text = `🔥 ${currentRoast.roast_headline}\n\n${currentRoast.roast}\n\n☠️ ${currentRoast.verdict}`;
  await navigator.clipboard.writeText(text);
  const btn = document.getElementById('copyBtn');
  const orig = btn.textContent;
  btn.textContent = '✅ Copied!';
  setTimeout(() => { btn.textContent = orig; }, 2000);
}

// ── Event Listeners ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();

  // Persona selection
  document.querySelectorAll('.persona-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.persona-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPersona = btn.dataset.persona;
    });
  });

  // Roast button
  document.getElementById('roastBtn').addEventListener('click', startRoast);

  // Roast Again
  document.getElementById('roastAgainBtn').addEventListener('click', () => {
    setState('idleState');
    currentShot = null;
  });

  // Retry
  document.getElementById('retryBtn').addEventListener('click', startRoast);

  // Copy
  document.getElementById('copyBtn').addEventListener('click', copyRoast);

  // Download card
  document.getElementById('cardBtn').addEventListener('click', generateRoastCard);

  // Settings open/close
  document.getElementById('settingsBtn').addEventListener('click', async () => {
    document.getElementById('settingsPanel').classList.remove('hidden');
    const store = await chrome.storage.local.get(['apiKey']);
    if (store.apiKey) document.getElementById('apiKeyInput').value = store.apiKey;
  });
  document.getElementById('closeSettings').addEventListener('click', () => {
    document.getElementById('settingsPanel').classList.add('hidden');
  });
  document.getElementById('openSettingsBtn')?.addEventListener('click', () => {
    document.getElementById('settingsPanel').classList.remove('hidden');
  });

  // Save API key
  document.getElementById('saveApiKey').addEventListener('click', async () => {
    const val = document.getElementById('apiKeyInput').value.trim();
    const statusEl = document.getElementById('apiKeyStatus');
    if (!val.startsWith('gsk_')) {
      statusEl.textContent = '⚠️ Key should start with gsk_';
      statusEl.className = 'key-status err';
      statusEl.classList.remove('hidden');
      return;
    }
    apiKey = val;
    await chrome.storage.local.set({ apiKey: val });
    statusEl.textContent = '✅ Key saved!';
    statusEl.className = 'key-status ok';
    statusEl.classList.remove('hidden');
    setTimeout(() => {
      statusEl.classList.add('hidden');
      document.getElementById('settingsPanel').classList.add('hidden');
      setState('idleState');
    }, 1200);
  });

  // History open/close
  document.getElementById('historyBtn').addEventListener('click', () => {
    document.getElementById('historyPanel').classList.remove('hidden');
    renderHistory();
  });
  document.getElementById('closeHistory').addEventListener('click', () => {
    document.getElementById('historyPanel').classList.add('hidden');
  });

  // Clear history
  document.getElementById('clearHistory').addEventListener('click', async () => {
    await chrome.storage.local.remove('roastHistory');
    renderHistory();
  });
});
