// SLAB Content Script Helper
(() => {
  if (window.__SLAB_INJECTED__) return;
  window.__SLAB_INJECTED__ = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'EXTRACT_PAGE_CONTENT') {
      const data = extractPageDetails();
      sendResponse(data);
      return true;
    }
    if (request.type === 'SCROLL_PAGE') {
      const direction = request.direction === 'up' ? -window.innerHeight * 0.8 : window.innerHeight * 0.8;
      window.scrollBy({ top: direction, behavior: 'smooth' });
      sendResponse({ success: true, scrollY: window.scrollY });
      return true;
    }
    if (request.type === 'HIGHLIGHT_TEXT') {
      highlightMatches(request.query);
      sendResponse({ success: true });
      return true;
    }
  });

  function extractPageDetails() {
    const title = document.title || '';
    const url = window.location.href || '';
    
    // Extract main text content
    const clone = document.body.cloneNode(true);
    const removeSelectors = ['script', 'style', 'noscript', 'svg', 'iframe', 'canvas'];
    removeSelectors.forEach(sel => {
      clone.querySelectorAll(sel).forEach(el => el.remove());
    });

    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .slice(0, 15)
      .map(h => `${h.tagName}: ${h.innerText.trim()}`)
      .filter(h => h.length > 4);

    const links = Array.from(document.querySelectorAll('a[href]'))
      .slice(0, 20)
      .map(a => ({ text: a.innerText.trim(), href: a.href }))
      .filter(l => l.text.length > 2 && !l.href.startsWith('javascript:'));

    const rawText = (clone.innerText || '').replace(/\s+/g, ' ').trim();
    const truncatedText = rawText.slice(0, 8000);

    return {
      title,
      url,
      headings,
      links,
      text: truncatedText,
      totalLength: rawText.length
    };
  }

  function highlightMatches(query) {
    if (!query) return;
    try {
      window.find(query);
    } catch (e) {
      console.warn('[SLAB] Highlight not supported', e);
    }
  }
})();
