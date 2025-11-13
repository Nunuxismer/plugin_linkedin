function getSlugFromUrl(url) {
  const match = url.match(/linkedin\.com\/in\/([^/?]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

function getProfileName() {
  const selectors = ['h1', '.pv-text-details__left-panel h1'];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText.trim()) {
      return el.innerText.trim();
    }
  }
  return null;
}

function getHeadline() {
  const selectors = [
    '.pv-text-details__left-panel .text-body-medium',
    '.pv-text-details__left-panel .break-words',
    '.pv-top-card h2'
  ];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText.trim()) {
      return el.innerText.trim();
    }
  }
  return null;
}

function extractMemberIdFromHtml() {
  const html = document.documentElement.outerHTML;
  let match = html.match(/fsd_profile%3A(ACo[A-Za-z0-9_-]+)/);
  if (match && match[1]) return match[1];
  match = html.match(/fsd_profile:(ACo[A-Za-z0-9_-]+)/);
  if (match && match[1]) return match[1];
  return null;
}

let cachedMemberId = null;

function cacheMemberId() {
  cachedMemberId = extractMemberIdFromHtml();
  if (cachedMemberId && globalThis.chrome?.runtime?.sendMessage) {
    try {
      globalThis.chrome.runtime.sendMessage({
        type: 'PROFILE_MEMBER_ID',
        memberId: cachedMemberId
      });
    } catch (error) {
      // Ignore messaging errors when no receiver is available.
    }
  }
  return cachedMemberId;
}

cacheMemberId();

function getProfileInfo() {
  const profileUrl = window.location.href.split('?')[0];
  return {
    profileUrl,
    slug: getSlugFromUrl(profileUrl),
    fullName: getProfileName(),
    headline: getHeadline(),
    memberId: cachedMemberId || cacheMemberId(),
    dateCaptured: new Date().toISOString()
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'GET_PROFILE_INFO') {
    sendResponse({ profile: getProfileInfo() });
  }
});
