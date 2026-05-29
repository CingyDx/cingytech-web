(function () {
  let context = null;
  let master = null;
  let ambientNodes = [];
  let ambientTimers = [];
  let dramaTimer = null;
  let ambientWanted = false;
  let unlocked = false;
  let unlockInstalled = false;

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
    master.gain.value = 0.24;
    master.connect(context.destination);
    return context;
  }

  async function unlock() {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
    unlocked = true;
    if (ambientWanted && !ambientNodes.length) startAmbient();
    updateControls();
  }

  function installUnlock() {
    if (unlockInstalled) return;
    unlockInstalled = true;
    const handler = (event) => {
      if (event.target?.closest?.("[data-audio-toggle]")) return;
      unlock();
    };
    window.addEventListener("pointerdown", handler, { passive: true });
    window.addEventListener("keydown", handler);
  }

  function updateControls() {
    document.querySelectorAll("[data-audio-toggle]").forEach((button) => {
      const on = enabled();
      const running = Boolean(ambientNodes.length || ambientTimers.length);
      button.classList.toggle("active", on);
      button.setAttribute("aria-pressed", String(on));
      button.textContent = !on ? "Music Off" : running && unlocked ? "Music On" : "Start Music";
    });
  }

  async function setEnabled(value) {
    window.Store?.update?.((current) => {
      current.settings = {
        ...current.settings,
        sound: Boolean(value),
        timerSounds: Boolean(value),
        audioVersion: 1
      };
      return current;
    });

    if (value) {
      await unlock();
      startAmbient();
      tone(660, 0.08, "triangle", 0.12);
      tone(880, 0.1, "triangle", 0.1, 0.07);
    } else {
      stopDrama(false);
      stopAmbient();
    }
    updateControls();
  }

  function initControls() {
    updateControls();
    document.querySelectorAll("[data-audio-toggle]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!enabled()) {
          await setEnabled(true);
          return;
        }
        if (!unlocked || (!ambientNodes.length && !ambientTimers.length)) {
          await unlock();
          startAmbient();
          updateControls();
          return;
        }
        await setEnabled(false);
      });
    });
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
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // One-shot nodes may already be cleaned up.
      }
    };
  }

  function musicTone(freq, duration = 0.6, type = "triangle", volume = 0.045, when = 0) {
    if (!enabled() || !unlocked) return;
    const ctx = getContext();
    if (!ctx || !master) return;

    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.08);
    osc.onended = () => {
      try {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        // One-shot music nodes may already be cleaned up.
      }
    };
  }

  function startAmbient() {
    ambientWanted = true;
    if (!enabled()) return;
    const ctx = getContext();
    if (!ctx || ambientNodes.length || ambientTimers.length) return;
    if (!unlocked && ctx.state === "suspended") return;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.038;
    filter.connect(padGain);
    padGain.connect(master);

    const a = ctx.createOscillator();
    a.type = "sine";
    a.frequency.value = 98;
    const b = ctx.createOscillator();
    b.type = "triangle";
    b.frequency.value = 146.83;
    const c = ctx.createOscillator();
    c.type = "sine";
    c.frequency.value = 196;
    a.connect(filter);
    b.connect(filter);
    c.connect(filter);
    a.start();
    b.start();
    c.start();
    ambientNodes = [a, b, c, filter, padGain];

    let step = 0;
    const arp = [392, 493.88, 587.33, 659.25, 587.33, 493.88, 440, 523.25];
    const bass = [98, 130.81, 146.83, 123.47];
    const playLoop = () => {
      if (!enabled() || !unlocked) return;
      const baseIndex = step % arp.length;
      musicTone(arp[baseIndex], 0.42, "triangle", 0.052, 0);
      musicTone(arp[(baseIndex + 2) % arp.length], 0.38, "sine", 0.026, 0.22);
      if (step % 2 === 0) musicTone(bass[Math.floor(step / 2) % bass.length], 0.95, "sine", 0.04, 0.02);
      step += 1;
    };
    playLoop();
    ambientTimers = [
      window.setInterval(playLoop, 780),
      window.setInterval(() => {
        if (!enabled() || !unlocked) return;
        musicTone(261.63, 1.2, "sine", 0.018, 0);
        musicTone(329.63, 1.2, "sine", 0.014, 0.08);
        musicTone(392, 1.2, "sine", 0.012, 0.16);
      }, 3120)
    ];
    updateControls();
  }

  function stopAmbient() {
    ambientWanted = false;
    ambientTimers.forEach((timer) => window.clearInterval(timer));
    ambientTimers = [];
    ambientNodes.forEach((node) => {
      try {
        node.stop?.();
        node.disconnect?.();
      } catch {
        // Nodes can already be stopped by the browser.
      }
    });
    ambientNodes = [];
    updateControls();
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
    initControls,
    setEnabled,
    isEnabled: enabled,
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

  document.addEventListener("DOMContentLoaded", () => {
    installUnlock();
    initControls();
  });
})();
