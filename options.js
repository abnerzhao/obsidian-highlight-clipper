const saveModes = document.querySelectorAll('input[name="saveMode"]');
const customFile = document.querySelector('#customFile');
const customFileField = document.querySelector('#customFileField');
const vaultName = document.querySelector('#vaultName');
const includeSource = document.querySelector('#includeSource');
const status = document.querySelector('#status');
const language = document.querySelector('#language');
const highlightStyles = document.querySelectorAll('input[name="highlightStyle"]');
const underlineColorField = document.querySelector('#underlineColorField');

const copy = {
  en: {
    intro: 'Saving appends all highlights from the current page to the selected note.', language: 'Language', saveLocation: 'Save location', daily: 'Obsidian daily note', custom: 'Custom file', vaultName: 'Vault name or path', vaultHint: 'Required for custom file paths. Use a vault name, or its absolute local path.', filePath: 'File path', tokens: 'Supported: {{YYYY}}, {{MM}}, {{DD}}, {{YYYY-MM-DD}}, {{YYYY/MM/DD}}', source: 'Include source link', highlight: 'Highlight appearance', background: 'Background', underline: 'Underline', underlineColor: 'Underline color', appearance: 'Sidebar appearance', auto: 'Follow browser', sand: 'Sand', light: 'Light', dark: 'Dark', save: 'Save settings', missingPath: 'Enter a file path', missingVault: 'Enter a vault name or path for custom files', saved: 'Saved'
  },
  'zh-CN': {
    intro: '每次保存会把当前页面的全部剪藏追加到所选笔记。', language: '语言', saveLocation: '保存位置', daily: 'Obsidian 每日笔记', custom: '自定义文件', vaultName: 'Vault 名称或路径', vaultHint: '自定义文件必须填写。可填写 Vault 名称或本机绝对路径。', filePath: '文件路径', tokens: '支持：{{YYYY}}、{{MM}}、{{DD}}、{{YYYY-MM-DD}}、{{YYYY/MM/DD}}', source: '携带原文链接', highlight: '高亮样式', background: '背景高亮', underline: '下划线', underlineColor: '下划线颜色', appearance: '侧边栏外观', auto: '跟随浏览器', sand: '米色', light: '浅色', dark: '深色', save: '保存设置', missingPath: '请填写文件路径', missingVault: '自定义文件请填写 Vault 名称或路径', saved: '已保存'
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
  document.querySelector('#vaultNameLabel').textContent = text.vaultName;
  document.querySelector('#vaultNameHint').textContent = text.vaultHint;
  document.querySelector('#filePathLabel').textContent = text.filePath;
  document.querySelector('#tokensHint').textContent = text.tokens;
  document.querySelector('#sourceLabel').textContent = text.source;
  document.querySelector('#highlightLegend').textContent = text.highlight;
  document.querySelector('#backgroundHighlightLabel').textContent = text.background;
  document.querySelector('#underlineHighlightLabel').textContent = text.underline;
  document.querySelector('#underlineColorLabel').textContent = text.underlineColor;
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

function toggleUnderlineColor() {
  underlineColorField.hidden = document.querySelector('input[name="highlightStyle"]:checked').value !== 'underline';
}

function selectUnderlineColor(color) {
  const option = document.querySelector(`input[name="underlineColor"][value="${color}"]`)
    ?? document.querySelector('input[name="underlineColor"][value="#ef4444"]');
  option.checked = true;
}

chrome.storage.sync.get({ saveMode: 'daily', vaultName: '', customFile: 'Inbox/Web Highlights.md', includeSource: true, highlightStyle: 'background', underlineColor: '#ef4444', panelTheme: 'auto', language: 'en' }).then((settings) => {
  document.querySelector(`input[name="saveMode"][value="${settings.saveMode}"]`).checked = true;
  customFile.value = settings.customFile;
  vaultName.value = settings.vaultName;
  includeSource.checked = settings.includeSource;
  document.querySelector(`input[name="highlightStyle"][value="${settings.highlightStyle}"]`).checked = true;
  selectUnderlineColor(settings.underlineColor);
  language.value = settings.language;
  document.querySelector(`input[name="panelTheme"][value="${settings.panelTheme}"]`).checked = true;
  toggleCustomFile();
  toggleUnderlineColor();
  applyLanguage(settings.language);
});

saveModes.forEach((input) => input.addEventListener('change', toggleCustomFile));
highlightStyles.forEach((input) => input.addEventListener('change', toggleUnderlineColor));
language.addEventListener('change', () => applyLanguage(language.value));

document.querySelector('#save').addEventListener('click', async () => {
  const saveMode = document.querySelector('input[name="saveMode"]:checked').value;
  const panelTheme = document.querySelector('input[name="panelTheme"]:checked').value;
  const highlightStyle = document.querySelector('input[name="highlightStyle"]:checked').value;
  const underlineColor = document.querySelector('input[name="underlineColor"]:checked').value;
  const text = copy[language.value];
  if (saveMode === 'custom' && !customFile.value.trim()) {
    status.textContent = text.missingPath;
    return;
  }
  if (saveMode === 'custom' && !vaultName.value.trim()) {
    status.textContent = text.missingVault;
    return;
  }
  await chrome.storage.sync.set({ saveMode, vaultName: vaultName.value.trim(), customFile: customFile.value.trim(), includeSource: includeSource.checked, highlightStyle, underlineColor, panelTheme, language: language.value });
  status.textContent = text.saved;
  setTimeout(() => { status.textContent = ''; }, 1500);
});
