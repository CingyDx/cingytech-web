(() => {
  const art = document.querySelector('.hero-art');
  const video = art?.querySelector('.hero-art-video');
  const toggle = document.querySelector('.hero-motion-toggle');
  if (!art || !video || !toggle) return;

  // WebKit currently renders VP9 alpha with an opaque background.
  // Keep the rendered still until WebKit supports transparent VP9 reliably.
  const webkit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome\/|Chromium\/|Edg\/|OPR\//.test(navigator.userAgent);
  if (webkit || !video.canPlayType('video/webm')) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection?.saveData === true;
  let visible = true;
  let manualPlayback = false;
  let playbackBlocked = false;

  function shouldPlay() {
    return visible && !document.hidden && (!(reducedMotion.matches || saveData) || manualPlayback);
  }

  function update() {
    toggle.hidden = !(reducedMotion.matches || saveData || playbackBlocked);
    toggle.textContent = manualPlayback ? 'Pozastavit 3D animaci' : 'Přehrát 3D animaci';
    toggle.setAttribute('aria-pressed', String(manualPlayback));

    if (!shouldPlay()) {
      video.pause();
      art.classList.remove('video-ready');
      return;
    }

    const attempt = video.play();
    attempt?.then(() => {
      if (shouldPlay()) art.classList.add('video-ready');
    }).catch(() => {
      art.classList.remove('video-ready');
      playbackBlocked = true;
      toggle.hidden = false;
      toggle.textContent = 'Přehrát 3D animaci';
    });
  }

  toggle.addEventListener('click', () => {
    manualPlayback = !manualPlayback;
    update();
  });
  video.addEventListener('playing', () => {
    playbackBlocked = false;
    toggle.hidden = !(reducedMotion.matches || saveData);
    if (shouldPlay()) art.classList.add('video-ready');
  });
  video.addEventListener('error', () => art.classList.remove('video-ready'));
  document.addEventListener('visibilitychange', update);
  reducedMotion.addEventListener?.('change', () => {
    manualPlayback = false;
    update();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      update();
    }, { threshold: 0.05 }).observe(art);
  }

  update();
})();
