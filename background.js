// ARCAM — toolbar icon opens the studio in the browser sidebar (side panel).
// The ⛶ button inside the panel promotes it to a full tab; the gear opens Settings.
if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

// Fallback for Chrome versions without the sidePanel API (< 114).
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("studio.html") });
});