(function () {
  const KEY = "worldguess-state-v1";

  const defaults = {
    settings: {
      theme: "dark",
      units: "kilometers",
      mapStyle: "dark",
      sound: false,
      timerSounds: true,
      allowMoving: true,
      allowZoom: true,
      allowPan: true
    },
    profile: {
      name: "Explorer",
      avatar: "assets/avatar-player1.svg",
      gamesPlayed: 0,
      bestSoloStreak: 0,
      duelWins: 0,
      duelLosses: 0,
      totalDistance: 0,
      guesses: 0,
      favoriteMode: "Solo"
    },
    leaderboard: [],
    soloSession: null,
    duelSession: null,
    lastResult: null
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getState() {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
      return {
        ...clone(defaults),
        ...stored,
        settings: { ...defaults.settings, ...(stored.settings || {}) },
        profile: { ...defaults.profile, ...(stored.profile || {}) },
        leaderboard: Array.isArray(stored.leaderboard) ? stored.leaderboard : []
      };
    } catch {
      return clone(defaults);
    }
  }

  function setState(nextState) {
    localStorage.setItem(KEY, JSON.stringify(nextState));
    return nextState;
  }

  function updateState(updater) {
    const state = getState();
    const nextState = updater(state) || state;
    return setState(nextState);
  }

  function getSettings() {
    return getState().settings;
  }

  function saveSettings(settings) {
    updateState((state) => {
      state.settings = { ...state.settings, ...settings };
      return state;
    });
  }

  function getProfile() {
    return getState().profile;
  }

  function saveProfile(profile) {
    updateState((state) => {
      state.profile = { ...state.profile, ...profile };
      return state;
    });
  }

  function saveSoloResult(result) {
    updateState((state) => {
      state.lastResult = { type: "solo", ...result };
      state.profile.gamesPlayed += 1;
      state.profile.bestSoloStreak = Math.max(state.profile.bestSoloStreak, result.finalStreak || 0);
      state.profile.totalDistance += result.totalDistance || 0;
      state.profile.guesses += result.rounds?.length || 0;
      state.profile.favoriteMode = "Solo";
      state.leaderboard.push({
        id: Date.now(),
        player: state.profile.name,
        mode: "Solo",
        metric: "streak",
        score: result.finalStreak || 0,
        distance: result.averageDistance || 0,
        date: new Date().toISOString()
      });
      state.leaderboard = updateLeaderboard(state.leaderboard);
      return state;
    });
  }

  function saveDuelResult(result) {
    updateState((state) => {
      state.lastResult = { type: "duel", ...result };
      state.profile.gamesPlayed += 1;
      if (result.winner === state.profile.name || result.winner === "Player 1") {
        state.profile.duelWins += 1;
      } else {
        state.profile.duelLosses += 1;
      }
      state.profile.favoriteMode = "Duel";
      state.leaderboard.push({
        id: Date.now(),
        player: result.winner,
        mode: "Duel",
        metric: "wins",
        score: 1,
        damage: result.biggestDamage || 0,
        date: new Date().toISOString()
      });
      state.leaderboard = updateLeaderboard(state.leaderboard);
      return state;
    });
  }

  function updateLeaderboard(entries) {
    return [...entries]
      .sort((a, b) => (b.score || 0) - (a.score || 0) || new Date(b.date) - new Date(a.date))
      .slice(0, 50);
  }

  function resetAllData() {
    localStorage.removeItem(KEY);
  }

  window.WorldGuessStorage = {
    getState,
    setState,
    updateState,
    getSettings,
    saveSettings,
    getProfile,
    saveProfile,
    saveSoloResult,
    saveDuelResult,
    updateLeaderboard,
    resetAllData
  };
})();
