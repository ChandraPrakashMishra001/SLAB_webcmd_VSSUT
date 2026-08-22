/**
 * SLAB Gaze Main-World Script (world: "MAIN")
 * Bridges WebGazer webcam access in the page context with the isolated content script.
 * Communicates bidirectional events via CustomEvent on window.
 */

(function () {
  if (window.__SLAB_GAZE_MAIN_WORLD__) return;
  window.__SLAB_GAZE_MAIN_WORLD__ = true;

  console.log('[SLAB Gaze Bridge] Main world bridge active.');

  window.addEventListener('slab-start-gaze', async () => {
    try {
      if (window.webgazer) {
        window.webgazer.clearGazeListener();
        window.webgazer.setGazeListener((data, clock) => {
          if (data && data.x != null && data.y != null) {
            window.dispatchEvent(new CustomEvent('slab-gaze-data', {
              detail: {
                x: data.x,
                y: data.y,
                timestamp: clock || Date.now()
              }
            }));
          }
        });

        await window.webgazer.begin();
        window.dispatchEvent(new CustomEvent('slab-gaze-status', { detail: { active: true } }));
      } else {
        console.warn('[SLAB Gaze Bridge] WebGazer not found in main world.');
      }
    } catch (err) {
      console.warn('[SLAB Gaze Bridge] Failed to start eye tracking:', err.message);
      window.dispatchEvent(new CustomEvent('slab-gaze-status', { detail: { active: false, error: err.message } }));
    }
  });

  window.addEventListener('slab-stop-gaze', () => {
    if (window.webgazer) {
      window.webgazer.end();
      window.dispatchEvent(new CustomEvent('slab-gaze-status', { detail: { active: false } }));
    }
  });
})();
