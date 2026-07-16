chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

async function toggleSelectionMode(tabId) {
  try {
    const result = await chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_SELECTION_MODE' });
    const data = await chrome.storage.session.get({ selectionModes: {} });
    await chrome.storage.session.set({ selectionModes: { ...data.selectionModes, [tabId]: result.selectionMode } });
    if (result.selectionMode) await chrome.sidePanel.open({ tabId });
    return result;
  } catch {
    return { selectionMode: false };
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'highlight-selection') return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id) await toggleSelectionMode(tab.id);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'TOGGLE_SELECTION_MODE_FOR_TAB') return;
  toggleSelectionMode(message.tabId).then(sendResponse);
  return true;
});
