(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.page-motion-toggle');
  if (!toggle) return;
  let preference = root.dataset.motionPreference;
  function update() {
    const enabled = preference === 'on' || (preference !== 'off' && !reduced.matches && navigator.connection?.saveData !== true);
    root.classList.toggle('motion-enabled', preference === 'on');
    root.classList.toggle('motion-disabled', !enabled);
    toggle.textContent = enabled ? 'Pozastavit animace' : 'Zapnout animace';
    toggle.setAttribute('aria-pressed', String(enabled));
    window.dispatchEvent(new Event('cingy-motion-change'));
  }
  toggle.addEventListener('click', () => {
    preference = root.classList.contains('motion-disabled') ? 'on' : 'off';
    root.dataset.motionPreference = preference;
    try { localStorage.setItem('cingy-motion-v1', preference); } catch (_) { /* optional preference */ }
    update();
  });
  reduced.addEventListener('change', update);
  update();
})();
