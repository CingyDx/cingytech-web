(function () {
  function createTimer(durationSeconds, callbacks) {
    let remaining = durationSeconds;
    let interval = null;
    let running = false;

    function tick() {
      remaining -= 1;
      callbacks?.onTick?.(remaining);

      if (remaining <= 0) {
        stop();
        callbacks?.onEnd?.();
      }
    }

    function start() {
      stop();
      running = true;
      callbacks?.onTick?.(remaining);
      interval = window.setInterval(tick, 1000);
    }

    function pause() {
      if (interval) window.clearInterval(interval);
      interval = null;
      running = false;
    }

    function stop() {
      if (interval) window.clearInterval(interval);
      interval = null;
      running = false;
    }

    function reset(nextDuration = durationSeconds) {
      stop();
      remaining = nextDuration;
      callbacks?.onTick?.(remaining);
    }

    return {
      start,
      pause,
      stop,
      reset,
      getRemaining: () => remaining,
      isRunning: () => running
    };
  }

  function formatTime(totalSeconds) {
    const safe = Math.max(0, Math.ceil(totalSeconds));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  window.WorldGuessTimer = { createTimer, formatTime };
})();
