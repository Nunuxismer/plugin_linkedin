chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ favoriteLists: [] }, (result) => {
    if (!Array.isArray(result.favoriteLists)) {
      chrome.storage.local.set({ favoriteLists: [] });
    }
  });
});
