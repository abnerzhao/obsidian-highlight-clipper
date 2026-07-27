globalThis.ClipQueue = (() => {
  function sortByCreatedAt(items) {
    return [...items].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function syncPage(queue, highlights, pageUrl, pageTitle) {
    const otherPages = queue.filter((item) => item.pageUrl !== pageUrl);
    const updatedPage = highlights.map((item) => ({ ...item, pageUrl, pageTitle }));
    return sortByCreatedAt([...otherPages, ...updatedPage]);
  }

  function remove(queue, highlightsByPage, id) {
    const nextHighlightsByPage = Object.fromEntries(Object.entries(highlightsByPage)
      .map(([pageUrl, items]) => [pageUrl, items.filter((item) => item.id !== id)])
      .filter(([, items]) => items.length));
    return {
      queue: queue.filter((item) => item.id !== id),
      highlightsByPage: nextHighlightsByPage
    };
  }

  function fromLegacy(highlightsByPage) {
    return sortByCreatedAt(Object.entries(highlightsByPage).flatMap(([pageUrl, items]) => items.map((item) => ({
      ...item,
      pageUrl,
      pageTitle: pageUrl
    }))));
  }

  return { syncPage, remove, fromLegacy };
})();

if (typeof module !== 'undefined') module.exports = globalThis.ClipQueue;
