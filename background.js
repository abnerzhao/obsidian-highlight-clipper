chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

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

async function enableSelectionMode(tabId) {
  try {
    const state = await chrome.tabs.sendMessage(tabId, { type: 'GET_SELECTION_MODE' });
    if (!state.selectionMode) return toggleSelectionMode(tabId);
    await chrome.sidePanel.open({ tabId });
    return state;
  } catch {
    return { selectionMode: false };
  }
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) enableSelectionMode(tab.id);
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return;
  if (command === 'highlight-selection') await toggleSelectionMode(tab.id);
  if (command === 'open-side-panel') await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'TOGGLE_SELECTION_MODE_FOR_TAB') return;
  toggleSelectionMode(message.tabId).then(sendResponse);
  return true;
});
