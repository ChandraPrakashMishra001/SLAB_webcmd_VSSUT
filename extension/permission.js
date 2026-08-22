/**
 * SLAB Extension Microphone Permission Handler
 * Requests Chrome microphone permission for speech recognition.
 */

document.addEventListener('DOMContentLoaded', () => {
  const btnAllow = document.getElementById('btnAllow');
  const status = document.getElementById('statusMsg');

  if (!btnAllow) return;

  btnAllow.addEventListener('click', async () => {
    btnAllow.disabled = true;
    btnAllow.style.opacity = '0.7';
    btnAllow.textContent = 'Requesting permission...';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the audio tracks immediately after obtaining permission
      stream.getTracks().forEach(track => track.stop());

      if (status) {
        status.className = 'status success';
        status.textContent = '✅ Microphone permission granted! Closing this tab in 2 seconds...';
      }
      btnAllow.textContent = '✅ Access Granted';
      btnAllow.style.background = 'linear-gradient(135deg, #10b981, #059669)';

      // Notify background service worker
      try {
        chrome.runtime.sendMessage({ type: 'MIC_PERMISSION_GRANTED' });
      } catch (e) {
        // Ignore if background worker is idle
      }

      setTimeout(() => {
        window.close();
      }, 2000);
    } catch (err) {
      btnAllow.disabled = false;
      btnAllow.style.opacity = '1';
      btnAllow.textContent = 'Allow Microphone Access';

      if (status) {
        status.className = 'status error';
        status.textContent = '❌ Access denied: ' + (err.message || 'Permission dismissed') + '. Please click the lock icon in the address bar to allow microphone access.';
      }
    }
  });
});
