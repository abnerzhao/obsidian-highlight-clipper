const saveModes = document.querySelectorAll('input[name="saveMode"]');
const customFile = document.querySelector('#customFile');
const includeSource = document.querySelector('#includeSource');
const status = document.querySelector('#status');

function toggleCustomFile() {
  customFile.hidden = document.querySelector('input[name="saveMode"]:checked').value !== 'custom';
}

chrome.storage.sync.get({ saveMode: 'daily', customFile: 'Inbox/Web Highlights.md', includeSource: true, panelTheme: 'light' }).then((settings) => {
  document.querySelector(`input[name="saveMode"][value="${settings.saveMode}"]`).checked = true;
  customFile.value = settings.customFile;
  includeSource.checked = settings.includeSource;
  document.querySelector(`input[name="panelTheme"][value="${settings.panelTheme}"]`).checked = true;
  toggleCustomFile();
});

saveModes.forEach((input) => input.addEventListener('change', toggleCustomFile));

document.querySelector('#save').addEventListener('click', async () => {
  const saveMode = document.querySelector('input[name="saveMode"]:checked').value;
  if (saveMode === 'custom' && !customFile.value.trim()) {
    status.textContent = '请填写文件路径';
    return;
  }
  const panelTheme = document.querySelector('input[name="panelTheme"]:checked').value;
  await chrome.storage.sync.set({ saveMode, customFile: customFile.value.trim(), includeSource: includeSource.checked, panelTheme });
  status.textContent = '已保存';
});

document.querySelector('#openPanel').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
  window.close();
});

document.querySelector('#openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());
