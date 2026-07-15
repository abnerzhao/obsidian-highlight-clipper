(() => {
  const STORAGE_KEY = 'highlightsByPage';
  let highlights = [];
  let panel;

  const pageKey = location.href;

  async function loadHighlights() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    highlights = data[STORAGE_KEY]?.[pageKey] ?? [];
    renderPanel();
  }

  async function saveHighlights() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    await chrome.storage.local.set({
      [STORAGE_KEY]: { ...(data[STORAGE_KEY] ?? {}), [pageKey]: highlights }
    });
  }

  function createPanel() {
    panel = document.createElement('aside');
    panel.id = 'oh-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <header class="oh-header">
        <h2 class="oh-title">本页剪藏 <span class="oh-count"></span></h2>
        <button class="oh-close" type="button" aria-label="关闭">×</button>
      </header>
      <ul class="oh-list"></ul>
      <div class="oh-footer"><button class="oh-button oh-save" type="button">保存到 Obsidian</button><button class="oh-button oh-copy" type="button">复制</button></div>`;
    panel.querySelector('.oh-close').addEventListener('click', () => { panel.hidden = true; });
    panel.querySelector('.oh-save').addEventListener('click', saveToObsidian);
    panel.querySelector('.oh-copy').addEventListener('click', copyMarkdown);
    document.documentElement.append(panel);
  }

  function renderPanel() {
    if (!panel) return;
    const list = panel.querySelector('.oh-list');
    panel.querySelector('.oh-count').textContent = highlights.length ? `(${highlights.length})` : '';
    panel.querySelectorAll('.oh-button').forEach((button) => { button.disabled = highlights.length === 0; });
    list.innerHTML = highlights.length
      ? highlights.map((item, index) => `<li class="oh-item"><span class="oh-item-text">${escapeHtml(item.text)}</span><button class="oh-delete" type="button" data-index="${index}" aria-label="删除">×</button></li>`).join('')
      : '<li class="oh-empty">选中文字后按 ⌃⇧H（Windows/Linux：Alt+Shift+H）即可高亮。</li>';
    list.querySelectorAll('.oh-delete').forEach((button) => button.addEventListener('click', async () => {
      highlights.splice(Number(button.dataset.index), 1);
      await saveHighlights();
      renderPanel();
    }));
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function highlightSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;
    const text = selection.toString().trim();
    try {
      const range = selection.getRangeAt(0);
      const mark = document.createElement('mark');
      mark.className = 'oh-highlight';
      mark.append(range.extractContents());
      range.insertNode(mark);
      selection.removeAllRanges();
      highlights.push({ text, createdAt: new Date().toISOString() });
      await saveHighlights();
      renderPanel();
      panel.hidden = false;
    } catch {
      alert('选区跨越了多个复杂元素，请缩小选区后重试。');
    }
  }

  async function markdownAndSettings() {
    const settings = await chrome.storage.sync.get({
      saveMode: 'daily',
      customFile: 'Inbox/Web Highlights.md',
      includeSource: true
    });
    const source = settings.includeSource ? `\n\n来源：[${document.title}](${location.href})` : '';
    const markdown = `## ${document.title}\n\n${highlights.map((item) => `> ${item.text}`).join('\n\n')}${source}\n`;
    return { markdown, settings };
  }

  async function copyMarkdown() {
    const { markdown } = await markdownAndSettings();
    await navigator.clipboard.writeText(markdown);
    const button = panel.querySelector('.oh-copy');
    button.textContent = '已复制，可粘贴到 Obsidian';
    setTimeout(() => { button.textContent = '复制'; }, 1800);
  }

  async function saveToObsidian() {
    const { markdown, settings } = await markdownAndSettings();
    const url = settings.saveMode === 'daily'
      ? `obsidian://daily?append=true&content=${encodeURIComponent(markdown)}`
      : `obsidian://new?file=${encodeURIComponent(settings.customFile.trim())}&append=true&content=${encodeURIComponent(markdown)}`;
    chrome.runtime.sendMessage({ type: 'OPEN_OBSIDIAN_NOTE', url });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TOGGLE_PANEL') panel.hidden = !panel.hidden;
    if (message.type === 'HIGHLIGHT_SELECTION') highlightSelection();
  });

  createPanel();
  loadHighlights();
})();
