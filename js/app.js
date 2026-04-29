(function () {
  const { qs, qsa, setupNav, applySettings } = window.WorldGuessUI;

  function initCommon() {
    applySettings();
    setupNav();

    const year = qs("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    qsa("[data-profile-name]").forEach((element) => {
      element.textContent = window.WorldGuessStorage.getProfile().name;
    });

    qsa("[data-clear-data]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!window.confirm("Reset all local WorldGuess data?")) return;
        window.WorldGuessStorage.resetAllData();
        window.location.reload();
      });
    });

    initResultsPage();
    initLeaderboardPage();
    initProfilePage();
    initSettingsPage();
    initHomePreview();
  }

  function initHomePreview() {
    const preview = qs("[data-home-map]");
    if (!preview) return;
    window.WorldGuessMap.createGuessMap(preview);
  }

  function initResultsPage() {
    if (document.body.dataset.page !== "results") return;
    const result = window.WorldGuessStorage.getState().lastResult;
    const root = qs("#results-root");
    if (!root) return;

    if (!result) {
      root.innerHTML = `<div class="panel"><h2>No results yet</h2><p>Play Solo or Duel first.</p><div class="actions"><a class="btn" href="solo.html">Play Solo</a><a class="btn-ghost" href="duel-lobby.html">Start Duel</a></div></div>`;
      return;
    }

    if (result.type === "duel") {
      root.innerHTML = `
        <div class="panel">
          <p class="eyebrow">Victory screen</p>
          <h1>${result.winner || "Winner"} survives.</h1>
          <p class="lead">Rounds: ${result.rounds || 0}. Biggest damage: ${(result.biggestDamage || 0).toLocaleString()}.</p>
          <div class="actions"><a class="btn" href="duel-lobby.html">Rematch</a><a class="btn-ghost" href="index.html">Back to Home</a></div>
        </div>
        <div class="confetti"></div>
      `;
      return;
    }

    const rows = (result.rounds || []).map((round) => `
      <tr><td>${round.round}</td><td>${round.country}</td><td>${round.guess}</td><td>${round.distance.toLocaleString()} km</td><td>${round.correct ? "Correct" : "Wrong"}</td></tr>
    `).join("");
    root.innerHTML = `
      <div class="panel">
        <p class="eyebrow">Solo results</p>
        <h1>${result.finalStreak || 0} country streak</h1>
        <p class="lead">Average distance: ${(result.averageDistance || 0).toLocaleString()} km. Rounds played: ${result.roundsPlayed || 0}.</p>
        <div class="actions"><a class="btn" href="solo.html">Play Again</a><a class="btn-ghost" href="leaderboard.html">Leaderboard</a><a class="btn-ghost" href="index.html">Back to Home</a></div>
      </div>
      <div class="panel table-wrap"><table class="data-table"><thead><tr><th>Round</th><th>Country</th><th>Guess</th><th>Distance</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
    `;
  }

  function initLeaderboardPage() {
    if (document.body.dataset.page !== "leaderboard") return;
    const table = qs("#leaderboard-table");
    const tabs = qsa("[data-board-tab]");
    const clear = qs("#clear-board");
    let active = "Solo";

    function render() {
      const entries = window.WorldGuessStorage.getState().leaderboard.filter((entry) => active === "Accuracy" ? true : entry.mode === active);
      if (!entries.length) {
        table.innerHTML = `<tr><td colspan="5">No local leaderboard data yet.</td></tr>`;
        return;
      }
      table.innerHTML = entries.map((entry, index) => `
        <tr><td>#${index + 1}</td><td>${entry.player}</td><td>${entry.mode}</td><td>${entry.score}</td><td>${new Date(entry.date).toLocaleDateString()}</td></tr>
      `).join("");
    }

    tabs.forEach((tab) => tab.addEventListener("click", () => {
      active = tab.dataset.boardTab;
      tabs.forEach((item) => item.classList.toggle("active", item === tab));
      render();
    }));
    clear?.addEventListener("click", () => {
      window.WorldGuessStorage.updateState((state) => {
        state.leaderboard = [];
        return state;
      });
      render();
    });
    render();
  }

  function initProfilePage() {
    if (document.body.dataset.page !== "profile") return;
    const profile = window.WorldGuessStorage.getProfile();
    const form = qs("#profile-form");
    const stats = qs("#profile-stats");
    if (form) form.name.value = profile.name;
    if (stats) {
      const average = profile.guesses ? Math.round(profile.totalDistance / profile.guesses) : 0;
      stats.innerHTML = `
        <div class="panel"><p>Games played</p><h3>${profile.gamesPlayed}</h3></div>
        <div class="panel"><p>Best solo streak</p><h3>${profile.bestSoloStreak}</h3></div>
        <div class="panel"><p>Duel wins</p><h3>${profile.duelWins}</h3></div>
        <div class="panel"><p>Duel losses</p><h3>${profile.duelLosses}</h3></div>
        <div class="panel"><p>Average distance</p><h3>${average} km</h3></div>
        <div class="panel"><p>Favorite mode</p><h3>${profile.favoriteMode}</h3></div>
      `;
    }
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      window.WorldGuessStorage.saveProfile({ name: form.name.value.trim() || "Explorer" });
      window.WorldGuessUI.showToast("Profile saved.", "success");
    });
  }

  function initSettingsPage() {
    if (document.body.dataset.page !== "settings") return;
    const settings = window.WorldGuessStorage.getSettings();
    const form = qs("#settings-form");
    if (!form) return;
    Object.entries(settings).forEach(([key, value]) => {
      const field = form.elements[key];
      if (!field) return;
      if (field.type === "checkbox") field.checked = Boolean(value);
      else field.value = String(value);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      window.WorldGuessStorage.saveSettings({
        theme: data.get("theme"),
        units: data.get("units"),
        mapStyle: data.get("mapStyle"),
        sound: data.get("sound") === "on",
        timerSounds: data.get("timerSounds") === "on",
        allowMoving: data.get("allowMoving") === "on",
        allowZoom: data.get("allowZoom") === "on",
        allowPan: data.get("allowPan") === "on"
      });
      window.WorldGuessUI.showToast("Settings saved.", "success");
      window.WorldGuessUI.applySettings();
    });
  }

  document.addEventListener("DOMContentLoaded", initCommon);
})();
