const saveModes = document.querySelectorAll('input[name="saveMode"]');
const customFile = document.querySelector('#customFile');
const customFileField = document.querySelector('#customFileField');
const includeSource = document.querySelector('#includeSource');
const status = document.querySelector('#status');
const language = document.querySelector('#language');

const copy = {
  en: {
    intro: 'Saving appends all highlights from the current page to the selected note.', language: 'Language', saveLocation: 'Save location', daily: 'Obsidian daily note', custom: 'Custom file', filePath: 'File path', tokens: 'Supported: {{YYYY}}, {{MM}}, {{DD}}, {{YYYY-MM-DD}}, {{YYYY/MM/DD}}', source: 'Include source link', appearance: 'Sidebar appearance', auto: 'Follow browser', sand: 'Sand', light: 'Light', dark: 'Dark', save: 'Save settings', missingPath: 'Enter a file path', saved: 'Saved'
  },
  'zh-CN': {
    intro: '每次保存会把当前页面的全部剪藏追加到所选笔记。', language: '语言', saveLocation: '保存位置', daily: 'Obsidian 每日笔记', custom: '自定义文件', filePath: '文件路径', tokens: '支持：{{YYYY}}、{{MM}}、{{DD}}、{{YYYY-MM-DD}}、{{YYYY/MM/DD}}', source: '携带原文链接', appearance: '侧边栏外观', auto: '跟随浏览器', sand: '米色', light: '浅色', dark: '深色', save: '保存设置', missingPath: '请填写文件路径', saved: '已保存'
  }
};

function applyLanguage(value) {
  const text = copy[value];
  document.documentElement.lang = value;
  document.querySelector('#intro').textContent = text.intro;
  document.querySelector('#languageLabel').textContent = text.language;
  document.querySelector('#saveLocationLegend').textContent = text.saveLocation;
  document.querySelector('#dailyLabel').textContent = text.daily;
  document.querySelector('#customLabel').textContent = text.custom;
  document.querySelector('#filePathLabel').textContent = text.filePath;
  document.querySelector('#tokensHint').textContent = text.tokens;
  document.querySelector('#sourceLabel').textContent = text.source;
  document.querySelector('#appearanceLegend').textContent = text.appearance;
  document.querySelector('#autoThemeLabel').textContent = text.auto;
  document.querySelector('#sandThemeLabel').textContent = text.sand;
  document.querySelector('#lightThemeLabel').textContent = text.light;
  document.querySelector('#darkThemeLabel').textContent = text.dark;
  document.querySelector('#save').textContent = text.save;
}

function toggleCustomFile() {
  customFileField.hidden = document.querySelector('input[name="saveMode"]:checked').value !== 'custom';
}

chrome.storage.sync.get({ saveMode: 'daily', customFile: 'Inbox/Web Highlights.md', includeSource: true, panelTheme: 'auto', language: 'en' }).then((settings) => {
  document.querySelector(`input[name="saveMode"][value="${settings.saveMode}"]`).checked = true;
  customFile.value = settings.customFile;
  includeSource.checked = settings.includeSource;
  language.value = settings.language;
  document.querySelector(`input[name="panelTheme"][value="${settings.panelTheme}"]`).checked = true;
  toggleCustomFile();
  applyLanguage(settings.language);
});

saveModes.forEach((input) => input.addEventListener('change', toggleCustomFile));
language.addEventListener('change', () => applyLanguage(language.value));

document.querySelector('#save').addEventListener('click', async () => {
  const saveMode = document.querySelector('input[name="saveMode"]:checked').value;
  const panelTheme = document.querySelector('input[name="panelTheme"]:checked').value;
  const text = copy[language.value];
  if (saveMode === 'custom' && !customFile.value.trim()) {
    status.textContent = text.missingPath;
    return;
  }
  await chrome.storage.sync.set({ saveMode, customFile: customFile.value.trim(), includeSource: includeSource.checked, panelTheme, language: language.value });
  status.textContent = text.saved;
  setTimeout(() => { status.textContent = ''; }, 1500);
});
