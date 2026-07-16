(() => {
  const STORAGE_KEY = 'highlightsByPage';
  const HIGHLIGHT_NAME = 'obsidian-highlighter';
  let highlights = [];
  let panel;
  let selectionMode = false;
  let panelPinned = false;
  let panelTheme = 'sand';
  const rangesById = new Map();
  const cssHighlight = new Highlight();

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
    setPanelVisible(false);
    panel.innerHTML = `
      <header class="oh-header">
        <h2 class="oh-title">本页高亮剪藏 <span class="oh-count"></span><span class="oh-mode-label">选择模式</span><button class="oh-mode" type="button" title="点击切换高亮选择模式"><span>开</span><span>关</span></button></h2>
        <div class="oh-header-actions"><button class="oh-pin oh-icon-button" type="button" title="固定侧边栏" aria-label="固定侧边栏"><span class="oh-pin-glyph" aria-hidden="true"></span></button><button class="oh-exit oh-icon-button" type="button" title="退出侧边栏" aria-label="退出侧边栏">×</button></div>
      </header>
      <ul class="oh-list"></ul>
      <div class="oh-footer"><button class="oh-button oh-save" type="button">保存到 Obsidian</button><button class="oh-button oh-copy" type="button">复制</button><button class="oh-button oh-clear" type="button">清除全部</button></div>`;
    panel.querySelector('.oh-pin').addEventListener('click', togglePanelPin);
    panel.querySelector('.oh-exit').addEventListener('click', exitPanel);
    panel.querySelector('.oh-save').addEventListener('click', saveToObsidian);
    panel.querySelector('.oh-copy').addEventListener('click', copyMarkdown);
    panel.querySelector('.oh-clear').addEventListener('click', clearHighlights);
    panel.querySelector('.oh-mode').addEventListener('click', toggleSelectionMode);
    document.documentElement.append(panel);
  }

  function setPanelVisible(visible) {
    panel.hidden = !visible;
    document.documentElement.classList.toggle('oh-panel-open', visible);
  }

  async function togglePanelPin() {
    panelPinned = !panelPinned;
    await chrome.storage.local.set({ panelPinned });
    renderPanel();
  }

  async function exitPanel() {
    selectionMode = false;
    panelPinned = false;
    await chrome.storage.local.set({ panelPinned });
    setPanelVisible(false);
    renderPanel();
  }

  function applyPanelTheme() {
    panel.dataset.theme = panelTheme;
  }

  function renderPanel() {
    if (!panel) return;
    const list = panel.querySelector('.oh-list');
    panel.querySelector('.oh-count').textContent = highlights.length ? `(${highlights.length})` : '';
    const mode = panel.querySelector('.oh-mode');
    mode.classList.toggle('active', selectionMode);
    mode.setAttribute('aria-pressed', String(selectionMode));
    const pin = panel.querySelector('.oh-pin');
    pin.classList.toggle('active', panelPinned);
    pin.setAttribute('aria-pressed', String(panelPinned));
    pin.setAttribute('title', panelPinned ? '取消固定侧边栏' : '固定侧边栏');
    panel.querySelectorAll('.oh-save, .oh-copy, .oh-clear').forEach((button) => { button.disabled = highlights.length === 0; });
    list.innerHTML = highlights.length
      ? highlights.map((item, index) => `<li class="oh-item"><span class="oh-item-text">${escapeHtml(item.text)}</span><button class="oh-delete" type="button" data-index="${index}" aria-label="删除">×</button></li>`).join('')
      : `<li class="oh-empty"><strong>还没有高亮内容</strong><span>按快捷键开启选择模式后，选中文本即可剪藏。</span><kbd>macOS：Control + Shift + H</kbd><kbd>Windows/Linux：Alt + Shift + H</kbd><span>再按一次快捷键，或点击上方开关即可退出。</span></li>`;
    list.querySelectorAll('.oh-delete').forEach((button) => button.addEventListener('click', async () => {
      removeHighlightAt(Number(button.dataset.index));
      await saveHighlights();
      renderPanel();
    }));
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function normalizedText(text) {
    return text.replace(/\s+/g, ' ').trim();
  }

  function removeHighlightAt(index) {
    const [removed] = highlights.splice(index, 1);
    const range = rangesById.get(removed.id);
    if (range) cssHighlight.delete(range);
    rangesById.delete(removed.id);
  }

  function sortHighlightsByPagePosition() {
    highlights.sort((left, right) => {
      const leftRange = rangesById.get(left.id);
      const rightRange = rangesById.get(right.id);
      if (!leftRange || !rightRange) return left.createdAt.localeCompare(right.createdAt);
      return leftRange.compareBoundaryPoints(Range.START_TO_START, rightRange);
    });
  }

  async function clearHighlights() {
    highlights = [];
    rangesById.clear();
    cssHighlight.clear();
    await saveHighlights();
    renderPanel();
  }

  async function highlightSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;
    const text = selection.toString().trim();
    const normalized = normalizedText(text);
    const range = selection.getRangeAt(0).cloneRange();
    if (highlights.some((item) => normalizedText(item.text).includes(normalized))) {
      selection.removeAllRanges();
      return;
    }
    for (let index = highlights.length - 1; index >= 0; index -= 1) {
      if (normalized.includes(normalizedText(highlights[index].text))) removeHighlightAt(index);
    }
    const id = crypto.randomUUID();
    cssHighlight.add(range);
    rangesById.set(id, range);
    selection.removeAllRanges();
    highlights.push({ id, text, createdAt: new Date().toISOString() });
    sortHighlightsByPagePosition();
    await saveHighlights();
    renderPanel();
    setPanelVisible(true);
  }

  function toggleSelectionMode() {
    selectionMode = !selectionMode;
    renderPanel();
    if (selectionMode) setPanelVisible(true);
  }

  function openObsidian(url) {
    const link = document.createElement('a');
    link.href = url;
    link.click();
  }

  async function markdownAndSettings() {
    const settings = await chrome.storage.sync.get({
      saveMode: 'daily',
      customFile: 'Inbox/Web Highlights.md',
      includeSource: true
    });
    const source = settings.includeSource ? `\n>\n> 原文链接：[${document.title}](${location.href})` : '';
    const markdown = `${highlights.map((item) => `> ${item.text}`).join('\n>\n')}${source}\n`;
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
    openObsidian(url);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TOGGLE_PANEL') setPanelVisible(panel.hidden);
    if (message.type === 'TOGGLE_SELECTION_MODE') toggleSelectionMode();
  });

  document.addEventListener('mouseup', (event) => {
    if (!selectionMode || event.target.closest('#oh-panel')) return;
    highlightSelection();
  });

  createPanel();
  CSS.highlights.set(HIGHLIGHT_NAME, cssHighlight);
  chrome.storage.local.get({ panelPinned: false }).then((settings) => {
    panelPinned = settings.panelPinned;
    renderPanel();
    if (panelPinned) setPanelVisible(true);
  });
  chrome.storage.sync.get({ panelTheme: 'sand' }).then((settings) => {
    panelTheme = settings.panelTheme;
    applyPanelTheme();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.panelTheme) {
      panelTheme = changes.panelTheme.newValue;
      applyPanelTheme();
    }
  });
  loadHighlights();
})();
