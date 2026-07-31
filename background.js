import './clip-queue.js';

const PAGE_STORAGE_KEY = 'highlightsByPage';
const QUEUE_STORAGE_KEY = 'clipQueue';
const SELECTION_MODE_KEY = 'selectionModeEnabled';
let lastShortcutToggleAt = 0;
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

async function syncLegacyTabHighlights(highlightsByPage) {
  await sessionStorageReady;
  const entries = Object.entries(highlightsByPage ?? {}).filter(([, items]) => Array.isArray(items));
  if (!entries.length) return;
  const data = await chrome.storage.session.get({ [PAGE_STORAGE_KEY]: {}, [QUEUE_STORAGE_KEY]: [] });
  const nextHighlightsByPage = { ...data[PAGE_STORAGE_KEY] };
  let nextQueue = data[QUEUE_STORAGE_KEY];
  for (const [pageUrl, items] of entries) {
    if (items.length) nextHighlightsByPage[pageUrl] = items;
    else delete nextHighlightsByPage[pageUrl];
    nextQueue = ClipQueue.syncPage(nextQueue, items, pageUrl, pageUrl);
  }
  await chrome.storage.session.set({ [PAGE_STORAGE_KEY]: nextHighlightsByPage, [QUEUE_STORAGE_KEY]: nextQueue });
  chrome.runtime.sendMessage({ type: 'CLIP_QUEUE_CHANGED' }).catch(() => {});
}

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((error) => console.error('无法配置侧边栏：', error));
migrateLegacyHighlights().catch((error) => console.error('无法迁移暂存剪藏：', error));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[PAGE_STORAGE_KEY]?.newValue) return;
  syncLegacyTabHighlights(changes[PAGE_STORAGE_KEY].newValue)
    .catch((error) => console.error('无法同步旧页面暂存剪藏：', error));
});

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

async function getSelectionMode() {
  await sessionStorageReady;
  const data = await chrome.storage.session.get({ [SELECTION_MODE_KEY]: false });
  return Boolean(data[SELECTION_MODE_KEY]);
}

async function syncSelectionModeToTab(tabId, selectionMode) {
  try {
    if (!await isHighlightableTab(tabId)) return { selectionMode: false };
    return await sendToContentScript(tabId, { type: 'SET_SELECTION_MODE', selectionMode });
  } catch (error) {
    if (!error.message?.includes('Cannot access contents of the page')) {
      console.error('无法切换高亮选择模式：', error);
    }
    return { selectionMode };
  }
}

async function setSelectionMode(selectionMode, tabId) {
  await sessionStorageReady;
  const nextSelectionMode = Boolean(selectionMode);
  await chrome.storage.session.set({ [SELECTION_MODE_KEY]: nextSelectionMode });
  chrome.runtime.sendMessage({ type: 'SELECTION_MODE_CHANGED', selectionMode: nextSelectionMode }).catch(() => {});
  if (tabId) await syncSelectionModeToTab(tabId, nextSelectionMode);
  return { selectionMode: nextSelectionMode };
}

async function toggleSelectionMode() {
  return setSelectionMode(!await getSelectionMode());
}

async function toggleSelectionModeFromShortcut() {
  const now = Date.now();
  if (now - lastShortcutToggleAt < 350) return { selectionMode: await getSelectionMode() };
  lastShortcutToggleAt = now;
  return toggleSelectionMode();
}

function openPanelAndEnableSelection(tab) {
  if (!tab.id) return;
  chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => console.error('无法打开侧边栏：', error));
  return setSelectionMode(true, tab.id);
}

chrome.action.onClicked.addListener(openPanelAndEnableSelection);

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await syncSelectionModeToTab(tabId, await getSelectionMode());
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    await syncSelectionModeToTab(tabId, await getSelectionMode());
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'highlight-selection') return;
  chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
    if (tab?.id) return openPanelAndEnableSelection(tab);
    return undefined;
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CLIP_QUEUE_UPDATED') {
    chrome.runtime.sendMessage({ type: 'CLIP_QUEUE_CHANGED' }).catch(() => {});
    sendResponse({ ok: true });
    return;
  }
  if (message.type === 'TOGGLE_SELECTION_MODE') {
    toggleSelectionMode().then(sendResponse);
    return true;
  }
  if (message.type === 'TOGGLE_SELECTION_MODE_FROM_PAGE_SHORTCUT' && sender.tab?.id) {
    toggleSelectionModeFromShortcut().then(sendResponse);
    return true;
  }
  if (message.type === 'GET_SELECTION_MODE' || message.type === 'GET_SELECTION_MODE_FOR_CURRENT_TAB') {
    getSelectionMode().then((selectionMode) => sendResponse({ selectionMode }));
    return true;
  }
  if (message.type === 'ENABLE_SELECTION_MODE_FOR_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
      if (!tab?.id) return { selectionMode: false };
      return setSelectionMode(true, tab.id);
    }).then(sendResponse);
    return true;
  }
  if (message.type === 'DISABLE_SELECTION_MODE_FOR_TAB') {
    setSelectionMode(false, message.tabId).then(sendResponse);
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
