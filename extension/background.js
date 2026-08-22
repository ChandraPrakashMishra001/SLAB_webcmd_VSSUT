// SLAB Background Service Worker
const DEFAULT_SKILLS = [
  {
    id: 'internet-navigator',
    name: 'Internet Navigator',
    description: 'Autonomous multi-step browsing, tab switching, and URL exploration.',
    systemPrompt: 'You are an autonomous Internet Navigator. Help users navigate websites, find links, switch tabs, search search engines, and explore web workflows efficiently.',
    enabled: true,
    category: 'Navigation'
  },
  {
    id: 'page-analyst',
    name: 'Page Analyst',
    description: 'Deep DOM inspection, table/list extraction, pricing, and structured data scraping.',
    systemPrompt: 'You are a Page Analyst. Analyze the current webpage content, extract tables, list structured items, spot pricing models, and identify actionable buttons and forms.',
    enabled: true,
    category: 'Analysis'
  },
  {
    id: 'quick-summarizer',
    name: 'Quick Summarizer',
    description: 'Instant executive summary, key takeaways, and action items from any page.',
    systemPrompt: 'You are a Quick Summarizer. Condense the webpage text into high-impact bullet points, executive summaries, and action steps with zero fluff.',
    enabled: true,
    category: 'Productivity'
  },
  {
    id: 'slab-adapter-generator',
    name: 'SLAB Adapter Generator',
    description: 'Converts web interaction into structured webcmd CLI adapter format.',
    systemPrompt: 'You are a SLAB Adapter Architect. Map page DOM selectors and API endpoints into deterministic webcmd CLI adapters with -f json schemas.',
    enabled: true,
    category: 'Developer'
  }
];

const DEFAULT_SETTINGS = {
  apiEndpoint: 'https://kkiqgaxtfeswzfmqixfm.supabase.co/functions/v1/chat',
  mcpEndpoint: 'https://kkiqgaxtfeswzfmqixfm.supabase.co/functions/v1/mcp',
  supabaseKey: '',
  voiceEnabled: true,
  autoSpeak: true,
  autoSendVoice: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  theme: 'cyberpunk-dark',
  skills: DEFAULT_SKILLS
};

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[SLAB Agent] Extension installed/updated.');
  try {
    const existing = await chrome.storage.local.get(['settings', 'skills']);
    if (!existing.settings) {
      await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    }
    if (!existing.skills) {
      await chrome.storage.local.set({ skills: DEFAULT_SKILLS });
    }
  } catch (e) {
    console.warn('[SLAB] Storage init warning:', e);
  }

  // Safe Context Menu Creation
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'slab-analyze-selection',
        title: 'Analyze selection with SLAB Agent',
        contexts: ['selection']
      });

      chrome.contextMenus.create({
        id: 'slab-read-page',
        title: 'Summarize page with SLAB Voice Agent',
        contexts: ['page']
      });
    });
  } catch (e) {
    console.warn('[SLAB] Context menu creation warning:', e);
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === 'slab-analyze-selection' && info.selectionText) {
      await chrome.storage.local.set({
        pendingQuery: `Analyze this text: "${info.selectionText}"`
      });
      if (chrome.action && chrome.action.openPopup) {
        chrome.action.openPopup().catch(() => {});
      }
    } else if (info.menuItemId === 'slab-read-page') {
      await chrome.storage.local.set({
        pendingQuery: 'Please read and summarize this page'
      });
      if (chrome.action && chrome.action.openPopup) {
        chrome.action.openPopup().catch(() => {});
      }
    }
  } catch (e) {
    console.warn('[SLAB] Context menu click handling error:', e);
  }
});

// Messaging bus
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      sendResponse({ tab });
    }).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (message.type === 'EXECUTE_NAVIGATION') {
    const { action, url, tabId } = message;
    if (action === 'open' || action === 'search') {
      chrome.tabs.create({ url })
        .then(t => sendResponse({ success: true, tab: t }))
        .catch(err => sendResponse({ error: err.message }));
    } else if (action === 'navigate') {
      chrome.tabs.update(tabId || undefined, { url })
        .then(t => sendResponse({ success: true, tab: t }))
        .catch(err => sendResponse({ error: err.message }));
    } else if (action === 'back') {
      chrome.tabs.goBack(tabId || undefined)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ error: err.message }));
    } else if (action === 'forward') {
      chrome.tabs.goForward(tabId || undefined)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ error: err.message }));
    } else if (action === 'reload') {
      chrome.tabs.reload(tabId || undefined)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ error: err.message }));
    }
    return true;
  }
});
