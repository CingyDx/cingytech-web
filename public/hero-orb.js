(() => {
  const art = document.querySelector('.hero-art');
  const video = art?.querySelector('.hero-art-video');
  const toggle = document.querySelector('.hero-motion-toggle');
  if (!art || !video || !toggle) return;

  // WebKit currently renders VP9 alpha with an opaque background.
  // Keep the rendered still until WebKit supports transparent VP9 reliably.
  const webkit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome\/|Chromium\/|Edg\/|OPR\//.test(navigator.userAgent);
  const supportsVideo = !webkit && Boolean(video.canPlayType('video/webm'));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection?.saveData === true;
  let visible = true;
  const root = document.documentElement;
  let preference = root.dataset.motionPreference;
  let playbackBlocked = false;
  let playRequest = 0;
  let playPending = false;
  let abortRetried = false;

  function motionEnabled() {
    return preference === 'on' || (preference !== 'off' && !reducedMotion.matches && !saveData);
  }

  function shouldPlay() {
    return supportsVideo && visible && !document.hidden && motionEnabled();
  }

  function updateControls() {
    const enabled = motionEnabled();
    const override = preference === 'on';
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
      // Preserve the last rendered frame for a seamless return to the hero.
      return;
    }

    if (playPending || !video.paused || playbackBlocked) return;
    const request = ++playRequest;
    playPending = true;
    const attempt = video.play();
    attempt?.then(() => {
      if (request !== playRequest) return;
      playPending = false;
      if (shouldPlay() && video.readyState >= 2) art.classList.add('video-ready');
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
      art.classList.remove('video-ready');
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
    update();
  });
  video.addEventListener('playing', () => {
    playbackBlocked = false;
    abortRetried = false;
    updateControls();
    if (shouldPlay()) art.classList.add('video-ready');
  });
  video.addEventListener('error', () => art.classList.remove('video-ready'));
  document.addEventListener('visibilitychange', update);
  reducedMotion.addEventListener?.('change', update);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      update();
    }, { threshold: 0.05 }).observe(art);
  }

  update();
})();
