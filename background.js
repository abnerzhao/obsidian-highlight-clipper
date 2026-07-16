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

async function disableSelectionMode(tabId) {
  const data = await chrome.storage.session.get({ selectionModes: {} });
  if (!data.selectionModes[tabId]) return { selectionMode: false };
  await chrome.storage.session.set({ selectionModes: { ...data.selectionModes, [tabId]: false } });
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'SET_SELECTION_MODE', selectionMode: false });
  } catch {
    // The page may already be navigating or the content script may not exist.
  }
  return { selectionMode: false };
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => console.error('无法打开侧边栏：', error));
  setSelectionMode(tab.id, true);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const data = await chrome.storage.session.get({ selectionModes: {} });
  await Promise.all(Object.entries(data.selectionModes)
    .filter(([id, enabled]) => enabled && Number(id) !== tabId)
    .map(([id]) => disableSelectionMode(Number(id))));
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') disableSelectionMode(tabId);
});

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
  if (message.type === 'ENABLE_SELECTION_MODE_FOR_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
      if (!tab?.id) return { selectionMode: false };
      return setSelectionMode(tab.id, true);
    }).then(sendResponse);
    return true;
  }
  if (message.type === 'DISABLE_SELECTION_MODE_FOR_TAB' && message.tabId) {
    disableSelectionMode(message.tabId).then(sendResponse);
    return true;
  }
  if (message.type === 'OPEN_OBSIDIAN' && message.tabId && message.url) {
    chrome.tabs.update(message.tabId, { url: message.url }).then(
      () => sendResponse({ ok: true }),
      (error) => sendResponse({ ok: false, error: error.message })
    );
    return true;
  }
});
