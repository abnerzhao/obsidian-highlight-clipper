import './clip-queue.js';

const PAGE_STORAGE_KEY = 'highlightsByPage';
const QUEUE_STORAGE_KEY = 'clipQueue';
const lastShortcutToggleByTab = new Map();
const sessionStorageReady = chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })
  .catch((error) => console.error('无法初始化会话暂存：', error));

async function migrateLegacyHighlights() {
  await sessionStorageReady;
  const session = await chrome.storage.session.get({ [PAGE_STORAGE_KEY]: {}, [QUEUE_STORAGE_KEY]: [] });
  if (Object.keys(session[PAGE_STORAGE_KEY]).length || session[QUEUE_STORAGE_KEY].length) return;
  const local = await chrome.storage.local.get({ [PAGE_STORAGE_KEY]: {} });
  if (!Object.keys(local[PAGE_STORAGE_KEY]).length) return;
  await chrome.storage.session.set({
    [PAGE_STORAGE_KEY]: local[PAGE_STORAGE_KEY],
    [QUEUE_STORAGE_KEY]: ClipQueue.fromLegacy(local[PAGE_STORAGE_KEY])
  });
  await chrome.storage.local.remove(PAGE_STORAGE_KEY);
}

async function deleteClip(id) {
  await sessionStorageReady;
  const data = await chrome.storage.session.get({ [PAGE_STORAGE_KEY]: {}, [QUEUE_STORAGE_KEY]: [] });
  const next = ClipQueue.remove(data[QUEUE_STORAGE_KEY], data[PAGE_STORAGE_KEY], id);
  await chrome.storage.session.set({ [PAGE_STORAGE_KEY]: next.highlightsByPage, [QUEUE_STORAGE_KEY]: next.queue });
  return { ok: true };
}

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((error) => console.error('无法配置侧边栏：', error));
migrateLegacyHighlights().catch((error) => console.error('无法迁移暂存剪藏：', error));

async function sendToContentScript(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (!error.message?.includes('Receiving end does not exist')) throw error;
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ['clip-queue.js', 'content.js'] });
    return chrome.tabs.sendMessage(tabId, message);
  }
}

async function isHighlightableTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  const url = tab.url ?? '';
  return /^https?:\/\//.test(url) && !/^https?:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/.test(url);
}

async function clearSelectionModeState(tabId) {
  const data = await chrome.storage.session.get({ selectionModes: {} });
  await chrome.storage.session.set({ selectionModes: { ...data.selectionModes, [tabId]: false } });
}

async function setSelectionMode(tabId, selectionMode) {
  try {
    await sessionStorageReady;
    if (selectionMode && !await isHighlightableTab(tabId)) {
      await clearSelectionModeState(tabId);
      return { selectionMode: false };
    }
    if (selectionMode) {
      const response = await sendToContentScript(tabId, { type: 'SET_SELECTION_MODE', selectionMode: true });
      const data = await chrome.storage.session.get({ selectionModes: {} });
      await chrome.storage.session.set({ selectionModes: { ...data.selectionModes, [tabId]: true } });
      return response;
    }
    const data = await chrome.storage.session.get({ selectionModes: {} });
    await chrome.storage.session.set({ selectionModes: { ...data.selectionModes, [tabId]: false } });
    return await sendToContentScript(tabId, { type: 'SET_SELECTION_MODE', selectionMode: false });
  } catch (error) {
    await clearSelectionModeState(tabId);
    if (!error.message?.includes('Cannot access contents of the page')) {
      console.error('无法切换高亮选择模式：', error);
    }
    return { selectionMode: false };
  }
}

async function toggleSelectionMode(tabId) {
  await sessionStorageReady;
  const data = await chrome.storage.session.get({ selectionModes: {} });
  return setSelectionMode(tabId, !Boolean(data.selectionModes[tabId]));
}

async function toggleSelectionModeFromShortcut(tabId) {
  const now = Date.now();
  const lastToggle = lastShortcutToggleByTab.get(tabId) ?? 0;
  if (now - lastToggle < 350) {
    const data = await chrome.storage.session.get({ selectionModes: {} });
    return { selectionMode: Boolean(data.selectionModes[tabId]) };
  }
  lastShortcutToggleByTab.set(tabId, now);
  return toggleSelectionMode(tabId);
}

async function disableSelectionMode(tabId) {
  await sessionStorageReady;
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

function openPanelAndEnableSelection(tab) {
  if (!tab.id) return;
  chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => console.error('无法打开侧边栏：', error));
  return setSelectionMode(tab.id, true);
}

chrome.action.onClicked.addListener(openPanelAndEnableSelection);

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await setSelectionMode(tabId, true);
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'highlight-selection') return;
  chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
    if (tab?.id) return openPanelAndEnableSelection(tab);
    return undefined;
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_SELECTION_MODE_FOR_TAB') {
    const targetTab = message.tabId
      ? Promise.resolve(message.tabId)
      : sessionStorageReady.then(() => chrome.tabs.query({ active: true, lastFocusedWindow: true })).then(([tab]) => tab?.id);
    targetTab.then((tabId) => {
      if (!tabId) return { selectionMode: false };
      return toggleSelectionMode(tabId);
    }).then(sendResponse);
    return true;
  }
  if (message.type === 'TOGGLE_SELECTION_MODE_FROM_PAGE_SHORTCUT' && sender.tab?.id) {
    toggleSelectionModeFromShortcut(sender.tab.id).then(sendResponse);
    return true;
  }
  if (message.type === 'GET_SELECTION_MODE_FOR_CURRENT_TAB' && sender.tab?.id) {
    sessionStorageReady.then(() => chrome.storage.session.get({ selectionModes: {} })).then((data) => {
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
  if (message.type === 'DELETE_CLIP_QUEUE_ITEM' && message.id) {
    deleteClip(message.id).then(sendResponse);
    return true;
  }
  if (message.type === 'CLEAR_CLIP_QUEUE') {
    sessionStorageReady.then(() => chrome.storage.session.set({ [PAGE_STORAGE_KEY]: {}, [QUEUE_STORAGE_KEY]: [] }))
      .then(() => sendResponse({ ok: true }));
    return true;
  }
});
