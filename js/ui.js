(function () {
  function qs(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function qsa(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }

  function showToast(message, type = "info") {
    let stack = qs(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    stack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }

  function openModal(content, options = {}) {
    closeModal();
    const overlay = document.createElement("div");
    overlay.className = "modal-backdrop";
    overlay.innerHTML = `<section class="modal-card">${content}</section>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay && options.dismissible !== false) closeModal();
    });

    return overlay;
  }

  function closeModal() {
    qs(".modal-backdrop")?.remove();
  }

  function startCountdown(target, onDone) {
    let count = 3;
    const overlay = document.createElement("div");
    overlay.className = "countdown-overlay";
    overlay.textContent = count;
    target.appendChild(overlay);

    const interval = window.setInterval(() => {
      count -= 1;
      if (count <= 0) {
        window.clearInterval(interval);
        overlay.textContent = "Go";
        window.setTimeout(() => {
          overlay.remove();
          onDone?.();
        }, 450);
      } else {
        overlay.textContent = count;
      }
    }, 700);
  }

  function setTimerText(element, seconds) {
    element.textContent = window.WorldGuessTimer.formatTime(seconds);
    element.classList.toggle("danger-pulse", seconds <= 15);
  }

  function applySettings() {
    const settings = window.WorldGuessStorage.getSettings();
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.mapStyle = settings.mapStyle;
  }

  function setupNav() {
    const toggle = qs("[data-nav-toggle]");
    const nav = qs("[data-nav]");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", nav.classList.contains("open") ? "true" : "false");
    });
  }

  function renderCountrySelect(select, onChange) {
    select.innerHTML = `<option value="">Choose country</option>`;
    window.WorldGuessData.countries.forEach((country) => {
      const option = document.createElement("option");
      option.value = country.code;
      option.textContent = country.name;
      select.appendChild(option);
    });
    select.addEventListener("change", () => onChange?.(select.value));
  }

  window.WorldGuessUI = {
    qs,
    qsa,
    showToast,
    openModal,
    closeModal,
    startCountdown,
    setTimerText,
    applySettings,
    setupNav,
    renderCountrySelect
  };
})();
