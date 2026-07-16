let activeTab;
let highlights = [];
let selectionMode = false;

const panel = document.querySelector('#panel');
const list = document.querySelector('#list');
const count = document.querySelector('#count');
const mode = document.querySelector('#mode');
const save = document.querySelector('#save');
const copy = document.querySelector('#copy');
const clear = document.querySelector('#clear');

async function refresh() {
  [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!activeTab?.url) {
    highlights = [];
    selectionMode = false;
    return render();
  }
  const data = await chrome.storage.local.get('highlightsByPage');
  highlights = data.highlightsByPage?.[activeTab.url] ?? [];
  const modes = await chrome.storage.session.get({ selectionModes: {} });
  selectionMode = Boolean(modes.selectionModes[activeTab.id]);
  render();
}

function render() {
  count.textContent = highlights.length ? `(${highlights.length})` : '';
  mode.classList.toggle('active', selectionMode);
  mode.setAttribute('aria-pressed', String(selectionMode));
  [save, copy, clear].forEach((button) => { button.disabled = highlights.length === 0; });
  list.innerHTML = highlights.length
    ? highlights.map((item) => `<li class="item"><span>${escapeHtml(item.text)}</span><button class="delete" type="button" data-id="${item.id}" aria-label="删除">×</button></li>`).join('')
    : '<li class="empty"><strong>还没有高亮内容</strong><span>按快捷键开启选择模式后，选中文本即可剪藏。</span><kbd>macOS：Control + Shift + H</kbd><kbd>Windows/Linux：Alt + Shift + H</kbd></li>';
  list.querySelectorAll('.delete').forEach((button) => button.addEventListener('click', () => sendToPage({ type: 'DELETE_HIGHLIGHT', id: button.dataset.id })));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function sendToPage(message) {
  if (!activeTab?.id) return;
  await chrome.tabs.sendMessage(activeTab.id, message);
  await refresh();
}

async function toggleMode() {
  if (!activeTab?.id) return;
  const result = await chrome.runtime.sendMessage({ type: 'TOGGLE_SELECTION_MODE_FOR_TAB', tabId: activeTab.id });
  selectionMode = result.selectionMode;
  render();
}

async function markdownAndSettings() {
  const settings = await chrome.storage.sync.get({ saveMode: 'daily', customFile: 'Inbox/Web Highlights.md', includeSource: true });
  const source = settings.includeSource ? `\n>\n> 原文链接：[${activeTab.title}](${activeTab.url})` : '';
  return { settings, markdown: `${highlights.map((item) => `> ${item.text}`).join('\n>\n')}${source}\n` };
}

mode.addEventListener('click', toggleMode);
clear.addEventListener('click', () => sendToPage({ type: 'CLEAR_HIGHLIGHTS' }));
copy.addEventListener('click', async () => {
  const { markdown } = await markdownAndSettings();
  await navigator.clipboard.writeText(markdown);
  copy.textContent = '已复制';
  setTimeout(() => { copy.textContent = '复制'; }, 1500);
});
save.addEventListener('click', async () => {
  const { settings, markdown } = await markdownAndSettings();
  const url = settings.saveMode === 'daily'
    ? `obsidian://daily?append=true&content=${encodeURIComponent(markdown)}`
    : `obsidian://new?file=${encodeURIComponent(settings.customFile.trim())}&append=true&content=${encodeURIComponent(markdown)}`;
  const link = document.createElement('a');
  link.href = url;
  link.click();
});
document.querySelector('#settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
document.querySelector('#exit').addEventListener('click', async () => {
  const current = await chrome.windows.getCurrent();
  await chrome.sidePanel.close({ windowId: current.id }).catch(() => window.close());
});
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'local' || area === 'session') refresh();
  if (area === 'sync') chrome.storage.sync.get({ panelTheme: 'sand' }).then((settings) => { panel.dataset.theme = settings.panelTheme; });
});
chrome.tabs.onActivated.addListener(refresh);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => { if (changeInfo.status === 'complete') refresh(); });
chrome.storage.sync.get({ panelTheme: 'sand' }).then((settings) => { panel.dataset.theme = settings.panelTheme; });
refresh();
