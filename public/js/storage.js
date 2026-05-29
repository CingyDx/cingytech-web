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
      sound: true,
      timerSounds: true,
      audioVersion: 1,
      theme: "dark"
    },
    stats: {
      gamesPlayed: 0,
      soloGamesPlayed: 0,
      duelsPlayed: 0,
      duelsWon: 0,
      duelsLost: 0,
      soloBestScore: 0,
      soloBestStreak: 0,
      duelWins: 0,
      averageDistance: 0,
      guesses: 0,
      totalGuesses: 0,
      totalDistance: 0,
      bestGuess: null,
      totalDamageDealt: 0,
      rating: null
    },
    leaderboard: [],
    lastResult: null,
    duelLobby: { player1: "Player 1", player2: "Player 2" }
  };

  function state() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "{}");
      const next = {
        ...defaults,
        ...parsed,
        settings: { ...defaults.settings, ...(parsed.settings || {}) },
        stats: { ...defaults.stats, ...(parsed.stats || {}) },
        leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : []
      };
      if (next.settings.audioVersion !== 1) {
        next.settings.sound = true;
        next.settings.timerSounds = true;
        next.settings.audioVersion = 1;
        localStorage.setItem(KEY, JSON.stringify(next));
      }
      return next;
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

  function recordGuessStats(stats, distance, count = 1) {
    const safeCount = Math.max(0, Number(count) || 0);
    const safeDistance = Math.max(0, Number(distance) || 0);
    if (!safeCount) return;
    stats.totalGuesses = (stats.totalGuesses || stats.guesses || 0) + safeCount;
    stats.guesses = stats.totalGuesses;
    stats.totalDistance = (stats.totalDistance || 0) + safeDistance;
    stats.averageDistance = stats.totalGuesses ? Math.round(stats.totalDistance / stats.totalGuesses) : 0;
    if (safeDistance > 0 && (stats.bestGuess === null || stats.bestGuess === undefined || safeDistance < stats.bestGuess)) {
      stats.bestGuess = safeDistance;
    }
  }

  function saveSoloResult(result) {
    update((current) => {
      current.lastResult = { type: "solo", ...result };
      current.stats.gamesPlayed = (current.stats.gamesPlayed || 0) + 1;
      current.stats.soloGamesPlayed = (current.stats.soloGamesPlayed || 0) + 1;
      current.stats.soloBestScore = Math.max(current.stats.soloBestScore, result.totalScore || 0);
      current.stats.soloBestStreak = Math.max(current.stats.soloBestStreak, result.streak || 0);
      recordGuessStats(current.stats, result.distance || 0, 1);
      current.leaderboard.push({ mode: "Solo", player: "You", score: result.totalScore || 0, streak: result.streak || 0, distance: result.distance || 0, date: new Date().toISOString() });
      current.leaderboard = current.leaderboard.sort((a, b) => b.score - a.score).slice(0, 50);
      return current;
    });
  }

  function saveDuelResult(result) {
    update((current) => {
      current.lastResult = { type: "duel", ...result };
      current.stats.gamesPlayed = (current.stats.gamesPlayed || 0) + 1;
      current.stats.duelsPlayed = (current.stats.duelsPlayed || 0) + 1;
      const won = result.mySlot && result.winnerSlot ? result.mySlot === result.winnerSlot : result.winner === result.player1;
      if (won) {
        current.stats.duelsWon = (current.stats.duelsWon || current.stats.duelWins || 0) + 1;
        current.stats.duelWins = current.stats.duelsWon;
      } else {
        current.stats.duelsLost = (current.stats.duelsLost || 0) + 1;
      }
      current.stats.totalDamageDealt = (current.stats.totalDamageDealt || 0) + (Number(result.damageDealt) || 0);
      recordGuessStats(current.stats, result.totalDistance || 0, result.guesses || 0);
      if (Number.isFinite(result.bestGuess) && result.bestGuess > 0) {
        current.stats.bestGuess = current.stats.bestGuess === null || current.stats.bestGuess === undefined
          ? result.bestGuess
          : Math.min(current.stats.bestGuess, result.bestGuess);
      }
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
