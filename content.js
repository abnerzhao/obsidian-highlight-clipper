(() => {
  const PAGE_STORAGE_KEY = 'highlightsByPage';
  const QUEUE_STORAGE_KEY = 'clipQueue';
  const SELECTION_MODE_KEY = 'selectionModeEnabled';
  const HIGHLIGHT_NAME = 'obsidian-highlighter';
  let highlights = [];
  let selectionMode = false;
  const rangesById = new Map();
  const cssHighlight = new Highlight();
  const pageKey = location.href;

  function applyHighlightStyle(settings) {
    const root = document.documentElement.style;
    const isUnderline = settings.highlightStyle === 'underline';
    root.setProperty('--oh-highlight-background', isUnderline ? 'transparent' : '#fef08a');
    root.setProperty('--oh-highlight-decoration-line', isUnderline ? 'underline' : 'none');
    root.setProperty('--oh-highlight-underline-color', settings.underlineColor);
  }

  async function loadHighlights() {
    const data = await chrome.storage.session.get({ [PAGE_STORAGE_KEY]: {} });
    highlights = data[PAGE_STORAGE_KEY][pageKey] ?? [];
    restoreHighlightRanges();
  }

  function restoreHighlightRanges() {
    rangesById.clear();
    cssHighlight.clear();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return /^(SCRIPT|STYLE|NOSCRIPT)$/i.test(node.parentElement?.tagName ?? '')
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      }
    });
    const chunks = [];
    let source = '';
    let node;
    while ((node = walker.nextNode())) {
      const start = source.length;
      source += node.nodeValue;
      chunks.push({ node, start, end: source.length });
    }
    const locate = (position, isEnd) => chunks.find((chunk) => isEnd
      ? position >= chunk.start && position <= chunk.end
      : position >= chunk.start && position < chunk.end);
    let searchFrom = 0;
    for (const item of highlights) {
      const startAt = source.indexOf(item.text, searchFrom);
      if (startAt < 0) continue;
      const endAt = startAt + item.text.length;
      const start = locate(startAt, false);
      const end = locate(endAt, true);
      if (!start || !end) continue;
      const range = new Range();
      range.setStart(start.node, startAt - start.start);
      range.setEnd(end.node, endAt - end.start);
      cssHighlight.add(range);
      rangesById.set(item.id, range);
      searchFrom = endAt;
    }
  }

  async function saveHighlights() {
    const data = await chrome.storage.session.get({ [PAGE_STORAGE_KEY]: {}, [QUEUE_STORAGE_KEY]: [] });
    const highlightsByPage = { ...data[PAGE_STORAGE_KEY], [pageKey]: highlights };
    if (!highlights.length) delete highlightsByPage[pageKey];
    await chrome.storage.session.set({
      [PAGE_STORAGE_KEY]: highlightsByPage,
      [QUEUE_STORAGE_KEY]: ClipQueue.syncPage(data[QUEUE_STORAGE_KEY], highlights, pageKey, document.title)
    });
    chrome.runtime.sendMessage({ type: 'CLIP_QUEUE_UPDATED' }).catch(() => {});
  }

  function normalizedText(text) {
    return text.replace(/\s+/g, ' ').trim();
  }

  function removeHighlightAt(index) {
    const [removed] = highlights.splice(index, 1);
    const range = rangesById.get(removed?.id);
    if (range) cssHighlight.delete(range);
    rangesById.delete(removed?.id);
  }

  function sortHighlightsByPagePosition() {
    highlights.sort((left, right) => {
      const leftRange = rangesById.get(left.id);
      const rightRange = rangesById.get(right.id);
      if (!leftRange || !rightRange) return left.createdAt.localeCompare(right.createdAt);
      return leftRange.compareBoundaryPoints(Range.START_TO_START, rightRange);
    });
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
  }

  async function clearHighlights() {
    highlights = [];
    rangesById.clear();
    cssHighlight.clear();
    await saveHighlights();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SET_SELECTION_MODE') {
      selectionMode = Boolean(message.selectionMode);
      sendResponse({ selectionMode });
      return;
    }
    if (message.type === 'SELECTION_MODE_CHANGED') {
      selectionMode = Boolean(message.selectionMode);
      return;
    }
    if (message.type === 'DELETE_HIGHLIGHT') {
      const index = highlights.findIndex((item) => item.id === message.id);
      if (index >= 0) removeHighlightAt(index);
      saveHighlights().then(() => sendResponse({ ok: true }));
      return true;
    }
    if (message.type === 'CLEAR_HIGHLIGHTS') {
      clearHighlights().then(() => sendResponse({ ok: true }));
      return true;
    }
  });

  document.addEventListener('mouseup', () => {
    if (selectionMode) highlightSelection();
  });

  function isHighlightShortcut(event) {
    if (event.key.toLowerCase() !== 'h' || event.metaKey) return false;
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    return isMac
      ? event.ctrlKey && event.shiftKey && !event.altKey
      : event.altKey && event.shiftKey && !event.ctrlKey;
  }

  document.addEventListener('keydown', (event) => {
    if (!isHighlightShortcut(event) || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    event.stopPropagation();
    chrome.runtime.sendMessage({ type: 'TOGGLE_SELECTION_MODE_FROM_PAGE_SHORTCUT' })
      .then((state) => { selectionMode = Boolean(state.selectionMode); })
      .catch(() => {});
  }, true);

  CSS.highlights.set(HIGHLIGHT_NAME, cssHighlight);
  chrome.storage.sync.get({ highlightStyle: 'background', underlineColor: '#ef4444' }).then(applyHighlightStyle);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && (changes.highlightStyle || changes.underlineColor)) {
      chrome.storage.sync.get({ highlightStyle: 'background', underlineColor: '#ef4444' }).then(applyHighlightStyle);
    }
    if (area === 'session' && changes[PAGE_STORAGE_KEY]) loadHighlights();
    if (area === 'session' && changes[SELECTION_MODE_KEY]) {
      selectionMode = Boolean(changes[SELECTION_MODE_KEY].newValue);
    }
  });
  async function initialize() {
    try {
      const state = await chrome.runtime.sendMessage({ type: 'GET_SELECTION_MODE' });
      selectionMode = Boolean(state.selectionMode);
      await loadHighlights();
    } catch {
      // Chrome may not expose extension storage until the service worker is ready.
    }
  }

  initialize();
})();
