(function () {
  const page = document.body.dataset.page;
  if (page !== "duel-lobby" && page !== "duel") return;

  const UI = window.WorldGuessUI;
  const API = window.WorldGuessAPI;
  const GameMap = window.WorldGuessMap;
  const Storage = window.WorldGuessStorage;
  const locationsById = new globalThis.Map(window.WorldGuessData.locations.map((location) => [location.id, location]));

  function initLobby() {
    const profile = Storage.getProfile();
    const p1 = UI.qs("#player1");
    const p2 = UI.qs("#player2");
    const mapPool = UI.qs("#map-pool");
    const ruleset = UI.qs("#ruleset");
    const start = UI.qs("#start-duel");
    const codeInput = UI.qs("#join-code");
    const join = UI.qs("#join-duel");
    const authPanel = UI.qs("#auth-panel");
    const loginForm = UI.qs("#login-form");
    const registerForm = UI.qs("#register-form");
    const auth = API.getAuth();

    p1.value = auth?.user?.displayName || profile.name || "Player 1";
    p2.value = "Online rival";
    authPanel.dataset.online = auth?.token ? "true" : "false";
    authPanel.querySelector("[data-auth-state]").textContent = auth?.token
      ? `Online as ${auth.user.displayName}`
      : "Login or register to create an online duel room.";

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(loginForm);
      try {
        await API.login(data.get("username"), data.get("password"));
        UI.showToast("Logged in.", "success");
        window.location.reload();
      } catch (error) {
        UI.showToast(error.message, "error");
      }
    });

    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(registerForm);
      try {
        await API.register(data.get("username"), data.get("password"));
        UI.showToast("Account ready.", "success");
        window.location.reload();
      } catch (error) {
        UI.showToast(error.message, "error");
      }
    });

    start.addEventListener("click", async () => {
      try {
        await API.ensureAuth(p1.value);
        const response = await API.request("createRoom", {
          mapPool: mapPool.value,
          ruleset: ruleset.value
        });
        window.location.href = `duel.html?room=${encodeURIComponent(response.room.code)}`;
      } catch (error) {
        UI.showToast(error.message, "error");
      }
    });

    join.addEventListener("click", async () => {
      const code = codeInput.value.trim();
      if (!code) {
        UI.showToast("Enter a room code.", "error");
        return;
      }
      try {
        await API.ensureAuth(p1.value);
        await API.request("joinRoom", { code });
        window.location.href = `duel.html?room=${encodeURIComponent(code.toUpperCase())}`;
      } catch (error) {
        UI.showToast(error.message, "error");
      }
    });
  }

  function initDuel() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room");
    const els = {
      room: UI.qs("#room-code"),
      pano: UI.qs("#panorama"),
      map: UI.qs("#guess-map"),
      select: UI.qs("#country-select"),
      guess: UI.qs("#guess-btn"),
      next: UI.qs("#next-round"),
      alert: UI.qs("#round-alert"),
      summary: UI.qs("#summary-panel"),
      p1Name: UI.qs("#p1-name"),
      p2Name: UI.qs("#p2-name"),
      p1Hp: UI.qs("#p1-hp"),
      p2Hp: UI.qs("#p2-hp"),
      p1Fill: UI.qs("#p1-fill"),
      p2Fill: UI.qs("#p2-fill"),
      round: UI.qs("#round"),
      multiplier: UI.qs("#multiplier"),
      timer: UI.qs("#duel-timer")
    };

    let room = null;
    let guess = null;
    let mapApi = null;
    let poller = null;
    let pinSync = null;
    let currentLocationId = null;
    let autoSubmitted = false;

    if (!code) {
      UI.openModal(`<h2>No room code</h2><p class="lead">Start from the duel lobby first.</p><div class="actions"><a class="btn" href="duel-lobby.html">Open Lobby</a></div>`);
      return;
    }

    els.room.textContent = code.toUpperCase();

    function selfPlayer() {
      const auth = API.getAuth();
      return room?.players.find((player) => player.username === auth?.user?.username);
    }

    function renderRoom(nextRoom) {
      room = nextRoom;
      const p1 = room.players.find((player) => player.id === "player1");
      const p2 = room.players.find((player) => player.id === "player2");
      els.p1Name.textContent = p1?.displayName || "Player 1";
      els.p2Name.textContent = p2?.displayName || "Waiting...";
      els.p1Hp.textContent = p1 ? `${p1.hp} HP` : "6000 HP";
      els.p2Hp.textContent = p2 ? `${p2.hp} HP` : "6000 HP";
      els.p1Fill.style.width = `${Math.max(0, (p1?.hp ?? 6000) / 6000 * 100)}%`;
      els.p2Fill.style.width = `${Math.max(0, (p2?.hp ?? 6000) / 6000 * 100)}%`;
      els.round.textContent = room.round;
      els.multiplier.textContent = room.round < 5 ? "1x" : `${1 + ((room.round - 4) * 0.5)}x`;
      els.next.hidden = room.status !== "result";

      const self = selfPlayer();
      els.guess.disabled = !guess || room.status !== "playing" || !self || self.submitted;
      els.alert.hidden = false;

      if (room.status === "waiting") {
        els.alert.textContent = `Room ${room.code}: waiting for player 2.`;
      } else if (room.status === "playing") {
        if (room.locationId && currentLocationId !== room.locationId) {
          currentLocationId = room.locationId;
          guess = null;
          autoSubmitted = false;
          mapApi.resetPin();
          els.select.value = "";
          GameMap.renderPanorama(els.pano, locationsById.get(room.locationId));
        }
        els.alert.textContent = room.firstGuessBy
          ? "Opponent guessed! 15 seconds left."
          : `${self?.displayName || "Player"} is guessing...`;
      } else if (room.status === "result") {
        renderSummary();
      } else if (room.status === "finished") {
        Storage.saveDuelResult({
          winner: room.winner,
          finalHp: room.lastResult?.hp,
          rounds: room.round,
          biggestDamage: room.lastResult?.damage?.finalDamage || 0,
          history: [room.lastResult]
        });
        window.location.href = "results.html?mode=duel";
      }
    }

    function renderSummary() {
      const result = room.lastResult;
      if (!result) return;
      const winnerName = result.damage.winner === "player1" ? els.p1Name.textContent
        : result.damage.winner === "player2" ? els.p2Name.textContent
          : "Tie";
      els.alert.textContent = "Both guesses locked.";
      els.summary.hidden = false;
      els.summary.innerHTML = `
        <p class="eyebrow">Round summary</p>
        <h3>${winnerName} wins the round</h3>
        <p>Correct location: ${result.country}</p>
        <p>Player 1: ${result.distances.player1.toLocaleString()} km</p>
        <p>Player 2: ${result.distances.player2.toLocaleString()} km</p>
        <h2 class="damage-pop">${result.damage.finalDamage.toLocaleString()} damage</h2>
      `;
    }

    async function poll() {
      try {
        const response = await API.request("getRoom", { code });
        renderRoom(response.room);
      } catch (error) {
        UI.showToast(error.message, "error");
      }
    }

    function tick() {
      if (!room?.turnEndsAt || room.status !== "playing") {
        els.timer.textContent = "--";
        els.timer.classList.remove("danger-pulse");
        return;
      }
      const seconds = Math.max(0, Math.ceil((new Date(room.turnEndsAt).getTime() - Date.now()) / 1000));
      els.timer.textContent = `${seconds}s`;
      els.timer.classList.toggle("danger-pulse", seconds <= 15);
      const self = selfPlayer();
      if (seconds <= 0 && self && !self.submitted && !autoSubmitted) {
        autoSubmitted = true;
        submitGuess();
      }
    }

    function schedulePinSync() {
      window.clearTimeout(pinSync);
      pinSync = window.setTimeout(async () => {
        if (!guess || !room || room.status !== "playing") return;
        try {
          const response = await API.request("setPin", { code, guess });
          renderRoom(response.room);
        } catch {
          // Pin sync is opportunistic.
        }
      }, 350);
    }

    async function submitGuess() {
      if (!room || room.status !== "playing") return;
      try {
        const response = await API.request("submitGuess", { code, guess });
        renderRoom(response.room);
      } catch (error) {
        UI.showToast(error.message, "error");
      }
    }

    async function nextRound() {
      try {
        els.summary.hidden = true;
        const response = await API.request("nextRound", { code });
        renderRoom(response.room);
      } catch (error) {
        UI.showToast(error.message, "error");
      }
    }

    mapApi = GameMap.createGuessMap(els.map, {
      onChange(value) {
        guess = value;
        if (value) schedulePinSync();
        const self = selfPlayer();
        els.guess.disabled = !value || room?.status !== "playing" || self?.submitted;
      }
    });
    UI.renderCountrySelect(els.select, (countryCode) => {
      if (countryCode) mapApi.setCountry(countryCode);
    });
    els.guess.addEventListener("click", submitGuess);
    els.next.addEventListener("click", nextRound);

    poll();
    poller = window.setInterval(poll, 1800);
    window.setInterval(tick, 250);
    window.addEventListener("beforeunload", () => window.clearInterval(poller));
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (page === "duel-lobby") initLobby();
    if (page === "duel") initDuel();
  });
})();
