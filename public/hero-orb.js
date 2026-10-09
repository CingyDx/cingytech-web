(() => {
  const art = document.querySelector('.hero-art');
  const video = art?.querySelector('.hero-art-video');
  const toggle = document.querySelector('.hero-motion-toggle');
  if (!art || !video || !toggle) return;

  // H.264 is the primary, precomposited Blender render. VP9 alpha is a legacy
  // fallback only where transparent VP9 works; Safari no longer gets excluded.
  const webkit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome\/|Chromium\/|Edg\/|OPR\//.test(navigator.userAgent);
  const supportsMP4 = Boolean(video.canPlayType('video/mp4'));
  const supportsVideo = supportsMP4 || (!webkit && Boolean(video.canPlayType('video/webm')));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection?.saveData === true;
  let visible = true;
  const root = document.documentElement;
  let preference = root.dataset.motionPreference;
  let playbackBlocked = false;
  let playRequest = 0;
  let playPending = false;
  let abortRetried = false;
  let selectedSource = false;
  let frameCallback = null;
  let frameReady = false;
  let quality = 'medium';
  let qualitySample = null;
  let slowWindows = 0;
  let resumeTime = null;

  function resetFrame() {
    if (frameCallback !== null) video.cancelVideoFrameCallback?.(frameCallback);
    frameCallback = null;
    frameReady = false;
    art.classList.remove('video-ready');
  }

  function selectSource() {
    if (selectedSource) return;
    selectedSource = true;
    if (supportsMP4 && video.dataset.mp4Small) {
      const width = window.innerWidth;
      const connection = navigator.connection;
      const limited = saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType) || (connection?.downlink > 0 && connection.downlink <= 2) || (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
      quality = width <= 760 || limited ? 'small' : width >= 1700 ? 'large' : 'medium';
      art.dataset.videoQuality = quality;
      video.src = sourceFor(quality);
      video.muted = true;
      video.autoplay = true;
      video.preload = 'auto';
      video.load();
    }
  }

  function sourceFor(level) {
    return level === 'small' ? video.dataset.mp4Small : level === 'large' ? video.dataset.mp4Large : video.dataset.mp4Medium;
  }

  function lowerQuality() {
    if (!supportsMP4 || quality === 'small') return;
    resumeTime = video.currentTime;
    video.pause();
    playRequest += 1;
    playPending = false;
    resetFrame();
    quality = quality === 'large' ? 'medium' : 'small';
    art.dataset.videoQuality = quality;
    art.dataset.videoState = 'adapting';
    qualitySample = null;
    slowWindows = 0;
    video.src = sourceFor(quality);
    video.load();
    update();
  }

  function checkQuality() {
    if (!shouldPlay() || video.paused || !frameReady || !video.getVideoPlaybackQuality) {
      qualitySample = null;
      slowWindows = 0;
      return;
    }
    const current = video.getVideoPlaybackQuality();
    if (qualitySample) {
      const frames = current.totalVideoFrames - qualitySample.total;
      const dropped = current.droppedVideoFrames - qualitySample.dropped;
      // Do not react to one startup hitch, hidden tabs or tiny sample windows.
      slowWindows = frames >= 30 && dropped / frames > .12 ? slowWindows + 1 : 0;
      if (slowWindows >= 2) { lowerQuality(); return; }
    }
    qualitySample = { total: current.totalVideoFrames, dropped: current.droppedVideoFrames };
  }

  function presentFrame() {
    if (frameReady || frameCallback !== null || !shouldPlay()) return;
    const presented = () => {
      frameCallback = null;
      if (!shouldPlay() || video.paused || video.readyState < 2) return;
      frameReady = true;
      art.classList.add('video-ready');
      art.dataset.videoState = 'playing';
      window.dispatchEvent(new Event('cingy-video-ready'));
    };
    if (video.requestVideoFrameCallback) frameCallback = video.requestVideoFrameCallback(presented);
    else requestAnimationFrame(presented);
  }

  function motionEnabled() {
    return preference === 'on' || (preference !== 'off' && !reducedMotion.matches && !saveData);
  }

  function shouldPlay() {
    return supportsVideo && visible && !document.hidden && motionEnabled();
  }

  function updateControls() {
    const enabled = motionEnabled();
    const override = preference === 'on';
    root.dataset.motionReason = preference === 'off' ? 'paused' : override ? 'explicit-on' : reducedMotion.matches ? 'reduced-motion' : saveData ? 'save-data' : 'automatic';
    toggle.hidden = false;
    toggle.textContent = playbackBlocked ? 'Přehrát 3D animaci' : enabled ? 'Pozastavit animace' : 'Zapnout animace';
    toggle.setAttribute('aria-pressed', String(enabled));
    if (root.classList.contains('motion-enabled') !== override || root.classList.contains('motion-disabled') === enabled) {
      root.classList.toggle('motion-enabled', override);
      root.classList.toggle('motion-disabled', !enabled);
      window.dispatchEvent(new Event('cingy-motion-change'));
    }
  }

  function update() {
    updateControls();

    if (!shouldPlay()) {
      // A pending play() interrupted by scrolling is not an autoplay rejection.
      playRequest += 1;
      playPending = false;
      abortRetried = false;
      video.pause();
      if (frameCallback !== null) video.cancelVideoFrameCallback?.(frameCallback);
      frameCallback = null;
      // Preserve the last rendered frame for a seamless return to the hero.
      return;
    }

    if (playPending || !video.paused || playbackBlocked) return;
    selectSource();
    const request = ++playRequest;
    playPending = true;
    const attempt = video.play();
    attempt?.then(() => {
      if (request !== playRequest) return;
      playPending = false;
      presentFrame();
    }).catch(error => {
      if (request !== playRequest) return;
      playPending = false;
      if (!shouldPlay()) return;
      // A current request can be interrupted before the first frame without
      // another visibility event. Recover once, then offer a manual retry.
      if (error.name === 'AbortError' && !abortRetried) {
        abortRetried = true;
        update();
        return;
      }
      resetFrame();
      art.dataset.videoState = 'blocked';
      playbackBlocked = true;
      updateControls();
    });
  }

  toggle.addEventListener('click', () => {
    preference = playbackBlocked || !motionEnabled() ? 'on' : 'off';
    root.dataset.motionPreference = preference;
    try { localStorage.setItem('cingy-motion-v1', preference); } catch (_) { /* optional persistence */ }
    playbackBlocked = false;
    abortRetried = false;
    if (video.error) {
      // A failed download stays failed until load() explicitly retries it.
      playRequest += 1;
      playPending = false;
      resetFrame();
      video.load();
    }
    update();
  });
  video.addEventListener('playing', () => {
    playbackBlocked = false;
    abortRetried = false;
    updateControls();
    presentFrame();
  });
  video.addEventListener('loadedmetadata', () => {
    if (resumeTime === null) return;
    const time = resumeTime;
    resumeTime = null;
    try { if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = time % video.duration; } catch (_) { /* Fresh loop remains usable. */ }
  });
  video.addEventListener('error', () => {
    playRequest += 1;
    playPending = false;
    resetFrame();
    art.dataset.videoState = 'error';
    playbackBlocked = true;
    updateControls();
  });
  document.addEventListener('visibilitychange', update);
  reducedMotion.addEventListener?.('change', update);
  window.setInterval?.(checkQuality, 2000);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      update();
    }, { threshold: 0.05 }).observe(art);
  }

  update();
})();
