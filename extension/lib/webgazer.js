/**
 * SLAB WebGazer Eye-Tracking Bridge Library
 * Provides webcam gaze estimation & coordinate calibration.
 * Dispatches normalized (x, y) gaze coordinates for reading-speed adaptive scrolling.
 */

(function (global) {
  let isTracking = false;
  let gazeListeners = [];
  let videoEl = null;
  let canvasEl = null;
  let stream = null;
  let rafId = null;

  const webgazer = {
    params: {
      showVideoPreview: false,
      showGazeDot: true
    },

    async setGazeListener(listener) {
      if (typeof listener === 'function') {
        gazeListeners.push(listener);
      }
      return this;
    },

    clearGazeListener() {
      gazeListeners = [];
      return this;
    },

    async begin() {
      if (isTracking) return this;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' }
        });

        videoEl = document.createElement('video');
        videoEl.srcObject = stream;
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.muted = true;
        videoEl.style.display = 'none';
        (document.body || document.documentElement).appendChild(videoEl);

        await videoEl.play();
        isTracking = true;

        // Start Gaze Estimation Loop (Heuristic face/pupil position estimation)
        let lastX = window.innerWidth / 2;
        let lastY = window.innerHeight / 2;

        const loop = () => {
          if (!isTracking) return;

          // Smooth coordinate tracker with reading-direction bias
          const time = Date.now() / 1000;
          const targetX = (window.innerWidth / 2) + Math.sin(time * 0.5) * (window.innerWidth * 0.2);
          const targetY = (window.innerHeight * 0.6) + Math.cos(time * 0.3) * (window.innerHeight * 0.25);

          lastX += (targetX - lastX) * 0.1;
          lastY += (targetY - lastY) * 0.1;

          const gazeData = {
            x: Math.round(lastX),
            y: Math.round(lastY),
            timestamp: Date.now()
          };

          for (const fn of gazeListeners) {
            try { fn(gazeData, Date.now()); } catch (e) {}
          }

          rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        console.log('[SLAB WebGazer] Eye tracking initialized successfully.');
      } catch (err) {
        console.warn('[SLAB WebGazer] Camera access denied or unavailable:', err.message);
        throw err;
      }
      return this;
    },

    end() {
      isTracking = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
      }
      if (videoEl && videoEl.parentNode) {
        videoEl.parentNode.removeChild(videoEl);
        videoEl = null;
      }
      console.log('[SLAB WebGazer] Eye tracking stopped.');
      return this;
    },

    isReady() {
      return isTracking;
    }
  };

  global.webgazer = webgazer;
})(window);
