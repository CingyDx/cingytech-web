(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reveals = [...document.querySelectorAll('.reveal, .signal, .portfolio-window, .demo-rail, .method-inner')];
  const surfaces = [...document.querySelectorAll('.signal, .portfolio-window')];
  const activeAnimations = new Set();
  let observer;
  let pointerEvents;
  let revealsStarted = false;

  function motionAllowed() {
    return !document.documentElement.classList.contains('motion-disabled') && (!reduced.matches || document.documentElement.classList.contains('motion-enabled'));
  }

  function reveal(element, immediate = false) {
    const pending = element.classList.contains('motion-pending');
    element.classList.remove('motion-pending');
    observer?.unobserve(element);
    if (!pending || immediate || !motionAllowed() || !element.animate) return;
    const peers = element.matches('.signal') ? [...element.parentElement.querySelectorAll('.signal')] : element.matches('.portfolio-window') ? surfaces.filter(item => item.matches('.portfolio-window')) : [];
    const index = Math.max(0, peers.indexOf(element));
    const side = element.matches('.portfolio-banik') ? -40 : element.matches('.portfolio-wenspol') ? 40 : 0;
    const animation = element.animate([
      { opacity: 0, translate: `${side}px 58px` },
      { opacity: 1, translate: '0 0' }
    ], { duration: 950, delay: index * 95 + (element.matches('.signal') ? Math.max(0, 650 - performance.now()) : 0), easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    activeAnimations.add(animation);
    animation.finished.catch(() => {}).finally(() => activeAnimations.delete(animation));
  }

  function startReveals() {
    if (revealsStarted || !motionAllowed() || !('IntersectionObserver' in window)) return;
    revealsStarted = true;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
    }, { threshold: .08, rootMargin: '0px 0px -25px 0px' });
    reveals.forEach(element => {
      element.classList.add('motion-pending');
      observer.observe(element);
    });
  }
  document.addEventListener('focusin', event => {
    const element = event.target.closest('.motion-pending');
    if (element) reveal(element, true);
  });

  function resetSurface(element) {
    element.style.removeProperty('--tilt-x');
    element.style.removeProperty('--tilt-y');
    element.style.removeProperty('--glint-x');
  }

  function configurePointer() {
    pointerEvents?.abort();
    surfaces.forEach(resetSurface);
    if (!motionAllowed() || !pointer.matches) return;
    pointerEvents = new AbortController();
    const signal = pointerEvents.signal;
    const options = { signal, passive: true };
    surfaces.forEach(element => {
      let rect;
      let frame;
      let position;
      const invalidateRect = () => { rect = null; };
      window.addEventListener('scroll', invalidateRect, options);
      window.addEventListener('resize', invalidateRect, options);
      signal.addEventListener('abort', () => cancelAnimationFrame(frame), { once: true });
      element.addEventListener('pointerenter', () => { rect = element.getBoundingClientRect(); }, options);
      element.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch') return;
        position = { x: event.clientX, y: event.clientY };
        // Coalesce pointer events into one update per display frame.
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = null;
          if (!motionAllowed() || signal.aborted) return;
          rect ??= element.getBoundingClientRect();
          const x = Math.max(0, Math.min(1, (position.x - rect.left) / rect.width));
          const y = Math.max(0, Math.min(1, (position.y - rect.top) / rect.height));
          element.style.setProperty('--tilt-x', `${(0.5 - y) * 5}deg`);
          element.style.setProperty('--tilt-y', `${(x - 0.5) * 7}deg`);
          element.style.setProperty('--glint-x', `${Math.round(x * 100)}%`);
        });
      }, options);
      element.addEventListener('pointerleave', () => {
        cancelAnimationFrame(frame);
        frame = null;
        rect = null;
        resetSurface(element);
      }, options);
    });
  }

  function configureMotion() {
    if (!motionAllowed()) {
      reveals.forEach(element => reveal(element, true));
      activeAnimations.forEach(animation => animation.cancel());
      observer?.disconnect();
    }
    startReveals();
    configurePointer();
  }
  reduced.addEventListener('change', configureMotion);
  window.addEventListener('cingy-motion-change', configureMotion);
  pointer.addEventListener('change', configurePointer);
  configureMotion();
})();
