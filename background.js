function openSidePanel(windowId) {
  return chrome.sidePanel.open({ windowId }).catch((error) => console.error('无法打开侧边栏：', error));
}

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((error) => console.error('无法配置侧边栏：', error));

async function toggleSelectionMode(tabId) {
  try {
    const result = await chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_SELECTION_MODE' });
    const data = await chrome.storage.session.get({ selectionModes: {} });
    await chrome.storage.session.set({ selectionModes: { ...data.selectionModes, [tabId]: result.selectionMode } });
    return result;
  } catch {
    return { selectionMode: false };
  }
}

async function enableSelectionMode(tabId) {
  try {
    const state = await chrome.tabs.sendMessage(tabId, { type: 'GET_SELECTION_MODE' });
    if (!state.selectionMode) return toggleSelectionMode(tabId);
    return state;
  } catch {
    return { selectionMode: false };
  }
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  openSidePanel(tab.windowId);
  enableSelectionMode(tab.id);
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return;
  if (command === 'highlight-selection') {
    openSidePanel(tab.windowId);
    await toggleSelectionMode(tab.id);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'TOGGLE_SELECTION_MODE_FOR_TAB') return;
  toggleSelectionMode(message.tabId).then(sendResponse);
  return true;
});
