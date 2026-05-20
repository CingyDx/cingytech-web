(function () {
  const STATS_API = "/api/cingyfun/streetguess/stats";

  async function authHeaders() {
    if (!window.GameAuth) return null;
    const user = await GameAuth.getUser();
    if (!user) return null;
    return {
      "Content-Type": "application/json",
      ...(await GameAuth.authHeaders())
    };
  }

  async function fetchRemote() {
    const headers = await authHeaders();
    if (!headers) return null;
    const response = await fetch(STATS_API, { headers, cache: "no-store", credentials: "same-origin" });
    if (!response.ok) return null;
    return await response.json();
  }

  async function recordDelta(delta) {
    const headers = await authHeaders();
    if (!headers) return null;
    const response = await fetch(STATS_API, {
      method: "POST",
      headers,
      credentials: "same-origin",
      body: JSON.stringify({ delta })
    });
    if (!response.ok) return null;
    return await response.json();
  }

  function recordSolo(result) {
    const distance = Number(result.distance) || 0;
    return recordDelta({
      gamesPlayed: 1,
      soloGamesPlayed: 1,
      totalGuesses: 1,
      totalDistance: distance,
      bestGuess: distance > 0 ? distance : null,
      soloBestScore: Number(result.totalScore || result.score || 0),
      soloBestStreak: Number(result.streak || 0)
    }).catch((error) => console.warn("Remote solo stats failed", error));
  }

  function recordDuel(result) {
    const won = result.mySlot && result.winnerSlot ? result.mySlot === result.winnerSlot : false;
    return recordDelta({
      gamesPlayed: 1,
      duelsPlayed: 1,
      duelsWon: won ? 1 : 0,
      duelsLost: won ? 0 : 1,
      totalGuesses: Number(result.guesses || 0),
      totalDistance: Number(result.totalDistance || 0),
      bestGuess: Number(result.bestGuess || 0) || null,
      totalDamageDealt: Number(result.damageDealt || 0)
    }).catch((error) => console.warn("Remote duel stats failed", error));
  }

  window.ProfileStats = { fetchRemote, recordDelta, recordSolo, recordDuel };
})();
