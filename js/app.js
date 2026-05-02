(function () {
  function applyTheme() {
    const settings = Store.state().settings;
    const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
    const light = settings.theme === "light" || (settings.theme === "system" && prefersLight);
    document.body.classList.toggle("light-theme", light);
  }

  function initCommon() {
    UI.nav();
    UI.qsa("[data-year]").forEach((node) => {
      node.textContent = new Date().getFullYear();
    });
    applyTheme();
    injectFunFooter();
    window.AudioManager?.installUnlock?.();
  }

  function injectFunFooter() {
    if (document.body.classList.contains("game-body") || UI.qs("footer")) return;
    const path = location.pathname.toLowerCase();
    const inFun = path.includes("/cingyfun");
    if (!inFun) return;

    const footer = document.createElement("footer");
    footer.className = "fun-footer";
    footer.innerHTML = `
      <div class="container fun-footer-inner">
        <div>
          <a class="fun-footer-brand" href="/CingyFun/">
            <img src="/assets/cingyfun-logo.svg" alt="">
            <span>CingyFun</span>
          </a>
          <p class="muted">&copy; <span data-year></span> | Vytvořil Kryštof Cingálek</p>
        </div>
        <nav class="fun-footer-links" aria-label="CingyFun footer">
          <a href="/">Cingy.Tech</a>
          <a href="/CingyFun/">Game hub</a>
          <a href="/CingyFun/Streetguess/">StreetGuess</a>
          <a href="/CingyFun/Streetguess/login.html">Login</a>
          <a href="/pages/privacy.html">Privacy</a>
        </nav>
      </div>
    `;
    document.body.appendChild(footer);
    footer.querySelectorAll("[data-year]").forEach((node) => {
      node.textContent = new Date().getFullYear();
    });
  }

  function initSettings() {
    const form = UI.qs("#settings-form");
    if (!form) return;

    const settings = Store.state().settings;
    form.timeLimit.value = settings.timeLimit || 180;
    form.units.value = settings.units || "km";
    form.mapType.value = settings.mapType || "roadmap";
    form.theme.value = settings.theme || "dark";
    form.movementAllowed.checked = settings.movementAllowed !== false;
    form.allowZoom.checked = settings.allowZoom !== false;
    form.allowPan.checked = settings.allowPan !== false;
    form.sound.checked = Boolean(settings.sound);
    form.timerSounds.checked = Boolean(settings.timerSounds);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      Store.update((current) => {
        current.settings = {
          ...current.settings,
          timeLimit: Number(form.timeLimit.value) || 180,
          units: form.units.value,
          mapType: form.mapType.value,
          theme: form.theme.value,
          movementAllowed: form.movementAllowed.checked,
          allowZoom: form.allowZoom.checked,
          allowPan: form.allowPan.checked,
          sound: form.sound.checked,
          timerSounds: form.timerSounds.checked,
          audioVersion: 1
        };
        return current;
      });
      applyTheme();
      UI.toast("Settings saved.");
    });

    UI.qs("#reset-data-btn")?.addEventListener("click", () => {
      if (!confirm("Reset all StreetGuess local data?")) return;
      localStorage.removeItem("streetguess-v1");
      UI.toast("Local data cleared.");
      window.setTimeout(() => location.reload(), 700);
    });
  }

  function initLeaderboard() {
    const body = UI.qs("#leaderboard-body");
    if (!body) return;
    const tabs = UI.qsa("[data-leaderboard-tab]");
    let active = "Solo";

    function render() {
      tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.leaderboardTab === active));
      const rows = Store.state().leaderboard
        .filter((entry) => active === "Accuracy" ? true : entry.mode === active)
        .sort((a, b) => {
          if (active === "Accuracy") return (a.distance || 999999) - (b.distance || 999999);
          return (b.score || 0) - (a.score || 0);
        });

      if (!rows.length) {
        body.innerHTML = `<tr><td colspan="5" class="empty-state">No local results yet.</td></tr>`;
        return;
      }

      body.innerHTML = rows.map((entry, index) => `
        <tr>
          <td>#${index + 1}</td>
          <td>${entry.player || "You"}</td>
          <td>${entry.mode}</td>
          <td>${entry.mode === "Solo" ? `${entry.score || 0} pts / ${entry.streak || 0} streak` : `${entry.score || 0} rounds`}</td>
          <td>${new Date(entry.date).toLocaleDateString()}</td>
        </tr>
      `).join("");
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        active = tab.dataset.leaderboardTab;
        render();
      });
    });

    UI.qs("#clear-leaderboard-btn")?.addEventListener("click", () => {
      Store.update((current) => {
        current.leaderboard = [];
        return current;
      });
      render();
    });

    render();
  }

  function initResults() {
    const target = UI.qs("#results-root");
    if (!target) return;
    const result = Store.state().lastResult;
    if (!result) {
      target.innerHTML = `
        <section class="panel card">
          <p class="eyebrow">No result</p>
          <h1>No finished game yet.</h1>
          <div class="button-row"><a class="btn" href="solo.html">Play Solo</a><a class="btn secondary" href="duel-lobby.html">Start Online Duel</a></div>
        </section>
      `;
      return;
    }

    if (result.type === "duel") {
      createConfetti();
      target.innerHTML = `
        <section class="panel card">
          <p class="eyebrow">Duel complete</p>
          <h1>${result.winner} wins</h1>
          <div class="result-grid">
            <div class="metric"><span>Rounds</span><strong>${result.rounds}</strong></div>
            <div class="metric"><span>${result.player1}</span><strong>${result.hp1} HP</strong></div>
            <div class="metric"><span>${result.player2}</span><strong>${result.hp2} HP</strong></div>
            <div class="metric"><span>Biggest damage</span><strong>${result.biggestDamage}</strong></div>
          </div>
          <div class="button-row"><a class="btn" href="duel-lobby.html">New Online Room</a><a class="btn secondary" href="../">Back to CingyFun</a></div>
        </section>
      `;
      return;
    }

    target.innerHTML = `
      <section class="panel card">
        <p class="eyebrow">Solo result</p>
        <h1>${result.correct ? "Country locked." : "Streak ended."}</h1>
        <div class="result-grid">
          <div class="metric"><span>Total score</span><strong>${result.totalScore || 0}</strong></div>
          <div class="metric"><span>Streak</span><strong>${result.streak || 0}</strong></div>
          <div class="metric"><span>Distance</span><strong>${result.distance || 0} km</strong></div>
          <div class="metric"><span>Best streak</span><strong>${Store.state().stats.soloBestStreak || 0}</strong></div>
        </div>
        <div class="button-row"><a class="btn" href="solo.html">Play Again</a><a class="btn secondary" href="leaderboard.html">Leaderboard</a><a class="btn secondary" href="../">Back to CingyFun</a></div>
      </section>
    `;
  }

  function createConfetti() {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    for (let i = 0; i < 80; i += 1) {
      const piece = document.createElement("i");
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.animationDelay = `${Math.random() * 1.4}s`;
      piece.style.background = ["#1de9b6", "#39ff88", "#f9c74f", "#8ab4f8", "#ff4d5e"][i % 5];
      confetti.appendChild(piece);
    }
    document.body.appendChild(confetti);
    window.setTimeout(() => confetti.remove(), 4400);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initCommon();
    initSettings();
    initLeaderboard();
    initResults();
  });
})();
