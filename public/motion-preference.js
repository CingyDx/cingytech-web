// Restore the visitor's explicit choice before CSS paints the entrance scene.
(() => {
  const root = document.documentElement;
  let choice = root.dataset?.previewMotion;
  // A deliberate owner-preview link/copy opts in even when their OS reduces
  // motion. Ordinary visitors retain their own OS and saved preferences.
  if (choice !== 'on' && choice !== 'off' && typeof location === 'object') {
    choice = new URLSearchParams(location.search).get('motion');
  }
  try {
    if (choice !== 'on' && choice !== 'off') choice = localStorage.getItem('cingy-motion-v1');
    else localStorage.setItem('cingy-motion-v1', choice);
  } catch (_) { /* Explicit preview still works with unavailable storage. */ }
  if (choice !== 'on' && choice !== 'off') return;
  root.dataset.motionPreference = choice;
  root.classList.add(choice === 'on' ? 'motion-enabled' : 'motion-disabled');
})();
