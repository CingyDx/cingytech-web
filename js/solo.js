(function () {
  if (document.body.dataset.page !== "solo") return;

  const { locations } = window.WorldGuessData;
  const UI = window.WorldGuessUI;
  const Map = window.WorldGuessMap;
  const Score = window.WorldGuessScoring;
  const Storage = window.WorldGuessStorage;
  const Timer = window.WorldGuessTimer;

  const els = {
    pano: UI.qs("#panorama"),
    map: UI.qs("#guess-map"),
    select: UI.qs("#country-select"),
    timer: UI.qs("#timer"),
    round: UI.qs("#round"),
    streak: UI.qs("#streak"),
    score: UI.qs("#score"),
    guess: UI.qs("#guess-btn"),
    reset: UI.qs("#reset-btn"),
    giveUp: UI.qs("#giveup-btn")
  };

  let session = {
    round: 0,
    streak: 0,
    score: 0,
    totalDistance: 0,
    rounds: [],
    current: null
  };
  let guess = null;
  let mapApi = null;
  let roundTimer = null;

  function randomLocation() {
    const previous = session.current?.id;
    const pool = locations.filter((location) => location.id !== previous);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function renderHud(seconds = 180) {
    UI.setTimerText(els.timer, seconds);
    els.round.textContent = session.round;
    els.streak.textContent = session.streak;
    els.score.textContent = session.score;
  }

  function startRound() {
    session.round += 1;
    session.current = randomLocation();
    guess = null;
    mapApi.resetPin();
    els.select.value = "";
    els.guess.disabled = true;
    Map.renderPanorama(els.pano, session.current);
    renderHud(180);

    if (roundTimer) roundTimer.stop();
    UI.startCountdown(els.pano, () => {
      roundTimer = Timer.createTimer(180, {
        onTick: (seconds) => renderHud(seconds),
        onEnd: () => finishRound(true)
      });
      roundTimer.start();
    });
  }

  function finishRound(timedOut = false) {
    if (roundTimer) roundTimer.stop();
    const current = session.current;
    const missed = timedOut || !guess;
    const distance = missed ? 20000 : Score.haversineDistance(guess.lat, guess.lng, current.lat, current.lng);
    const correct = !missed && Score.isCorrectCountry(guess.countryCode, current.countryCode);
    const points = Score.calculateSoloScore(distance, correct);

    if (correct) {
      session.streak += 1;
      session.score += points;
    }

    session.totalDistance += distance;
    session.rounds.push({
      round: session.round,
      location: current.city,
      country: current.country,
      guess: missed ? "No guess" : guess.country,
      distance,
      correct,
      points
    });

    const best = Storage.getProfile().bestSoloStreak;
    const html = `
      <p class="eyebrow">${correct ? "Correct country" : timedOut ? "Time expired" : "Wrong country"}</p>
      <h2>${correct ? "Nice read." : "Streak broken."}</h2>
      <div class="card-grid" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
        <div class="panel"><p>Correct country</p><h3>${current.country}</h3></div>
        <div class="panel"><p>Your guess</p><h3>${missed ? "No guess" : guess.country}</h3></div>
        <div class="panel"><p>Distance</p><h3>${distance.toLocaleString()} km</h3></div>
        <div class="panel"><p>Streak</p><h3>${session.streak}</h3></div>
      </div>
      <div class="actions">
        ${correct ? `<button class="btn" data-next>Next Round</button>` : `<a class="btn" href="results.html?mode=solo">View Results</a>`}
        <a class="btn-ghost" href="index.html">Back to Menu</a>
        <a class="btn-ghost" href="leaderboard.html">Leaderboard</a>
      </div>
      <p class="mini-note">Best local streak before this run: ${best}</p>
    `;

    if (!correct) {
      Storage.saveSoloResult({
        finalStreak: Math.max(0, session.streak),
        roundsPlayed: session.round,
        averageDistance: Math.round(session.totalDistance / session.rounds.length),
        totalDistance: session.totalDistance,
        rounds: session.rounds
      });
    }

    const modal = UI.openModal(html, { dismissible: false });
    modal.querySelector("[data-next]")?.addEventListener("click", () => {
      UI.closeModal();
      startRound();
    });
  }

  function init() {
    mapApi = Map.createGuessMap(els.map, {
      onChange(value) {
        guess = value;
        els.guess.disabled = !value;
      }
    });
    UI.renderCountrySelect(els.select, (code) => {
      if (code) mapApi.setCountry(code);
    });

    els.guess.addEventListener("click", () => finishRound(false));
    els.reset.addEventListener("click", () => {
      guess = null;
      els.select.value = "";
      mapApi.resetPin();
      els.guess.disabled = true;
    });
    els.giveUp.addEventListener("click", () => finishRound(true));

    startRound();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
