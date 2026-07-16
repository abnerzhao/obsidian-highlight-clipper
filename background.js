function openSidePanel(windowId) {
  return chrome.sidePanel.open({ windowId }).catch((error) => console.error('无法打开侧边栏：', error));
}

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((error) => console.error('无法配置侧边栏：', error));

async function sendToContentScript(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (!error.message?.includes('Receiving end does not exist')) throw error;
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    return chrome.tabs.sendMessage(tabId, message);
  }
}

async function setSelectionMode(tabId, selectionMode) {
  try {
    const data = await chrome.storage.session.get({ selectionModes: {} });
    await chrome.storage.session.set({ selectionModes: { ...data.selectionModes, [tabId]: selectionMode } });
    return await sendToContentScript(tabId, { type: 'SET_SELECTION_MODE', selectionMode });
  } catch (error) {
    console.error('无法切换高亮选择模式：', error);
    return { selectionMode: false };
  }
}

async function toggleSelectionMode(tabId) {
  const data = await chrome.storage.session.get({ selectionModes: {} });
  return setSelectionMode(tabId, !Boolean(data.selectionModes[tabId]));
}

async function enableSelectionMode(tabId) {
  return setSelectionMode(tabId, true);
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_SELECTION_MODE_FOR_TAB') {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
      if (!tab?.id) return { selectionMode: false };
      return toggleSelectionMode(tab.id);
    }).then(sendResponse);
    return true;
  }
  if (message.type === 'GET_SELECTION_MODE_FOR_CURRENT_TAB' && sender.tab?.id) {
    chrome.storage.session.get({ selectionModes: {} }).then((data) => {
      sendResponse({ selectionMode: Boolean(data.selectionModes[sender.tab.id]) });
    });
    return true;
  }
});
