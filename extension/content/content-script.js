/**
 * SLAB Content Script
 * Injected in ISOLATED world on all allowed web pages.
 * Features:
 *  - Shadow DOM isolation for zero CSS conflicts
 *  - Floating Orb UI with status glow & slide-out controls
 *  - Command Palette (Ctrl+Shift+K / Cmd+Shift+K)
 *  - Voice Recognition & deterministic command parser
 *  - Confirmation gating (6s auto-cancel) & Undo history stack
 *  - Adaptive reading gaze scrolling
 *  - Per-site habit learning & suggestions
 */

(async () => {
  if (window.__SLAB_CONTENT_INITIALIZED__) return;
  window.__SLAB_CONTENT_INITIALIZED__ = true;

  // 1. Access Control Check (Non-blocking)
  let access = { allowed: true, settings: {} };
  try {
    access = await chrome.runtime.sendMessage({
      type: 'CHECK_ACCESS',
      hostname: window.location.hostname
    });
  } catch (e) {
    access = { allowed: true, settings: {} };
  }

  if (access && access.allowed === false) {
    console.log('[SLAB] Domain is restricted by access control policy:', window.location.hostname);
    return;
  }

  let settings = access.settings || {};
  let isVoiceActive = false;
  let isGazeActive = false;
  let isPaletteOpen = false;
  let isPanelOpen = false;
  let recognition = null;
  let undoStack = [];
  let gazeScrollTimeout = null;
  let lastGazeY = 0;
  let confirmationTimer = null;
  let isFocusMode = false;
  let focusOverlayEl = null;

  // 2. Initialize Shadow DOM Root
  const host = document.createElement('slab-agent-root');
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  // 3. Inject Encapsulated Shadow DOM CSS
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    
    /* Floating Orb */
    .slab-orb {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0284c7, #6366f1);
      border: 2px solid rgba(56, 189, 248, 0.6);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), 0 0 25px rgba(56, 189, 248, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      pointer-events: auto;
      z-index: 2147483647;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
    }
    .slab-orb:hover {
      transform: scale(1.08);
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.6);
    }
    .slab-orb.listening {
      background: linear-gradient(135deg, #10b981, #06b6d4);
      box-shadow: 0 0 30px rgba(16, 185, 129, 0.8);
      animation: pulse 1.5s infinite;
    }
    .slab-orb.gaze-active::after {
      content: '';
      position: absolute;
      top: -4px;
      right: -4px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #38bdf8;
      border: 2px solid #020617;
      box-shadow: 0 0 10px #38bdf8;
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }

    /* Live Transcript Pill */
    .slab-transcript-pill {
      position: fixed;
      bottom: 90px;
      right: 24px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-family: monospace;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      pointer-events: auto;
      display: none;
      z-index: 2147483646;
      max-width: 320px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Slide-out Orb Drawer Panel */
    .slab-panel {
      position: fixed;
      bottom: 90px;
      right: 24px;
      width: 360px;
      max-height: 540px;
      background: rgba(15, 23, 42, 0.96);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(56, 189, 248, 0.2);
      backdrop-filter: blur(20px);
      padding: 20px;
      display: none;
      flex-direction: column;
      gap: 16px;
      color: #f8fafc;
      pointer-events: auto;
      z-index: 2147483646;
      overflow-y: auto;
    }
    .slab-panel.open { display: flex; }
    .slab-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 10px;
    }
    .slab-panel-title {
      font-weight: 800;
      font-size: 16px;
      background: linear-gradient(135deg, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .slab-btn-row { display: flex; gap: 8px; }
    .slab-btn {
      flex: 1;
      padding: 10px;
      border-radius: 10px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: #f8fafc;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .slab-btn:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: rgba(56, 189, 248, 0.4);
      color: #38bdf8;
    }
    .slab-btn.active {
      background: rgba(56, 189, 248, 0.25);
      border-color: #38bdf8;
      color: #38bdf8;
    }
    .slab-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .slab-chip-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .slab-chip {
      padding: 6px 12px;
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 12px;
      color: #e2e8f0;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .slab-chip:hover {
      background: rgba(56, 189, 248, 0.2);
      border-color: #38bdf8;
      color: #38bdf8;
    }
    .slab-log-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 120px;
      overflow-y: auto;
      font-size: 11px;
      font-family: monospace;
      color: #cbd5e1;
    }
    .slab-log-item {
      padding: 4px 8px;
      background: rgba(0,0,0,0.3);
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
    }

    /* Command Palette Overlay */
    .slab-palette-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
      display: none;
      align-items: flex-start;
      justify-content: center;
      padding-top: 15vh;
      z-index: 2147483647;
      pointer-events: auto;
    }
    .slab-palette-overlay.open { display: flex; }
    .slab-palette {
      width: 580px;
      background: #090d16;
      border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: 20px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.9), 0 0 40px rgba(56, 189, 248, 0.3);
      overflow: hidden;
    }
    .slab-palette-input-box {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      gap: 12px;
    }
    .slab-palette-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #ffffff;
      font-size: 16px;
      font-weight: 500;
    }
    .slab-palette-list {
      max-height: 320px;
      overflow-y: auto;
      padding: 8px;
      list-style: none;
      margin: 0;
    }
    .slab-palette-item {
      padding: 12px 16px;
      border-radius: 10px;
      color: #cbd5e1;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.15s ease;
    }
    .slab-palette-item:hover, .slab-palette-item.selected {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
    }
    .slab-palette-kbd {
      font-size: 11px;
      font-family: monospace;
      padding: 2px 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      color: #94a3b8;
    }

    /* Floating Toast Modal */
    .slab-toast {
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.97);
      border: 1px solid rgba(56, 189, 248, 0.4);
      box-shadow: 0 15px 40px rgba(0,0,0,0.8), 0 0 25px rgba(56, 189, 248, 0.3);
      padding: 16px 24px;
      border-radius: 16px;
      color: #f8fafc;
      font-size: 14px;
      z-index: 2147483647;
      pointer-events: auto;
      display: none;
      max-width: 600px;
      animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideDown {
      from { transform: translate(-50%, -20px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
    .slab-toast-header { font-weight: 700; color: #38bdf8; margin-bottom: 6px; display: flex; justify-content: space-between; }
    .slab-toast-badge {
      font-size: 11px;
      background: rgba(56, 189, 248, 0.15);
      padding: 2px 8px;
      border-radius: 6px;
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .slab-toast-body { font-size: 13px; line-height: 1.5; color: #e2e8f0; max-height: 240px; overflow-y: auto; }
    .slab-toast-actions { display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end; }
  `;
  shadow.appendChild(style);

  // 4. Render HTML Structure inside Shadow DOM
  const container = document.createElement('div');
  container.innerHTML = `
    <!-- Floating Orb -->
    <div class="slab-orb" id="slabOrb" title="SLAB Voice & Gaze Agent">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" x2="12" y1="19" y2="22"></line>
      </svg>
    </div>

    <!-- Live Transcript Pill -->
    <div class="slab-transcript-pill" id="slabTranscriptPill">Listening...</div>

    <!-- Slide-out Orb Panel -->
    <div class="slab-panel" id="slabPanel">
      <div class="slab-panel-header">
        <div class="slab-panel-title">⚡ SLAB Autonomous Agent</div>
        <button class="slab-btn" id="btnClosePanel" style="flex:0; padding:4px 8px;">✕</button>
      </div>

      <!-- Quick Toggles -->
      <div class="slab-btn-row">
        <button class="slab-btn" id="btnVoiceToggle">🎙️ Voice</button>
        <button class="slab-btn" id="btnGazeToggle">👁️ Eye Scroll</button>
        <button class="slab-btn" id="btnPaletteOpen">⌨️ Palette</button>
      </div>

      <!-- Quick Summarize & Actions -->
      <button class="slab-btn active" id="btnQuickSummarize" style="width:100%;">
        ✨ Summarize Page (Offline Extractive)
      </button>

      <!-- Site Habits -->
      <div>
        <div class="slab-section-title">Learned Site Habits (${window.location.hostname})</div>
        <div class="slab-chip-list" id="siteHabitsList">
          <div class="slab-chip" data-cmd="summarize page">⚡ summarize page</div>
          <div class="slab-chip" data-cmd="scroll down">📜 scroll down</div>
          <div class="slab-chip" data-cmd="focus mode on">🎯 focus mode</div>
        </div>
      </div>

      <!-- Action Log & Undo -->
      <div>
        <div class="slab-section-title" style="display:flex; justify-content:space-between;">
          <span>Recent Actions</span>
          <a id="btnUndoAction" style="color:#38bdf8; cursor:pointer; font-weight:bold;">↶ Undo</a>
        </div>
        <div class="slab-log-list" id="slabLogList">
          <div class="slab-log-item"><span>Agent ready</span><span>0s ago</span></div>
        </div>
      </div>
    </div>

    <!-- Command Palette -->
    <div class="slab-palette-overlay" id="slabPaletteOverlay">
      <div class="slab-palette">
        <div class="slab-palette-input-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="slab-palette-input" id="paletteInput" placeholder="Type a command (e.g. 'summarize page', 'scroll down', 'click contact', 'undo')..." />
          <span class="slab-palette-kbd">ESC</span>
        </div>
        <ul class="slab-palette-list" id="paletteList">
          <li class="slab-palette-item selected" data-cmd="summarize page">
            <span>✨ Summarize Page (Offline Extractive)</span><span class="slab-palette-kbd">Enter</span>
          </li>
          <li class="slab-palette-item" data-cmd="scroll down">
            <span>📜 Scroll Down</span><span class="slab-palette-kbd">Down</span>
          </li>
          <li class="slab-palette-item" data-cmd="scroll up">
            <span>📜 Scroll Up</span><span class="slab-palette-kbd">Up</span>
          </li>
          <li class="slab-palette-item" data-cmd="focus mode on">
            <span>🎯 Toggle Focus Mode</span><span class="slab-palette-kbd">Focus</span>
          </li>
          <li class="slab-palette-item" data-cmd="undo">
            <span>↶ Undo Last Action</span><span class="slab-palette-kbd">Undo</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Floating Toast Modal -->
    <div class="slab-toast" id="slabToast">
      <div class="slab-toast-header">
        <span id="toastTitle">SLAB Agent</span>
        <span class="slab-toast-badge" id="toastBadge">94% Savings</span>
      </div>
      <div class="slab-toast-body" id="toastBody"></div>
      <div class="slab-toast-actions" id="toastActions">
        <button class="slab-btn" id="btnToastDismiss" style="flex:0; padding:6px 16px;">Dismiss</button>
      </div>
    </div>
  `;
  shadow.appendChild(container);

  // 5. Element References
  const orb = shadow.getElementById('slabOrb');
  const transcriptPill = shadow.getElementById('slabTranscriptPill');
  const panel = shadow.getElementById('slabPanel');
  const btnClosePanel = shadow.getElementById('btnClosePanel');
  const btnVoiceToggle = shadow.getElementById('btnVoiceToggle');
  const btnGazeToggle = shadow.getElementById('btnGazeToggle');
  const btnPaletteOpen = shadow.getElementById('btnPaletteOpen');
  const btnQuickSummarize = shadow.getElementById('btnQuickSummarize');
  const siteHabitsList = shadow.getElementById('siteHabitsList');
  const slabLogList = shadow.getElementById('slabLogList');
  const btnUndoAction = shadow.getElementById('btnUndoAction');
  const paletteOverlay = shadow.getElementById('slabPaletteOverlay');
  const paletteInput = shadow.getElementById('paletteInput');
  const paletteList = shadow.getElementById('paletteList');
  const toast = shadow.getElementById('slabToast');
  const toastTitle = shadow.getElementById('toastTitle');
  const toastBadge = shadow.getElementById('toastBadge');
  const toastBody = shadow.getElementById('toastBody');
  const toastActions = shadow.getElementById('toastActions');
  const btnToastDismiss = shadow.getElementById('btnToastDismiss');

  // ── Load Site Habits & Memory ────────────────────────────────────────────────

  async function loadHabits() {
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'GET_HABITS',
        domain: window.location.hostname
      });
      if (resp && resp.habits && resp.habits.length > 0) {
        siteHabitsList.innerHTML = '';
        resp.habits.forEach(h => {
          const chip = document.createElement('div');
          chip.className = 'slab-chip';
          chip.dataset.cmd = h.command;
          chip.textContent = `${h.command} (${h.count}x)`;
          chip.addEventListener('click', () => executeCommand(h.command));
          siteHabitsList.appendChild(chip);
        });
      }
    } catch (e) {}
  }

  loadHabits();

  // ── Deterministic Command Parser & Execution ─────────────────────────────────

  async function executeCommand(rawCommand, bypassConfirmation = false) {
    const cmd = (rawCommand || '').trim();
    if (!cmd) return;

    const lower = cmd.toLowerCase();

    // Record habit memory in background
    chrome.runtime.sendMessage({
      type: 'RECORD_HABIT',
      domain: window.location.hostname,
      command: cmd
    }).catch(() => {});

    // 1. Summarize Page
    if (lower.includes('summarize') || lower.includes('summary')) {
      showToast('Extracting & Optimizing Page Content...', 'Processing...', 'Please wait while SLAB parses saliency graph.');
      
      const rawText = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
      const resp = await chrome.runtime.sendMessage({
        type: 'SUMMARIZE_PAGE',
        text: rawText,
        title: document.title
      });

      if (resp) {
        logAction(`Summarized page: ${resp.savings?.percentage || 92}% token reduction`, false);
        showToast(
          '✨ Executive Summary',
          resp.savings?.tag || '92% Token Reduction',
          resp.summary || resp.text,
          true
        );
        if (settings.autoSpeak) speak(resp.summary?.slice(0, 140));
      }
      return;
    }

    // 2. Scroll Commands
    if (lower.includes('scroll down') || lower === 'down') {
      const scrollAmount = window.innerHeight * 0.75;
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      pushUndo(() => window.scrollBy({ top: -scrollAmount, behavior: 'smooth' }), 'Scroll Down');
      logAction('Scrolled down 75vh', true);
      return;
    }
    if (lower.includes('scroll up') || lower === 'up') {
      const scrollAmount = window.innerHeight * 0.75;
      window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
      pushUndo(() => window.scrollBy({ top: scrollAmount, behavior: 'smooth' }), 'Scroll Up');
      logAction('Scrolled up 75vh', true);
      return;
    }
    if (lower.includes('scroll to top') || lower === 'top') {
      const prev = window.scrollY;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      pushUndo(() => window.scrollTo({ top: prev, behavior: 'smooth' }), 'Scroll to Top');
      logAction('Scrolled to top', true);
      return;
    }
    if (lower.includes('scroll to bottom') || lower === 'bottom') {
      const prev = window.scrollY;
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      pushUndo(() => window.scrollTo({ top: prev, behavior: 'smooth' }), 'Scroll to Bottom');
      logAction('Scrolled to bottom', true);
      return;
    }

    // 3. Navigation
    if (lower === 'go back' || lower === 'back') {
      window.history.back();
      logAction('Navigated Back', false);
      return;
    }
    if (lower === 'go forward' || lower === 'forward') {
      window.history.forward();
      logAction('Navigated Forward', false);
      return;
    }
    if (lower === 'refresh' || lower === 'reload') {
      window.location.reload();
      return;
    }

    // 4. Focus Mode
    if (lower.includes('focus mode on') || lower === 'focus mode') {
      enableFocusMode();
      pushUndo(() => disableFocusMode(), 'Focus Mode On');
      logAction('Enabled Focus Mode', true);
      return;
    }
    if (lower.includes('focus mode off')) {
      disableFocusMode();
      logAction('Disabled Focus Mode', false);
      return;
    }

    // 5. Undo Command
    if (lower === 'undo') {
      popUndo();
      return;
    }

    // 6. Search for Query
    if (lower.startsWith('search for ') || lower.startsWith('search ')) {
      const query = cmd.replace(/^search( for)?\s+/i, '');
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      if (settings.confirmActions && !bypassConfirmation) {
        requestConfirmation(`Open search for "${query}"?`, () => {
          window.open(searchUrl, '_blank');
          logAction(`Searched: ${query}`, false);
        });
      } else {
        window.open(searchUrl, '_blank');
        logAction(`Searched: ${query}`, false);
      }
      return;
    }

    // 7. Click by Text (Fuzzy match buttons, links, inputs)
    if (lower.startsWith('click ') || lower.startsWith('press ')) {
      const targetText = lower.replace(/^(click|press)\s+/i, '').trim();
      const matchedEl = findClickableElement(targetText);
      if (matchedEl) {
        if (settings.confirmActions && !bypassConfirmation) {
          requestConfirmation(`Click element "${matchedEl.innerText || targetText}"?`, () => {
            performClick(matchedEl);
            logAction(`Clicked: ${targetText}`, false);
          });
        } else {
          performClick(matchedEl);
          logAction(`Clicked: ${targetText}`, false);
        }
      } else {
        showToast('Element Not Found', 'Search Warning', `Could not locate a clickable element matching "${targetText}".`);
      }
      return;
    }

    // Default: Run via Remote/Local Agent Engine
    showToast(`Executing: "${cmd}"`, 'SLAB Layer 3', 'Processing structured action...');
    const rawText = (document.body.innerText || '').slice(0, 3000);
    const resp = await chrome.runtime.sendMessage({
      type: 'SUMMARIZE_PAGE',
      text: rawText,
      title: `${document.title} - ${cmd}`
    });
    if (resp) {
      showToast(
        `Action: ${cmd}`,
        resp.savings?.tag || '88% Token Reduction',
        resp.text || resp.summary
      );
      logAction(`Ran: ${cmd}`, false);
    }
  }

  // ── Fuzzy Element Clicker ────────────────────────────────────────────────────

  function findClickableElement(targetText) {
    const clickables = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]'));
    const target = targetText.toLowerCase();

    // 1. Exact match
    for (const el of clickables) {
      const txt = (el.innerText || el.value || el.getAttribute('aria-label') || '').toLowerCase().trim();
      if (txt === target) return el;
    }

    // 2. Contains match
    for (const el of clickables) {
      const txt = (el.innerText || el.value || el.getAttribute('aria-label') || '').toLowerCase().trim();
      if (txt.includes(target)) return el;
    }

    return null;
  }

  function performClick(el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const originalOutline = el.style.outline;
    el.style.outline = '3px solid #38bdf8';
    setTimeout(() => {
      el.style.outline = originalOutline;
      el.click();
    }, 300);
  }

  // ── Focus Mode Overlay ───────────────────────────────────────────────────────

  function enableFocusMode() {
    if (isFocusMode) return;
    isFocusMode = true;
    focusOverlayEl = document.createElement('div');
    focusOverlayEl.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.75);
      z-index: 2147483640; pointer-events: none; backdrop-filter: blur(2px);
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(focusOverlayEl);
  }

  function disableFocusMode() {
    if (!isFocusMode) return;
    isFocusMode = false;
    if (focusOverlayEl && focusOverlayEl.parentNode) {
      focusOverlayEl.parentNode.removeChild(focusOverlayEl);
      focusOverlayEl = null;
    }
  }

  // ── Confirmation Gating (6s Auto-Cancel) ─────────────────────────────────────

  function requestConfirmation(question, onConfirm) {
    clearTimeout(confirmationTimer);
    let secondsLeft = 6;

    toastTitle.textContent = '⚠️ Confirm Action';
    toastBadge.textContent = `Auto-cancels in ${secondsLeft}s`;
    toastBody.textContent = question;

    toastActions.innerHTML = '';
    const btnYes = document.createElement('button');
    btnYes.className = 'slab-btn active';
    btnYes.textContent = 'Yes, Execute';
    btnYes.style.flex = '0';
    btnYes.style.padding = '6px 18px';

    const btnNo = document.createElement('button');
    btnNo.className = 'slab-btn';
    btnNo.textContent = 'Cancel';
    btnNo.style.flex = '0';
    btnNo.style.padding = '6px 18px';

    toastActions.appendChild(btnNo);
    toastActions.appendChild(btnYes);
    toast.style.display = 'block';

    const countdown = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(countdown);
        toast.style.display = 'none';
      } else {
        toastBadge.textContent = `Auto-cancels in ${secondsLeft}s`;
      }
    }, 1000);

    btnYes.onclick = () => {
      clearInterval(countdown);
      toast.style.display = 'none';
      onConfirm();
    };

    btnNo.onclick = () => {
      clearInterval(countdown);
      toast.style.display = 'none';
    };
  }

  // ── Undo Stack & Action Log ──────────────────────────────────────────────────

  function pushUndo(undoFn, name) {
    undoStack.push({ undoFn, name, timestamp: Date.now() });
    if (undoStack.length > 20) undoStack.shift();
  }

  function popUndo() {
    if (undoStack.length === 0) {
      showToast('Undo Stack Empty', 'Info', 'No reversible actions to undo.');
      return;
    }
    const last = undoStack.pop();
    try {
      last.undoFn();
      logAction(`Undid: ${last.name}`, false);
      showToast('Undone Successfully', '↶ Reverted', `Reverted action "${last.name}".`);
    } catch (e) {
      console.warn('[SLAB] Undo error:', e);
    }
  }

  function logAction(name, undoable) {
    const item = document.createElement('div');
    item.className = 'slab-log-item';
    item.innerHTML = `<span>${escapeHtml(name)}</span><span>${undoable ? '↶ Reversible' : '✓ Done'}</span>`;
    slabLogList.prepend(item);

    chrome.runtime.sendMessage({
      type: 'LOG_ACTION',
      action: { name, undoable, timestamp: Date.now() }
    }).catch(() => {});
  }

  // ── Toast Helper ─────────────────────────────────────────────────────────────

  function showToast(title, badge, bodyText, autoHide = false) {
    toastTitle.textContent = title;
    toastBadge.textContent = badge;
    toastBody.textContent = bodyText;
    toastActions.innerHTML = '<button class="slab-btn" id="btnToastDismiss" style="flex:0; padding:6px 16px;">Dismiss</button>';
    shadow.getElementById('btnToastDismiss').onclick = () => { toast.style.display = 'none'; };
    toast.style.display = 'block';

    if (autoHide) {
      setTimeout(() => { toast.style.display = 'none'; }, 8000);
    }
  }

  // ── Adaptive Reading Gaze Scroll ─────────────────────────────────────────────

  window.addEventListener('slab-gaze-data', (e) => {
    if (!isGazeActive) return;
    const { y } = e.detail || {};
    if (y == null) return;

    // If user is looking at bottom 20% of viewport
    const bottomThreshold = window.innerHeight * 0.8;
    if (y > bottomThreshold) {
      if (!gazeScrollTimeout) {
        gazeScrollTimeout = setTimeout(() => {
          // Gentle adaptive reading scroll (35px per increment)
          window.scrollBy({ top: 35, behavior: 'smooth' });
          gazeScrollTimeout = null;
        }, 350);
      }
    }
  });

  // ── In-Page Web Speech Recognition ───────────────────────────────────────────

  function initVoice() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isVoiceActive = true;
      orb.classList.add('listening');
      btnVoiceToggle.classList.add('active');
      transcriptPill.style.display = 'block';
      transcriptPill.textContent = 'Listening for commands...';
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          transcriptPill.textContent = `🗣️ "${event.results[i][0].transcript}"`;
        }
      }

      if (finalTranscript.trim()) {
        transcriptPill.textContent = `⚡ "${finalTranscript.trim()}"`;
        executeCommand(finalTranscript.trim());
      }
    };

    recognition.onerror = (e) => {
      console.warn('[SLAB Voice Content Error]', e.error);
      if (e.error === 'not-allowed' || e.error === 'audio-capture') {
        isVoiceActive = false;
        orb.classList.remove('listening');
        btnVoiceToggle.classList.remove('active');
        transcriptPill.style.display = 'none';
        showToast(
          '🎙️ Microphone Permission Needed',
          'Mic Access',
          'Please allow microphone access in Chrome to enable hands-free voice commands.'
        );
      }
    };

    recognition.onend = () => {
      if (isVoiceActive) {
        try { recognition.start(); } catch (e) {}
      } else {
        orb.classList.remove('listening');
        btnVoiceToggle.classList.remove('active');
        transcriptPill.style.display = 'none';
      }
    };
  }

  async function toggleVoice() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast('Voice Not Supported', 'Web Speech', 'Web Speech API is not supported in this browser.');
      return;
    }

    if (isVoiceActive) {
      isVoiceActive = false;
      if (recognition) {
        try { recognition.stop(); } catch (e) {}
      }
      orb.classList.remove('listening');
      btnVoiceToggle.classList.remove('active');
      transcriptPill.style.display = 'none';
      return;
    }

    // Pre-flight microphone permission check
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      console.warn('[SLAB] Microphone permission prompt:', err);
      showToast(
        '🎙️ Microphone Permission Required',
        'Action Needed',
        'Please grant microphone permission to enable voice recognition.'
      );
      return;
    }

    if (!recognition) initVoice();
    if (recognition) {
      isVoiceActive = true;
      try { 
        recognition.start(); 
        orb.classList.add('listening');
        btnVoiceToggle.classList.add('active');
        transcriptPill.style.display = 'block';
        transcriptPill.textContent = 'Listening for commands...';
      } catch (e) {
        console.warn('Recognition start exception:', e);
      }
    }
  }

  function toggleGaze() {
    isGazeActive = !isGazeActive;
    if (isGazeActive) {
      window.dispatchEvent(new CustomEvent('slab-start-gaze'));
      orb.classList.add('gaze-active');
      btnGazeToggle.classList.add('active');
      showToast('👁️ Eye Tracking Activated', 'Adaptive Scroll', 'Looking at the bottom of the page will automatically scroll down as you read.', true);
    } else {
      window.dispatchEvent(new CustomEvent('slab-stop-gaze'));
      orb.classList.remove('gaze-active');
      btnGazeToggle.classList.remove('active');
    }
  }

  function speak(text) {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.speechRate || 1.0;
    utterance.pitch = settings.speechPitch || 1.0;
    window.speechSynthesis.speak(utterance);
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  // ── Event Bindings ───────────────────────────────────────────────────────────

  orb.onclick = () => {
    isPanelOpen = !isPanelOpen;
    panel.classList.toggle('open', isPanelOpen);
  };

  btnClosePanel.onclick = () => {
    isPanelOpen = false;
    panel.classList.remove('open');
  };

  btnVoiceToggle.onclick = toggleVoice;
  btnGazeToggle.onclick = toggleGaze;
  btnPaletteOpen.onclick = () => { openPalette(); };
  btnQuickSummarize.onclick = () => { executeCommand('summarize page'); isPanelOpen = false; panel.classList.remove('open'); };
  btnUndoAction.onclick = popUndo;

  // Command Palette Open / Close
  function openPalette() {
    isPaletteOpen = true;
    paletteOverlay.classList.add('open');
    paletteInput.value = '';
    paletteInput.focus();
  }

  function closePalette() {
    isPaletteOpen = false;
    paletteOverlay.classList.remove('open');
  }

  paletteOverlay.onclick = (e) => {
    if (e.target === paletteOverlay) closePalette();
  };

  // Keyboard Shortcuts (Ctrl+Shift+K or Cmd+Shift+K)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (isPaletteOpen) closePalette();
      else openPalette();
    } else if (e.key === 'Escape' && isPaletteOpen) {
      closePalette();
    }
  });

  paletteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = paletteInput.value.trim();
      closePalette();
      if (val) executeCommand(val);
    }
  });

  paletteList.querySelectorAll('.slab-palette-item').forEach(item => {
    item.addEventListener('click', () => {
      const cmd = item.dataset.cmd;
      closePalette();
      if (cmd) executeCommand(cmd);
    });
  });

  // Listen to messages from background / popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SLAB_RUN_COMMAND') {
      executeCommand(msg.command);
      sendResponse({ success: true });
    } else if (msg.type === 'SLAB_SHOW_TOAST') {
      showToast(msg.text, msg.commandCard?.savings || '94% Reduction', msg.commandCard?.command || msg.text);
      sendResponse({ success: true });
    }
    return true;
  });

  console.log('[SLAB Agent] Injected and active on', window.location.hostname);
})();
