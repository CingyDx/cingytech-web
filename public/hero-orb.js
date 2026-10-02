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
  let playRequest = 0;
  let playPending = false;

  function shouldPlay() {
    return visible && !document.hidden && (!(reducedMotion.matches || saveData) || manualPlayback);
  }

  function update() {
    toggle.hidden = !(reducedMotion.matches || saveData || playbackBlocked);
    toggle.textContent = manualPlayback ? 'Pozastavit animace' : playbackBlocked ? 'Přehrát 3D animaci' : 'Zapnout animace';
    toggle.setAttribute('aria-pressed', String(manualPlayback));
    if (document.documentElement.classList.contains('motion-enabled') !== manualPlayback) {
      document.documentElement.classList.toggle('motion-enabled', manualPlayback);
      window.dispatchEvent(new Event('cingy-motion-change'));
    }

    if (!shouldPlay()) {
      // A pending play() interrupted by scrolling is not an autoplay rejection.
      playRequest += 1;
      playPending = false;
      video.pause();
      // Preserve the last rendered frame for a seamless return to the hero.
      return;
    }

    if (playPending || !video.paused || (playbackBlocked && !manualPlayback)) return;
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
      if (error.name === 'AbortError' || !shouldPlay()) return;
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
