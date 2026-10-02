// Restore the visitor's explicit choice before CSS paints the entrance scene.
(() => {
  try {
    const choice = localStorage.getItem('cingy-motion-v1');
    if (choice !== 'on' && choice !== 'off') return;
    document.documentElement.dataset.motionPreference = choice;
    document.documentElement.classList.add(choice === 'on' ? 'motion-enabled' : 'motion-disabled');
  } catch (_) { /* Motion still works when storage is unavailable. */ }
})();
