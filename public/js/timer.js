(function () {
  function formatTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
  }

  function createTimer(seconds, callbacks = {}) {
    let remaining = seconds;
    let interval = null;

    function tick() {
      remaining -= 1;
      callbacks.onTick?.(remaining);
      if (remaining <= 0) {
        stop();
        callbacks.onDone?.();
      }
    }

    function start() {
      stop();
      callbacks.onTick?.(remaining);
      interval = window.setInterval(tick, 1000);
    }

    function stop() {
      if (interval) window.clearInterval(interval);
      interval = null;
    }

    function reset(next = seconds) {
      stop();
      remaining = next;
      callbacks.onTick?.(remaining);
    }

    return { start, stop, reset, getRemaining: () => remaining };
  }

  window.GameTimer = { createTimer, formatTime };
})();
