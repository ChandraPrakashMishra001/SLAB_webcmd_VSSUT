/**
 * SLAB Options & Memory Manager
 */

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  await loadOptions();
  initEventListeners();
});

let currentSettings = {};
let currentHabits = {};

async function loadOptions() {
  const data = await chrome.storage.local.get(['settings', 'habits']);
  currentSettings = data.settings || {};
  currentHabits = data.habits || {};

  // 1. Engine
  if (currentSettings.engine === 'remote') {
    document.getElementById('optRemote').checked = true;
  } else {
    document.getElementById('optLocal').checked = true;
  }
  document.getElementById('cfgRemoteEndpoint').value = currentSettings.remoteEndpoint || '';
  document.getElementById('cfgApiKey').value = currentSettings.apiKey || '';

  // 2. Access Control
  if (currentSettings.accessMode === 'whitelist') {
    document.getElementById('optWhitelist').checked = true;
    document.getElementById('lblDomainList').textContent = 'Whitelisted Domains';
  } else {
    document.getElementById('optBlacklist').checked = true;
    document.getElementById('lblDomainList').textContent = 'Blacklisted Domains';
  }
  renderDomainList();

  // 3. Learned Habit Memory
  renderMemoryList();

  // 4. Voice & Gaze
  document.getElementById('cfgConfirmActions').checked = currentSettings.confirmActions !== false;
  document.getElementById('cfgReadingSpeedScroll').checked = currentSettings.readingSpeedScroll !== false;
  document.getElementById('cfgAutoSpeak').checked = currentSettings.autoSpeak !== false;
  document.getElementById('cfgSpeechRate').value = currentSettings.speechRate || 1.0;
  document.getElementById('valSpeechRate').textContent = `${currentSettings.speechRate || 1.0}x`;
}

function renderDomainList() {
  const listEl = document.getElementById('domainList');
  listEl.innerHTML = '';
  const isWhite = document.getElementById('optWhitelist').checked;
  const domains = isWhite ? (currentSettings.whitelist || []) : (currentSettings.blacklist || []);

  domains.forEach((d, idx) => {
    const li = document.createElement('li');
    li.className = 'domain-item';
    li.innerHTML = `<span>${d}</span><button data-idx="${idx}">✕</button>`;
    li.querySelector('button').onclick = () => {
      domains.splice(idx, 1);
      if (isWhite) currentSettings.whitelist = domains;
      else currentSettings.blacklist = domains;
      renderDomainList();
      autoSave();
    };
    listEl.appendChild(li);
  });
}

function renderMemoryList() {
  const container = document.getElementById('memoryContainer');
  container.innerHTML = '';

  const entries = Object.entries(currentHabits);
  if (entries.length === 0) {
    container.innerHTML = '<p style="color:#64748b; font-size:13px;">No site habits learned yet. Explore websites to build memory.</p>';
    return;
  }

  entries.forEach(([domain, data]) => {
    const card = document.createElement('div');
    card.className = 'memory-card';

    const cmdChips = Object.entries(data.commands || {})
      .map(([cmd, count]) => `<span class="memory-chip">${cmd} (${count}x)</span>`)
      .join(' ');

    card.innerHTML = `
      <div>
        <div class="memory-domain">${domain}</div>
        <div class="memory-chips">${cmdChips || '<small style="color:#64748b;">No commands</small>'}</div>
      </div>
      <button class="btn btn-danger" style="padding:6px 12px; font-size:11px;" data-domain="${domain}">Forget Site</button>
    `;

    card.querySelector('button').onclick = async () => {
      delete currentHabits[domain];
      await chrome.storage.local.set({ habits: currentHabits });
      renderMemoryList();
    };

    container.appendChild(card);
  });
}

function initTabs() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    };
  });
}

function initEventListeners() {
  document.getElementById('optLocal').onchange = autoSave;
  document.getElementById('optRemote').onchange = autoSave;
  document.getElementById('optBlacklist').onchange = () => {
    document.getElementById('lblDomainList').textContent = 'Blacklisted Domains';
    renderDomainList();
    autoSave();
  };
  document.getElementById('optWhitelist').onchange = () => {
    document.getElementById('lblDomainList').textContent = 'Whitelisted Domains';
    renderDomainList();
    autoSave();
  };

  document.getElementById('btnAddDomain').onclick = () => {
    const input = document.getElementById('txtNewDomain');
    const domain = input.value.trim().toLowerCase();
    if (!domain) return;
    const isWhite = document.getElementById('optWhitelist').checked;
    if (isWhite) {
      currentSettings.whitelist = currentSettings.whitelist || [];
      if (!currentSettings.whitelist.includes(domain)) currentSettings.whitelist.push(domain);
    } else {
      currentSettings.blacklist = currentSettings.blacklist || [];
      if (!currentSettings.blacklist.includes(domain)) currentSettings.blacklist.push(domain);
    }
    input.value = '';
    renderDomainList();
    autoSave();
  };

  document.getElementById('btnClearAllMemory').onclick = async () => {
    if (confirm('Are you sure you want to erase all learned habit memory across all websites?')) {
      currentHabits = {};
      await chrome.storage.local.set({ habits: currentHabits });
      renderMemoryList();
    }
  };

  document.getElementById('cfgSpeechRate').oninput = (e) => {
    document.getElementById('valSpeechRate').textContent = `${e.target.value}x`;
    autoSave();
  };

  document.getElementById('cfgConfirmActions').onchange = autoSave;
  document.getElementById('cfgReadingSpeedScroll').onchange = autoSave;
  document.getElementById('cfgAutoSpeak').onchange = autoSave;

  document.getElementById('btnSaveSettings').onclick = async () => {
    await autoSave();
    const status = document.getElementById('saveStatus');
    status.textContent = '✅ All settings saved successfully!';
    setTimeout(() => { status.textContent = 'All changes saved automatically.'; }, 3000);
  };

  document.getElementById('btnReplayTour').onclick = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/onboarding.html') });
  };
}

async function autoSave() {
  currentSettings.engine = document.getElementById('optRemote').checked ? 'remote' : 'local';
  currentSettings.remoteEndpoint = document.getElementById('cfgRemoteEndpoint').value.trim();
  currentSettings.apiKey = document.getElementById('cfgApiKey').value.trim();
  currentSettings.accessMode = document.getElementById('optWhitelist').checked ? 'whitelist' : 'blacklist';
  currentSettings.confirmActions = document.getElementById('cfgConfirmActions').checked;
  currentSettings.readingSpeedScroll = document.getElementById('cfgReadingSpeedScroll').checked;
  currentSettings.autoSpeak = document.getElementById('cfgAutoSpeak').checked;
  currentSettings.speechRate = parseFloat(document.getElementById('cfgSpeechRate').value) || 1.0;

  await chrome.storage.local.set({ settings: currentSettings });
}
