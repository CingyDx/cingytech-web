(function () {
  const KEY = "streetguess-v1";

  const defaults = {
    settings: {
      timeLimit: 180,
      units: "km",
      movementAllowed: true,
      allowZoom: true,
      allowPan: true,
      mapType: "roadmap",
      sound: false,
      timerSounds: false,
      theme: "dark"
    },
    stats: {
      soloBestScore: 0,
      soloBestStreak: 0,
      duelWins: 0,
      averageDistance: 0,
      guesses: 0,
      totalDistance: 0
    },
    leaderboard: [],
    lastResult: null,
    duelLobby: { player1: "Player 1", player2: "Player 2" }
  };

  function state() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "{}");
      return {
        ...defaults,
        ...parsed,
        settings: { ...defaults.settings, ...(parsed.settings || {}) },
        stats: { ...defaults.stats, ...(parsed.stats || {}) },
        leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : []
      };
    } catch {
      return JSON.parse(JSON.stringify(defaults));
    }
  }

  function save(next) {
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }

  function update(fn) {
    const current = state();
    return save(fn(current) || current);
  }

  function saveSoloResult(result) {
    update((current) => {
      current.lastResult = { type: "solo", ...result };
      current.stats.soloBestScore = Math.max(current.stats.soloBestScore, result.totalScore || 0);
      current.stats.soloBestStreak = Math.max(current.stats.soloBestStreak, result.streak || 0);
      current.stats.totalDistance += result.distance || 0;
      current.stats.guesses += 1;
      current.stats.averageDistance = Math.round(current.stats.totalDistance / current.stats.guesses);
      current.leaderboard.push({ mode: "Solo", player: "You", score: result.totalScore || 0, streak: result.streak || 0, distance: result.distance || 0, date: new Date().toISOString() });
      current.leaderboard = current.leaderboard.sort((a, b) => b.score - a.score).slice(0, 50);
      return current;
    });
  }

  function saveDuelResult(result) {
    update((current) => {
      current.lastResult = { type: "duel", ...result };
      if (result.winner === result.player1) current.stats.duelWins += 1;
      current.leaderboard.push({ mode: "Duel", player: result.winner, score: result.rounds || 1, streak: 0, distance: result.biggestDamage || 0, date: new Date().toISOString() });
      current.leaderboard = current.leaderboard.slice(-50);
      return current;
    });
  }

  window.Store = { state, save, update, saveSoloResult, saveDuelResult };
  window.saveSoloResult = saveSoloResult;
  window.saveDuelResult = saveDuelResult;
  window.updateLeaderboard = () => state().leaderboard;
})();
