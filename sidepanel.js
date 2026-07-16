let activeTab;
let highlights = [];
let selectionMode = false;
let language = 'en';
let saveSettings = { saveMode: 'daily', customFile: 'Inbox/Web Highlights.md', includeSource: true, panelTheme: 'auto', language: 'en' };

const translations = {
  en: { title: 'Page highlights', settings: 'Settings', mode: 'Selection mode', on: 'On', off: 'Off', save: 'Save to Obsidian', copy: 'Copy', copied: 'Copied', clear: 'Clear all', emptyTitle: 'No highlights yet', emptyBody: 'Turn on selection mode, then select text on the page.', source: 'Source', delete: 'Delete' },
  'zh-CN': { title: '本页高亮剪藏', settings: '设置', mode: '选择模式', on: '开', off: '关', save: '保存到 Obsidian', copy: '复制', copied: '已复制', clear: '清除全部', emptyTitle: '还没有高亮内容', emptyBody: '开启选择模式后，选中文本即可剪藏。', source: '原文链接', delete: '删除' }
};

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
  const text = translations[language];
  count.textContent = highlights.length ? `(${highlights.length})` : '';
  mode.classList.toggle('active', selectionMode);
  mode.setAttribute('aria-pressed', String(selectionMode));
  [save, copy, clear].forEach((button) => { button.disabled = highlights.length === 0; });
  list.innerHTML = highlights.length
    ? highlights.map((item) => `<li class="item"><span>${escapeHtml(item.text)}</span><button class="delete" type="button" data-id="${item.id}" aria-label="${text.delete}">×</button></li>`).join('')
    : `<li class="empty"><strong>${text.emptyTitle}</strong><span>${text.emptyBody}</span><kbd>macOS: Control + Shift + H</kbd><kbd>Windows/Linux: Alt + Shift + H</kbd></li>`;
  list.querySelectorAll('.delete').forEach((button) => button.addEventListener('click', () => sendToPage({ type: 'DELETE_HIGHLIGHT', id: button.dataset.id })));
}

function applyLanguage(value) {
  language = translations[value] ? value : 'en';
  const text = translations[language];
  document.documentElement.lang = language;
  document.querySelector('#titleLabel').textContent = text.title;
  document.querySelector('#settings').setAttribute('aria-label', text.settings);
  document.querySelector('#settings').title = text.settings;
  document.querySelector('#modeLabel').textContent = text.mode;
  document.querySelector('#modeOn').textContent = text.on;
  document.querySelector('#modeOff').textContent = text.off;
  save.textContent = text.save;
  copy.textContent = text.copy;
  clear.textContent = text.clear;
  render();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function resolveFilePath(template) {
  const date = new Date();
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const tokens = {
    '{{YYYY/MM/DD}}': `${yyyy}/${mm}/${dd}`,
    '{{YYYY-MM-DD}}': `${yyyy}-${mm}-${dd}`,
    '{{YYYY}}': yyyy,
    '{{MM}}': mm,
    '{{DD}}': dd
  };
  return Object.entries(tokens).reduce((path, [token, value]) => path.replaceAll(token, value), template);
}

async function sendToPage(message) {
  if (!activeTab?.id) return;
  await chrome.tabs.sendMessage(activeTab.id, message);
  await refresh();
}

async function toggleMode() {
  if (!activeTab?.id) return;
  const result = await chrome.runtime.sendMessage({ type: 'TOGGLE_SELECTION_MODE_FOR_TAB' });
  selectionMode = result.selectionMode;
  render();
}

function markdown() {
  const source = saveSettings.includeSource ? `\n>\n> ${translations[language].source}: [${activeTab.title}](${activeTab.url})` : '';
  return `${highlights.map((item) => `> ${item.text}`).join('\n>\n')}${source}\n`;
}

function applySettings(settings) {
  saveSettings = { ...saveSettings, ...settings };
  panel.dataset.theme = saveSettings.panelTheme;
  applyLanguage(saveSettings.language);
}

mode.addEventListener('click', toggleMode);
clear.addEventListener('click', () => sendToPage({ type: 'CLEAR_HIGHLIGHTS' }));
copy.addEventListener('click', async () => {
  await navigator.clipboard.writeText(markdown());
  copy.textContent = translations[language].copied;
  setTimeout(() => { copy.textContent = translations[language].copy; }, 1500);
});
save.addEventListener('click', async () => {
  const content = markdown();
  const url = saveSettings.saveMode === 'daily'
    ? `obsidian://daily?append=true&content=${encodeURIComponent(content)}`
    : `obsidian://new?file=${encodeURIComponent(resolveFilePath(saveSettings.customFile.trim()))}&append=true&content=${encodeURIComponent(content)}`;
  const result = await chrome.runtime.sendMessage({ type: 'OPEN_OBSIDIAN', tabId: activeTab.id, url });
  if (!result.ok) console.error('无法打开 Obsidian：', result.error);
});
document.querySelector('#settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'local' || area === 'session') refresh();
  if (area === 'sync') chrome.storage.sync.get(saveSettings).then(applySettings);
});
chrome.tabs.onActivated.addListener(refresh);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => { if (changeInfo.status === 'complete') refresh(); });
chrome.storage.sync.get(saveSettings).then(applySettings);
chrome.runtime.sendMessage({ type: 'ENABLE_SELECTION_MODE_FOR_ACTIVE_TAB' }).catch(() => {});
refresh();
