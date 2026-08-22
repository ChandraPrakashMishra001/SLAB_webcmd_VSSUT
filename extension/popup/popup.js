/**
 * SLAB Popup Toolbar Controller
 */

let activeTab = null;
let recognition = null;
let isRecording = false;

document.addEventListener('DOMContentLoaded', async () => {
  await fetchActiveTab();
  await loadHabitSuggestions();
  initVoice();
  initEventListeners();
});

async function fetchActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      activeTab = tab;
      const url = new URL(tab.url || 'http://localhost');
      document.getElementById('activeTabTitle').textContent = `${tab.title || 'Tab'} (${url.hostname})`;
    }
  } catch (e) {
    document.getElementById('activeTabTitle').textContent = 'Web Page';
  }
}

async function loadHabitSuggestions() {
  if (!activeTab || !activeTab.url) return;
  try {
    const url = new URL(activeTab.url);
    const resp = await chrome.runtime.sendMessage({
      type: 'GET_HABITS',
      domain: url.hostname
    });

    if (resp && resp.habits && resp.habits.length > 0) {
      const container = document.getElementById('siteHabitsChips');
      container.innerHTML = '';
      resp.habits.forEach(h => {
        const btn = document.createElement('button');
        btn.className = 'chip';
        btn.dataset.cmd = h.command;
        btn.textContent = `⚡ ${h.command}`;
        btn.onclick = () => runCommand(h.command);
        container.appendChild(btn);
      });
    }
  } catch (e) {}
}

function initVoice() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return;

  recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isRecording = true;
    document.getElementById('btnVoiceInput').classList.add('active');
    document.getElementById('btnVoiceToggle').classList.add('active');
  };

  recognition.onresult = (event) => {
    let text = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      text += event.results[i][0].transcript;
    }
    document.getElementById('txtInput').value = text;
    if (event.results[0].isFinal && text.trim()) {
      runCommand(text.trim());
    }
  };

  recognition.onerror = (e) => {
    console.warn('[SLAB Popup Voice]', e.error);
    isRecording = false;
    document.getElementById('btnVoiceInput').classList.remove('active');
    document.getElementById('btnVoiceToggle').classList.remove('active');
  };

  recognition.onend = () => {
    isRecording = false;
    document.getElementById('btnVoiceInput').classList.remove('active');
    document.getElementById('btnVoiceToggle').classList.remove('active');
  };
}

function toggleVoice() {
  if (!recognition) initVoice();
  if (!recognition) return;

  if (isRecording) {
    recognition.stop();
  } else {
    try { recognition.start(); } catch (e) {}
  }
}

async function runCommand(command) {
  if (!command || !activeTab) return;
  appendMessage('user', command);

  // Send command to active tab content script
  try {
    await chrome.tabs.sendMessage(activeTab.id, {
      type: 'SLAB_RUN_COMMAND',
      command
    });
    appendMessage('agent', `Executed command: **"${command}"** on page.`);
  } catch (e) {
    appendMessage('system', `Could not reach page content script (${e.message}).`);
  }
}

function appendMessage(role, text) {
  const area = document.getElementById('chatArea');
  const div = document.createElement('div');
  div.className = `message ${role}-msg`;
  div.innerHTML = `
    <div class="msg-avatar">${role === 'user' ? '👤' : role === 'agent' ? '🤖' : '⚡'}</div>
    <div class="msg-body">${text}</div>
  `;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function initEventListeners() {
  document.getElementById('btnVoiceInput').onclick = toggleVoice;
  document.getElementById('btnVoiceToggle').onclick = toggleVoice;

  document.getElementById('btnGazeToggle').onclick = () => {
    if (activeTab) {
      chrome.tabs.sendMessage(activeTab.id, { type: 'SLAB_RUN_COMMAND', command: 'eye scroll' });
    }
  };

  document.getElementById('btnFocusToggle').onclick = () => {
    if (activeTab) {
      chrome.tabs.sendMessage(activeTab.id, { type: 'SLAB_RUN_COMMAND', command: 'focus mode on' });
    }
  };

  document.getElementById('btnSend').onclick = () => {
    const input = document.getElementById('txtInput');
    const cmd = input.value.trim();
    if (cmd) {
      runCommand(cmd);
      input.value = '';
    }
  };

  document.getElementById('txtInput').onkeydown = (e) => {
    if (e.key === 'Enter') {
      const cmd = e.target.value.trim();
      if (cmd) {
        runCommand(cmd);
        e.target.value = '';
      }
    }
  };

  document.getElementById('btnOpenOptions').onclick = () => chrome.runtime.openOptionsPage();
  document.getElementById('lnkOptions').onclick = () => chrome.runtime.openOptionsPage();
  document.getElementById('lnkOnboarding').onclick = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
  };
}
