chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error('无法配置侧边栏：', error));

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

async function enableSelectionModeForWindow(windowId) {
  const [tab] = await chrome.tabs.query({ active: true, windowId });
  if (tab?.id) await setSelectionMode(tab.id, true);
}

if (chrome.sidePanel.onOpened) {
  chrome.sidePanel.onOpened.addListener(({ windowId }) => {
    enableSelectionModeForWindow(windowId);
  });
}

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'highlight-selection') return;
  chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
    if (tab?.id) return toggleSelectionMode(tab.id);
    return undefined;
  });
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
