(() => {
  const STORAGE_KEY = 'highlightsByPage';
  const HIGHLIGHT_NAME = 'obsidian-highlighter';
  let highlights = [];
  let selectionMode = false;
  const rangesById = new Map();
  const cssHighlight = new Highlight();
  const pageKey = location.href;

  async function loadHighlights() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    highlights = data[STORAGE_KEY]?.[pageKey] ?? [];
  }

  async function saveHighlights() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    await chrome.storage.local.set({ [STORAGE_KEY]: { ...(data[STORAGE_KEY] ?? {}), [pageKey]: highlights } });
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

  CSS.highlights.set(HIGHLIGHT_NAME, cssHighlight);
  chrome.runtime.sendMessage({ type: 'GET_SELECTION_MODE_FOR_CURRENT_TAB' })
    .then((state) => { selectionMode = Boolean(state.selectionMode); })
    .catch(() => {});
  loadHighlights();
})();
