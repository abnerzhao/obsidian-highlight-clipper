chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'highlight-selection') return;

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SELECTION_MODE' });
  } catch {
    // Chrome 内部页面无法注入 content script。
  }
});
