// WebRoast — Content Script
// Detects platform and extracts relevant page data

function detectPlatform() {
  const url = location.href;
  if (/github\.com\/[^\/\?#]+\/[^\/\?#]+/.test(url)) return 'github_repo';
  if (/github\.com\/[^\/\?#]+\/?(\?|#|$)/.test(url)) return 'github_profile';
  if (/linkedin\.com\/in\//.test(url)) return 'linkedin';
  if (/twitter\.com\/[^\/\?#]+\/?(\?|#|$)/.test(url) || /x\.com\/[^\/\?#]+\/?(\?|#|$)/.test(url)) return 'twitter';
  return 'generic';
}

function sel(selector, root = document) {
  return root.querySelector(selector)?.innerText?.trim() || '';
}

function selAll(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

// ─── Generic Website ───────────────────────────────────────────────
function extractGeneric() {
  const bodyText = selAll('p, h1, h2, h3, li, span, td, div')
    .map(el => el.childNodes.length === 1 ? el.innerText?.trim() : '')
    .filter(t => t && t.length > 20)
    .join('\n')
    .slice(0, 4000);

  const styles = getComputedStyle(document.body);
  const hasBootstrap = !!document.querySelector('.container, .navbar, .btn, .col-md-');
  const hasTailwind = !!document.querySelector('[class*="flex-"], [class*="text-gray"], [class*="bg-"]') ||
    document.head.innerHTML.includes('tailwind');
  const hasMaterial = !!document.querySelector('[class*="mdc-"], [class*="mat-"]');

  return {
    platform: 'generic',
    url: location.href,
    title: document.title,
    metaDesc: document.querySelector('meta[name="description"]')?.content || '',
    bodyText,
    imgs: document.images.length,
    links: document.links.length,
    buttons: document.querySelectorAll('button').length,
    h1s: selAll('h1').slice(0, 4).map(h => h.innerText.trim()),
    h2s: selAll('h2').slice(0, 6).map(h => h.innerText.trim()),
    font: styles.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
    bg: styles.backgroundColor,
    framework: hasBootstrap ? 'Bootstrap' : hasTailwind ? 'Tailwind' : hasMaterial ? 'Material' : 'None detected',
  };
}

// ─── GitHub Profile ─────────────────────────────────────────────────
function extractGitHubProfile() {
  const username = location.pathname.split('/').filter(Boolean)[0];

  const pinnedRepos = selAll('.pinned-item-list-item').slice(0, 6).map(r => ({
    name: sel('.repo, a[href*="/' + username + '/"]', r),
    desc: sel('.pinned-item-desc', r),
    stars: sel('[href$="stargazers"], a[href*="stargazers"]', r) || '0',
    lang: sel('.d-inline-block.mr-3 span:last-child, [class*="language"]', r),
  }));

  const langs = [...new Set(
    selAll('.d-inline-block.mr-3 span:last-child, [data-filterable-for] [class*="color-"] + span')
      .map(l => l.innerText.trim()).filter(Boolean)
  )].slice(0, 8);

  return {
    platform: 'github_profile',
    url: location.href,
    username,
    name: sel('[itemprop="name"], .p-name') || username,
    bio: sel('[itemprop="description"], .p-note, [data-bio-text]'),
    company: sel('[itemprop="worksFor"] span'),
    location: sel('[itemprop="homeLocation"] span'),
    website: document.querySelector('[itemprop="url"] a')?.href || '',
    followers: sel('a[href$="?tab=followers"] .text-bold, a[href*="followers"] .Counter, a[href*="followers"] span.text-bold'),
    following: sel('a[href$="?tab=following"] .text-bold, a[href*="following"] .Counter, a[href*="following"] span.text-bold'),
    repoCount: sel('a[href*="tab=repositories"] .Counter'),
    contributions: sel('.js-yearly-contributions h2, .ContributionCalendar h2'),
    pinnedRepos,
    langs,
  };
}

// ─── GitHub Repo ────────────────────────────────────────────────────
function extractGitHubRepo() {
  const parts = location.pathname.split('/').filter(Boolean);
  return {
    platform: 'github_repo',
    url: location.href,
    username: parts[0],
    reponame: parts[1],
    desc: sel('.f4.my-3, .repository-content p.f4, [class*="repository-description"]'),
    stars: sel('#repo-stars-counter-star, .js-social-count, [href$="/stargazers"] strong'),
    forks: sel('[href$="/forks"] .social-count, [href$="/forks"] strong'),
    language: sel('[data-ga-click*="Language"], [itemprop="programmingLanguage"]'),
    topics: selAll('.topic-tag, .IssueLabel').slice(0, 10).map(t => t.innerText.trim()),
    readme: document.querySelector('#readme article')?.innerText?.slice(0, 1500) || '',
    lastCommit: sel('relative-time, time-ago, .no-wrap'),
    openIssues: sel('[href*="/issues"] .Counter'),
    license: sel('[data-analytics-event*="license"] span, .octicon-law + span'),
  };
}

// ─── LinkedIn ────────────────────────────────────────────────────────
function extractLinkedIn() {
  const experiences = selAll('.pvs-list__item--line-separated').slice(0, 4).map(item => ({
    title: sel('.t-bold span[aria-hidden="true"]', item),
    company: item.querySelectorAll('.t-14.t-normal span[aria-hidden="true"]')[0]?.innerText?.trim() || '',
    duration: item.querySelectorAll('.t-14.t-normal.t-black--light span[aria-hidden="true"]')[0]?.innerText?.trim() || '',
  })).filter(e => e.title);

  const about = selAll('#about ~ div span[aria-hidden="true"], .pv-shared-text-with-see-more span')
    .map(s => s.innerText.trim()).join(' ').slice(0, 500);

  return {
    platform: 'linkedin',
    url: location.href,
    name: sel('h1, .text-heading-xlarge'),
    headline: sel('.text-body-medium.break-words, .pv-text-details__left-panel > .text-body-medium'),
    location: sel('.text-body-small.t-black--light.break-words'),
    about,
    connections: sel('.pv-top-card--list-bullet li a, [href*="connections"] span'),
    experiences,
    skills: selAll('[data-field="skill_name"], .pvs-entity__sub-text').slice(0, 8).map(s => s.innerText.trim()),
    posts: selAll('[data-urn*="activity"] .break-words span[aria-hidden="true"]').slice(0, 3)
      .map(p => p.innerText.trim()).filter(Boolean),
  };
}

// ─── Twitter / X ─────────────────────────────────────────────────────
function extractTwitter() {
  const username = location.pathname.split('/').filter(Boolean)[0];

  return {
    platform: 'twitter',
    url: location.href,
    username,
    displayName: sel('[data-testid="UserName"] span'),
    bio: sel('[data-testid="UserDescription"]'),
    followers: document.querySelector('a[href*="/followers"] span span')?.innerText || '',
    following: document.querySelector('a[href*="/following"] span span')?.innerText || '',
    location: sel('[data-testid="UserLocation"] span'),
    joined: sel('[data-testid="UserJoinDate"] span'),
    website: document.querySelector('[data-testid="UserUrl"] a')?.href || '',
    isBlueTick: !!document.querySelector('[data-testid="icon-verified"], svg[aria-label*="Verified"]'),
    tweets: selAll('[data-testid="tweetText"]').slice(0, 6).map(t => t.innerText.trim()),
  };
}

// ─── Message Listener ─────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Page data extraction
  if (msg.action === 'extractData') {
    try {
      const platform = detectPlatform();
      let data;
      if (platform === 'github_profile') data = extractGitHubProfile();
      else if (platform === 'github_repo') data = extractGitHubRepo();
      else if (platform === 'linkedin') data = extractLinkedIn();
      else if (platform === 'twitter') data = extractTwitter();
      else data = extractGeneric();
      sendResponse({ success: true, data });
    } catch (e) {
      sendResponse({ success: false, error: e.message, data: extractGeneric() });
    }
    return true;
  }

  // Page dimensions (for full-page scroll capture)
  if (msg.action === 'getPageInfo') {
    sendResponse({
      totalHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      originalScrollY: Math.round(window.scrollY),
    });
    return true;
  }

  // Scroll page to a Y position, then confirm when settled
  if (msg.action === 'scrollTo') {
    window.scrollTo({ top: msg.y, behavior: 'instant' });
    setTimeout(() => sendResponse({ done: true }), 150);
    return true;
  }

  return true;
});
