chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
  } catch {
    // Chrome 内部页面无法注入 content script。
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'highlight-selection') return;

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'HIGHLIGHT_SELECTION' });
  } catch {
    // Chrome 内部页面无法注入 content script。
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'OPEN_OBSIDIAN_NOTE') return;
  chrome.tabs.create({ url: message.url, active: false });
});
