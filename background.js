chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ favoriteLists: [] }, (result) => {
    if (!Array.isArray(result.favoriteLists)) {
      chrome.storage.local.set({ favoriteLists: [] });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'PROFILE_MEMBER_ID' && message.memberId) {
    // No action required yet; this listener simply avoids runtime errors when
    // the content script notifies the service worker of the detected memberId.
  }
});
