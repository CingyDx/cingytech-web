(function () {
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDistance(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "0 km";
    return `${Math.round(Number(value))} km`;
  }

  function dateLabel(value) {
    if (!value) return "Unknown";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString();
  }

  function statMetric(label, value) {
    return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const target = document.getElementById("profile-card");
    if (!target) return;

    await GameAuth.init();
    const user = await GameAuth.getUser();
    if (!user) {
      target.innerHTML = `
        <p class="eyebrow">Login required</p>
        <h2>Sign in to view profile stats.</h2>
        <p class="muted">CingyFun accounts are separate from the main Cingy.Tech site.</p>
        <div class="button-row"><a class="btn" href="login.html">Log in</a><a class="btn secondary" href="duel-lobby.html">Online Duel</a></div>
      `;
      return;
    }

    const localStats = Store.state().stats || {};
    const remote = await window.ProfileStats?.fetchRemote?.().catch(() => null);
    const stats = { ...localStats, ...(remote?.stats || {}) };
    const duelsPlayed = Number(stats.duelsPlayed || 0);
    const duelsWon = Number(stats.duelsWon || stats.duelWins || 0);
    const duelsLost = Number(stats.duelsLost || Math.max(0, duelsPlayed - duelsWon));
    const winRate = duelsPlayed ? Math.round((duelsWon / duelsPlayed) * 100) : 0;
    const safeName = escapeHtml(user.name || user.email || "Player");
    const displayName = user.isAdmin ? `<span class="rainbow-admin">${safeName}</span>` : safeName;

    target.innerHTML = `
      <div class="profile-head">
        <div class="profile-avatar">${user.isAdmin ? "K" : safeName.charAt(0).toUpperCase()}</div>
        <div>
          <p class="eyebrow">${user.isAdmin ? "Admin player" : "Player"}</p>
          <h2>${displayName}</h2>
          <p class="muted">${escapeHtml(user.email || "")}</p>
        </div>
      </div>
      <div class="stats-grid">
        ${statMetric("Games played", Number(stats.gamesPlayed || 0))}
        ${statMetric("Duels played", duelsPlayed)}
        ${statMetric("Duels won", duelsWon)}
        ${statMetric("Duels lost", duelsLost)}
        ${statMetric("Win rate", `${winRate}%`)}
        ${statMetric("Total guesses", Number(stats.totalGuesses || stats.guesses || 0))}
        ${statMetric("Average distance", formatDistance(stats.averageDistance || 0))}
        ${statMetric("Closest guess", formatDistance(stats.bestGuess || 0))}
        ${statMetric("Damage dealt", Math.round(Number(stats.totalDamageDealt || 0)))}
        ${statMetric("Best solo streak", Number(stats.soloBestStreak || 0))}
        ${statMetric("Best solo score", Number(stats.soloBestScore || 0))}
        ${statMetric("Rating", stats.rating ?? "Not ranked")}
      </div>
      <p class="muted">Account created: ${dateLabel(user.created_at || user.createdAt)}</p>
      <div class="button-row">
        <a class="btn" href="duel-lobby.html">Play Online Duel</a>
        <a class="btn secondary" href="solo.html">Play Solo</a>
      </div>
    `;
  });
})();
