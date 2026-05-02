(function () {
  let context = null;
  let master = null;
  let ambientNodes = [];
  let dramaTimer = null;
  let ambientWanted = false;
  let unlocked = false;

  function settings() {
    return window.Store?.state?.().settings || {};
  }

  function enabled() {
    return settings().sound !== false;
  }

  function timerEnabled() {
    return enabled() && settings().timerSounds !== false;
  }

  function getContext() {
    if (context) return context;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.18;
    master.connect(context.destination);
    return context;
  }

  async function unlock() {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
    unlocked = true;
    if (ambientWanted && !ambientNodes.length) startAmbient();
  }

  function installUnlock() {
    const handler = () => unlock();
    window.addEventListener("pointerdown", handler, { passive: true });
    window.addEventListener("keydown", handler);
  }

  function tone(freq, duration = 0.12, type = "sine", volume = 0.18, when = 0) {
    if (!enabled()) return;
    const ctx = getContext();
    if (!ctx || !master) return;

    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  function startAmbient() {
    ambientWanted = true;
    if (!enabled()) return;
    const ctx = getContext();
    if (!ctx || ambientNodes.length) return;
    if (!unlocked && ctx.state === "suspended") return;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 820;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    filter.connect(gain);
    gain.connect(master);

    const a = ctx.createOscillator();
    a.type = "sine";
    a.frequency.value = 110;
    const b = ctx.createOscillator();
    b.type = "triangle";
    b.frequency.value = 165;
    a.connect(filter);
    b.connect(filter);
    a.start();
    b.start();
    ambientNodes = [a, b, filter, gain];
  }

  function stopAmbient() {
    ambientWanted = false;
    ambientNodes.forEach((node) => {
      try {
        node.stop?.();
        node.disconnect?.();
      } catch {
        // Nodes can already be stopped by the browser.
      }
    });
    ambientNodes = [];
  }

  function startDrama() {
    if (!timerEnabled() || dramaTimer) return;
    stopAmbient();
    let step = 0;
    dramaTimer = window.setInterval(() => {
      const base = step % 2 ? 172 : 122;
      tone(base, 0.13, "sawtooth", 0.16);
      if (step % 4 === 3) tone(base * 2, 0.08, "square", 0.09, 0.04);
      step += 1;
    }, 480);
  }

  function stopDrama(resumeAmbient = true) {
    if (dramaTimer) window.clearInterval(dramaTimer);
    dramaTimer = null;
    if (resumeAmbient) startAmbient();
  }

  function tick(remaining) {
    if (!timerEnabled() || remaining > 15 || remaining < 0) return;
    const pitch = remaining <= 5 ? 880 : 560;
    tone(pitch, 0.055, "square", remaining <= 5 ? 0.16 : 0.08);
  }

  function guess() {
    tone(520, 0.08, "triangle", 0.12);
    tone(760, 0.09, "triangle", 0.11, 0.075);
  }

  function success() {
    tone(420, 0.08, "sine", 0.12);
    tone(630, 0.1, "sine", 0.12, 0.08);
    tone(840, 0.16, "sine", 0.1, 0.18);
  }

  function fail() {
    tone(220, 0.12, "sawtooth", 0.12);
    tone(150, 0.22, "sawtooth", 0.1, 0.12);
  }

  function damage() {
    tone(96, 0.18, "sawtooth", 0.18);
    tone(64, 0.24, "square", 0.1, 0.08);
  }

  window.AudioManager = {
    installUnlock,
    unlock,
    startAmbient,
    stopAmbient,
    startDrama,
    stopDrama,
    tick,
    guess,
    success,
    fail,
    damage
  };
})();
