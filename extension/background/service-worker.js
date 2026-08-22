/**
 * SLAB Background Service Worker
 * Manages:
 *  - Global settings & state persistence
 *  - Whitelist / Blacklist access control gating
 *  - Per-site habit memory & suggestions engine
 *  - Action log & undo history stack
 *  - Summarize pipeline coordination (Local vs Remote)
 *  - Keyboard shortcuts & context menus
 *  - 60-second Onboarding on install
 */

import { LocalSummarizer } from '../engines/localSummarizer.js';
import { RemoteEngine } from '../engines/remoteEngine.js';
import { TokenOptimizer } from '../engines/tokenOptimizer.js';
import { WebcmdEngine } from '../engines/webcmdEngine.js';

const DEFAULT_SETTINGS = {
  engine: 'local', // 'local' | 'remote'
  remoteEndpoint: 'https://slab-webcmd-vssut.vercel.app/api/execute',
  apiKey: '',
  voiceEnabled: true,
  gazeEnabled: false,
  confirmActions: true, // Gating confirmation before running destructive actions
  readingSpeedScroll: true,
  autoSpeak: true,
  speechRate: 1.0,
  speechPitch: 1.0,
  theme: 'cyberpunk-dark',
  accessMode: 'blacklist', // 'blacklist' | 'whitelist'
  blacklist: [
    'chase.com', 'bankofamerica.com', 'wellsfargo.com', 'paypal.com',
    'accounts.google.com', 'login.microsoftonline.com', 'github.com/login'
  ],
  whitelist: []
};

// ── Lifecycle & Installation ──────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[SLAB Service Worker] Installed:', details.reason);

  const existing = await chrome.storage.local.get(['settings', 'habits', 'actionLog']);
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  if (!existing.habits) {
    await chrome.storage.local.set({ habits: {} });
  }
  if (!existing.actionLog) {
    await chrome.storage.local.set({ actionLog: [] });
  }

  // Open 60-second interactive onboarding on fresh install
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
  }

  setupContextMenus();
});

function setupContextMenus() {
  if (chrome.contextMenus && typeof chrome.contextMenus.removeAll === 'function') {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'slab-summarize-page',
        title: '⚡ Summarize Page with SLAB Agent',
        contexts: ['page']
      });
      chrome.contextMenus.create({
        id: 'slab-analyze-selection',
        title: '🧠 Analyze Selection with SLAB',
        contexts: ['selection']
      });
    });
  }
}

// ── Context Menus & Shortcuts ────────────────────────────────────────────────

if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab || !tab.id) return;

    if (info.menuItemId === 'slab-summarize-page') {
      chrome.tabs.sendMessage(tab.id, { type: 'SLAB_RUN_COMMAND', command: 'summarize page' });
    } else if (info.menuItemId === 'slab-analyze-selection' && info.selectionText) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SLAB_SHOW_TOAST',
        text: `Analysis: "${info.selectionText.slice(0, 80)}..."`,
        commandCard: {
          layer: 'Layer 1: Learn & Analyze',
          command: `webcmd analyze "${info.selectionText.replace(/[^a-zA-Z0-9 ]/g, '')}"`,
          savings: '94% Token Reduction'
        }
      });
    }
  });
}

// ── Message Routing & Central Coordinator ────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handler = async () => {
    const { settings = DEFAULT_SETTINGS, habits = {} } = await chrome.storage.local.get(['settings', 'habits']);

    // 1. Check Access Control (Whitelist / Blacklist)
    if (request.type === 'CHECK_ACCESS') {
      const hostname = request.hostname || '';
      const allowed = isHostAllowed(hostname, settings);
      return { allowed, settings };
    }

    // 2. Record Habit Memory
    if (request.type === 'RECORD_HABIT') {
      const { domain, command } = request;
      if (domain && command) {
        if (!habits[domain]) habits[domain] = { commands: {}, lastUsed: Date.now() };
        habits[domain].commands[command] = (habits[domain].commands[command] || 0) + 1;
        habits[domain].lastUsed = Date.now();
        await chrome.storage.local.set({ habits });
      }
      return { success: true };
    }

    // 3. Get Site Habit Suggestions
    if (request.type === 'GET_HABITS') {
      const domain = request.domain;
      const siteHabits = habits[domain]?.commands || {};
      const sorted = Object.entries(siteHabits)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cmd, count]) => ({ command: cmd, count }));
      return { habits: sorted };
    }

    // 4. Summarize Pipeline
    if (request.type === 'SUMMARIZE_PAGE') {
      const { text, title } = request;
      if (settings.engine === 'remote') {
        const result = await RemoteEngine.execute('summarize page', { text, title }, settings);
        return result;
      } else {
        const result = LocalSummarizer.summarize(text, title);
        return result;
      }
    }

    // 5. Webcmd CLI Engine Execution
    if (request.type === 'WEBCMD_EXECUTE') {
      const { prompt, context } = request;
      const result = await WebcmdEngine.execute(prompt, context, settings);
      return result;
    }

    // 6. Webcmd CLI Compile
    if (request.type === 'WEBCMD_COMPILE') {
      const compiled = WebcmdEngine.compile(request.prompt);
      return compiled;
    }

    // 7. Append Action Log & Undo History
    if (request.type === 'LOG_ACTION') {
      const { action } = request;
      const { actionLog = [] } = await chrome.storage.local.get(['actionLog']);
      const updatedLog = [action, ...actionLog].slice(0, 50);
      await chrome.storage.local.set({ actionLog: updatedLog });
      return { success: true };
    }

    // 8. Get Action Log
    if (request.type === 'GET_ACTION_LOG') {
      const { actionLog = [] } = await chrome.storage.local.get(['actionLog']);
      return { actionLog };
    }

    return { error: 'Unknown message type' };
  };

  handler().then(sendResponse).catch(err => sendResponse({ error: err.message }));
  return true; // Keep message channel open for async response
});

// ── Access Control Helper ────────────────────────────────────────────────────

function isHostAllowed(hostname, settings) {
  if (!hostname) return true;
  const host = hostname.toLowerCase();

  if (settings.accessMode === 'whitelist') {
    if (!settings.whitelist || settings.whitelist.length === 0) return true;
    return settings.whitelist.some(w => host.includes(w.toLowerCase()));
  }

  // Blacklist mode
  if (settings.blacklist && settings.blacklist.length > 0) {
    return !settings.blacklist.some(b => host.includes(b.toLowerCase()));
  }

  return true;
}
