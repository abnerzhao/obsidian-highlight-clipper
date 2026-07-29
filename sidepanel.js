let activeTab;
let highlights = [];
let selectionMode = false;
let language = 'en';
let saveSettings = { saveMode: 'daily', vaultName: '', customFile: 'Inbox/Web Highlights.md', includeSource: true, panelTheme: 'auto', language: 'en' };

const translations = {
  en: { title: 'Clip queue', settings: 'Settings', mode: 'Selection mode', modeDescription: 'Select text to add clips', on: 'On', off: 'Off', save: 'Save to Obsidian', sent: 'Sent to Obsidian', failed: 'Could not open Obsidian', vaultRequired: 'Set a vault name in Settings', copy: 'Copy', copied: 'Copied', clear: 'Clear all', emptyTitle: 'No clips yet', emptyBody: 'Turn on selection mode, then select text on any page.', source: 'Source', delete: 'Delete', clips: 'clips' },
  'zh-CN': { title: '暂存剪藏', settings: '设置', mode: '选择模式', modeDescription: '选中文本即可加入暂存剪藏', on: '开', off: '关', save: '保存到 Obsidian', sent: '已发送到 Obsidian', failed: '无法打开 Obsidian', vaultRequired: '请先在设置中填写 Vault 名称', copy: '复制', copied: '已复制', clear: '清除全部', emptyTitle: '还没有暂存内容', emptyBody: '开启选择模式后，可在任意页面选中文本剪藏。', source: '原文链接', delete: '删除', clips: '条剪藏' }
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
  const data = await chrome.storage.session.get({ clipQueue: [], selectionModes: {} });
  highlights = data.clipQueue;
  selectionMode = Boolean(activeTab?.id && data.selectionModes[activeTab.id]);
  render();
}

function render() {
  const text = translations[language];
  count.textContent = highlights.length ? `(${highlights.length})` : '';
  mode.classList.toggle('active', selectionMode);
  mode.setAttribute('aria-pressed', String(selectionMode));
  [save, copy, clear].forEach((button) => { button.disabled = highlights.length === 0; });
  list.innerHTML = highlights.length
    ? groupHighlights().map(({ pageTitle, pageUrl, items }) => `<li class="source-group"><div class="source-header" title="${escapeHtml(pageTitle)}"><span>${escapeHtml(pageTitle)}</span><small>${items.length} ${text.clips}</small></div>${items.map((item) => `<div class="clip-item"><span>${escapeHtml(item.text)}</span><button class="delete" type="button" data-id="${item.id}" aria-label="${text.delete}">×</button></div>`).join('')}</li>`).join('')
    : `<li class="empty"><strong>${text.emptyTitle}</strong><span>${text.emptyBody}</span><kbd>macOS: Control + Shift + H</kbd><kbd>Windows/Linux: Alt + Shift + H</kbd></li>`;
  list.querySelectorAll('.delete').forEach((button) => button.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'DELETE_CLIP_QUEUE_ITEM', id: button.dataset.id });
    await refresh();
  }));
}

function groupHighlights() {
  const groups = new Map();
  for (const item of highlights) {
    const pageUrl = item.pageUrl || '';
    if (!groups.has(pageUrl)) {
      groups.set(pageUrl, { pageUrl, pageTitle: item.pageTitle || item.pageUrl || '', items: [] });
    }
    groups.get(pageUrl).items.push(item);
  }
  return [...groups.values()];
}

function applyLanguage(value) {
  language = translations[value] ? value : 'en';
  const text = translations[language];
  document.documentElement.lang = language;
  document.querySelector('#titleLabel').textContent = text.title;
  document.querySelector('#settings').setAttribute('aria-label', text.settings);
  document.querySelector('#settings').title = text.settings;
  document.querySelector('#modeLabel').textContent = text.mode;
  document.querySelector('#modeDescription').textContent = text.modeDescription;
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

async function toggleMode() {
  if (!activeTab?.id) return;
  const result = await chrome.runtime.sendMessage({ type: 'TOGGLE_SELECTION_MODE_FOR_TAB' });
  selectionMode = result.selectionMode;
  render();
}

function markdown() {
  const text = translations[language];
  const clips = groupHighlights().map(({ pageTitle, pageUrl, items }) => {
    const quotes = items.map((item) => `> ${item.text}`).join('\n>\n');
    const source = saveSettings.includeSource
      ? `\n>\n> ${text.source}: [${pageTitle || pageUrl}](${pageUrl})`
      : '';
    return `${quotes}${source}`;
  });
  return `---\n\n${clips.join('\n\n')}\n`;
}

function applySettings(settings) {
  saveSettings = { ...saveSettings, ...settings };
  panel.dataset.theme = saveSettings.panelTheme;
  applyLanguage(saveSettings.language);
}

mode.addEventListener('click', toggleMode);
clear.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'CLEAR_CLIP_QUEUE' });
  await refresh();
});
copy.addEventListener('click', async () => {
  await navigator.clipboard.writeText(markdown());
  copy.textContent = translations[language].copied;
  setTimeout(() => { copy.textContent = translations[language].copy; }, 1500);
});
save.addEventListener('click', async () => {
  const content = markdown();
  let url;
  try {
    url = ObsidianUri.build({ ...saveSettings, content });
  } catch (error) {
    save.textContent = error.message === 'VAULT_NAME_REQUIRED' ? translations[language].vaultRequired : translations[language].failed;
    setTimeout(() => { save.textContent = translations[language].save; }, 2200);
    return;
  }
  const result = await chrome.runtime.sendMessage({ type: 'OPEN_OBSIDIAN', tabId: activeTab.id, url });
  save.textContent = result.ok ? translations[language].sent : translations[language].failed;
  setTimeout(() => { save.textContent = translations[language].save; }, 1800);
  if (!result.ok) console.error('无法打开 Obsidian：', result.error);
});
document.querySelector('#settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'session') refresh();
  if (area === 'sync') chrome.storage.sync.get(saveSettings).then(applySettings);
});
chrome.tabs.onActivated.addListener(refresh);
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => { if (changeInfo.status === 'complete') refresh(); });
chrome.storage.sync.get(saveSettings).then(applySettings);
refresh();
