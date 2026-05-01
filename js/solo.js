(function () {
  const state = {
    round: 0,
    streak: 0,
    totalScore: 0,
    currentLocation: null,
    timer: null,
    locked: false,
    lastLocationId: null
  };

  async function startGame() {
    try {
      await GoogleLoader.loadGoogleMaps();
      GameMaps.initGuessMap({
        onPin: () => updateGuessButton()
      });
      UI.qs("#guess-btn")?.addEventListener("click", handleGuess);
      UI.qs("#reset-pin-btn")?.addEventListener("click", () => {
        GameMaps.resetGuessMarker();
        updateGuessButton();
      });
      UI.qs("#give-up-btn")?.addEventListener("click", () => handleRoundFail("No guess"));
      await startRound();
    } catch (error) {
      if (!GoogleLoader.hasMissingKey()) {
        GoogleLoader.showGoogleSetupError(error.message || "Google Maps could not be started.");
      }
    }
  }

  async function startRound() {
    state.locked = false;
    state.round += 1;
    GameMaps.resetGuessMarker();
    updateGuessButton();
    updateHud();
    showRoundIntro(`Round ${state.round}`);

    try {
      state.currentLocation = await StreetViewGame.pickRandomValidLocation(state.lastLocationId);
      state.lastLocationId = state.currentLocation.id;
    } catch (error) {
      GoogleLoader.showGoogleSetupError(error.message);
      return;
    }

    window.setTimeout(() => {
      startTimer();
      hideRoundIntro();
    }, 1000);
  }

  function startTimer() {
    state.timer?.stop();
    const seconds = Store.state().settings.timeLimit || 180;
    state.timer = GameTimer.createTimer(seconds, {
      onTick: (remaining) => UI.setTimer(UI.qs("#timer"), remaining),
      onDone: () => handleRoundFail("Time out")
    });
    state.timer.start();
  }

  function updateHud() {
    UI.qs("#round").textContent = state.round;
    UI.qs("#streak").textContent = state.streak;
    UI.qs("#score").textContent = state.totalScore;
  }

  function updateGuessButton() {
    const button = UI.qs("#guess-btn");
    if (!button) return;
    button.disabled = !GameMaps.getGuessLatLng() || state.locked;
  }

  async function handleGuess() {
    if (state.locked) return;
    const guess = GameMaps.getGuessLatLng();
    if (!guess) return;
    await resolveRound(guess);
  }

  async function handleRoundFail(reason) {
    if (state.locked) return;
    state.locked = true;
    state.timer?.stop();
    state.streak = 0;
    updateHud();
    const location = state.currentLocation;
    const result = {
      correct: false,
      reason,
      distance: 0,
      score: 0,
      totalScore: state.totalScore,
      streak: state.streak,
      correctCountry: location?.country || "Unknown",
      guessCountry: "Unknown"
    };
    Store.saveSoloResult(result);
    showSoloResult(result, null);
  }

  async function resolveRound(guessLatLng) {
    state.locked = true;
    state.timer?.stop();
    updateGuessButton();

    const location = state.currentLocation;
    const distance = Scoring.haversineDistance(
      location.lat,
      location.lng,
      guessLatLng.lat(),
      guessLatLng.lng()
    );
    const score = Scoring.calculateScore(distance);
    const country = await GameMaps.reverseGeocodeCountry(guessLatLng);
    const correct = Scoring.sameCountry(country.code, location.countryCode);

    if (correct) {
      state.streak += 1;
      state.totalScore += score;
    } else {
      state.streak = 0;
    }

    updateHud();

    const result = {
      correct,
      distance,
      score,
      totalScore: state.totalScore,
      streak: state.streak,
      correctCountry: location.country,
      guessCountry: country.name,
      correctCode: location.countryCode,
      guessCode: country.code || "Unknown"
    };

    Store.saveSoloResult(result);
    showSoloResult(result, guessLatLng);
  }

  function showSoloResult(result, guessLatLng) {
    const status = result.correct ? "Correct country" : "Wrong country";
    const html = `
      <div class="wide">
        <p class="eyebrow">Round ${state.round} result</p>
        <h2 class="${result.correct ? "status-good" : "status-bad"}">${status}</h2>
        <div id="result-map"></div>
        <div class="result-grid">
          <div class="metric"><span>Distance</span><strong>${result.distance} km</strong></div>
          <div class="metric"><span>Score</span><strong>${result.score}</strong></div>
          <div class="metric"><span>Correct country</span><strong>${result.correctCountry}</strong></div>
          <div class="metric"><span>Your guess</span><strong>${result.guessCountry}</strong></div>
        </div>
        <div class="button-row">
          <button class="btn" id="next-round-btn" type="button">Next Round</button>
          <a class="btn secondary" href="results.html">View Results</a>
          <a class="btn secondary" href="index.html">Back to Menu</a>
        </div>
      </div>
    `;
    UI.modal(html, false);
    GameMaps.showResultMap({ lat: state.currentLocation.lat, lng: state.currentLocation.lng }, guessLatLng);
    UI.qs("#next-round-btn")?.addEventListener("click", () => {
      UI.closeModal();
      startRound();
    });
  }

  function showRoundIntro(text) {
    hideRoundIntro();
    const intro = document.createElement("div");
    intro.className = "round-intro";
    intro.innerHTML = `<div class="round-intro-card"><p class="eyebrow">${text}</p><strong>3</strong><p class="muted">Look around. Find clues. Place your guess.</p></div>`;
    document.body.appendChild(intro);

    const number = intro.querySelector("strong");
    let step = 3;
    const interval = window.setInterval(() => {
      step -= 1;
      if (step <= 0) {
        window.clearInterval(interval);
        number.textContent = "GO";
        return;
      }
      number.textContent = step;
    }, 330);
  }

  function hideRoundIntro() {
    UI.qs(".round-intro")?.remove();
  }

  document.addEventListener("DOMContentLoaded", startGame);

  window.SoloGame = { startGame, startRound, handleGuess };
})();
