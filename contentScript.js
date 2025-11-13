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

function getMemberIdFromPage() {
  const script = document.querySelector('code[id^="bpr-guid-"]');
  if (!script) return null;
  try {
    const data = JSON.parse(script.textContent);
    const profileView = data?.data?.data;
    if (profileView && profileView.memberProfile) {
      return profileView.memberProfile.memberId;
    }
  } catch (error) {
    // ignore parsing errors
  }
  return null;
}

function getProfileInfo() {
  const profileUrl = window.location.href.split('?')[0];
  return {
    profileUrl,
    slug: getSlugFromUrl(profileUrl),
    fullName: getProfileName(),
    headline: getHeadline(),
    memberId: getMemberIdFromPage(),
    dateCaptured: new Date().toISOString()
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'GET_PROFILE_INFO') {
    sendResponse({ profile: getProfileInfo() });
  }
});
