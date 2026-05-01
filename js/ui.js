(function () {
  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function toast(message) {
    let stack = qs(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = message;
    stack.appendChild(item);
    setTimeout(() => item.remove(), 3200);
  }

  function modal(html, dismissible = true) {
    closeModal();
    const node = document.createElement("div");
    node.className = "modal-backdrop";
    node.innerHTML = `<section class="modal-card">${html}</section>`;
    if (dismissible) {
      node.addEventListener("click", (event) => {
        if (event.target === node) closeModal();
      });
    }
    document.body.appendChild(node);
    return node;
  }

  function closeModal() {
    qs(".modal-backdrop")?.remove();
  }

  function setTimer(element, seconds) {
    element.textContent = GameTimer.formatTime(seconds);
    element.classList.toggle("timer-danger", seconds <= 15);
  }

  function nav() {
    const toggle = qs("#nav-toggle");
    const menu = qs("#site-nav");
    if (!toggle || !menu) return;
    toggle.addEventListener("click", () => {
      const open = !menu.classList.contains("open");
      menu.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  window.UI = { qs, qsa, toast, modal, closeModal, setTimer, nav };
})();
