(function () {
  let activeRoom = null;
  let pollTimer = null;
  let deadlineTimer = null;
  let currentLocationId = null;
  let lastSummaryKey = "";
  let submittingDeadline = false;

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(await GameAuth.authHeaders()),
      ...(options.headers || {})
    };
    const response = await fetch(path, {
      method: options.method || "GET",
      headers,
      credentials: "same-origin",
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    return data;
  }

  async function initLobby() {
    const root = UI.qs("#online-lobby");
    if (!root) return;

    await GameAuth.init();
    const user = await GameAuth.getUser();
    renderLobbyAuth(user);
    if (!user) return;

    UI.qs("#create-room-btn")?.addEventListener("click", createRoom);
    UI.qs("#join-room-form")?.addEventListener("submit", joinRoom);
    UI.qs("#start-room-btn")?.addEventListener("click", startRoomFromLobby);
    UI.qs("#logout-lobby-btn")?.addEventListener("click", async () => {
      await GameAuth.logout();
      location.href = "login.html";
    });
  }

  function renderLobbyAuth(user) {
    const authBox = UI.qs("#lobby-auth");
    const actions = UI.qs("#lobby-actions");
    if (!authBox || !actions) return;

    if (!user) {
      actions.classList.add("hidden");
      authBox.innerHTML = `
        <p class="eyebrow">Login required</p>
        <h2>Online duel needs a game account.</h2>
        <p class="muted">The account is only for /zabava games.</p>
        <a class="btn" href="login.html">Log In / Sign Up</a>
      `;
      return;
    }

    actions.classList.remove("hidden");
    authBox.innerHTML = `
      <p class="eyebrow">Logged in</p>
      <h2>${user.name || user.email}</h2>
      <p class="muted">${GameAuth.authNote()}</p>
      <button class="btn secondary" id="logout-lobby-btn" type="button">Log Out</button>
    `;
  }

  async function createRoom() {
    try {
      const data = await api("/api/zabava/rooms", { method: "POST" });
      activeRoom = data.room;
      sessionStorage.setItem("streetguess-room", activeRoom.code);
      renderLobbyRoom(activeRoom);
      startLobbyPolling(activeRoom.code);
    } catch (error) {
      UI.toast(error.message);
    }
  }

  async function joinRoom(event) {
    event.preventDefault();
    const input = UI.qs("#join-code");
    const code = input.value.trim().toUpperCase();
    if (!code) return;
    try {
      const data = await api(`/api/zabava/rooms/${code}/join`, { method: "POST" });
      sessionStorage.setItem("streetguess-room", data.room.code);
      location.href = `duel.html?room=${data.room.code}`;
    } catch (error) {
      UI.toast(error.message);
    }
  }

  async function startRoomFromLobby() {
    if (!activeRoom) return;
    try {
      const data = await api(`/api/zabava/rooms/${activeRoom.code}/start`, { method: "POST" });
      sessionStorage.setItem("streetguess-room", data.room.code);
      location.href = `duel.html?room=${data.room.code}`;
    } catch (error) {
      UI.toast(error.message);
    }
  }

  function startLobbyPolling(code) {
    window.clearInterval(pollTimer);
    pollTimer = window.setInterval(async () => {
      try {
        const data = await api(`/api/zabava/rooms/${code}`);
        activeRoom = data.room;
        renderLobbyRoom(activeRoom);
        if (activeRoom.status !== "waiting") {
          location.href = `duel.html?room=${activeRoom.code}`;
        }
      } catch (error) {
        UI.qs("#room-status").textContent = error.message;
      }
    }, 2200);
  }

  function renderLobbyRoom(room) {
    const panel = UI.qs("#room-panel");
    if (!panel) return;
    panel.classList.remove("hidden");
    panel.innerHTML = `
      <p class="eyebrow">Room code</p>
      <h2>${room.code}</h2>
      <p class="muted">${room.players.player2 ? `${room.players.player2.name} joined. Start when ready.` : "Send this code to your friend."}</p>
      <div class="result-grid">
        <div class="metric"><span>Player 1</span><strong>${room.players.player1.name}</strong></div>
        <div class="metric"><span>Player 2</span><strong>${room.players.player2?.name || "Waiting"}</strong></div>
      </div>
    `;
    const start = UI.qs("#start-room-btn");
    if (start) start.disabled = !room.players.player2;
    UI.qs("#room-status").textContent = room.players.player2 ? "Ready for online duel." : "Waiting for friend to join...";
  }

  async function initOnlineDuel() {
    if (!UI.qs("#pano") || !UI.qs("#duel-guess-btn")) return;

    await GameAuth.init();
    const user = await GameAuth.getUser();
    if (!user) {
      location.href = "login.html";
      return;
    }

    const code = new URLSearchParams(location.search).get("room") || sessionStorage.getItem("streetguess-room");
    if (!code) {
      location.href = "duel-lobby.html";
      return;
    }

    try {
      await GoogleLoader.loadGoogleMaps();
      GameMaps.initGuessMap({ onPin: updateGuessButton });
      document.addEventListener("streetguess:pin", () => updateGuessButton());
      UI.qs("#duel-guess-btn").addEventListener("click", submitGuess);
      UI.qs("#reset-pin-btn").addEventListener("click", () => {
        GameMaps.resetGuessMarker();
        updateGuessButton();
      });
      await pollRoom(code, true);
      window.clearInterval(pollTimer);
      pollTimer = window.setInterval(() => pollRoom(code), 1800);
    } catch (error) {
      if (error.message.includes("Login")) {
        location.href = "login.html";
        return;
      }
      if (!GoogleLoader.hasMissingKey()) UI.toast(error.message);
    }
  }

  async function pollRoom(code, firstLoad = false) {
    const data = await api(`/api/zabava/rooms/${code}`);
    activeRoom = data.room;
    renderDuelRoom(firstLoad);
  }

  async function renderDuelRoom(firstLoad = false) {
    const room = activeRoom;
    if (!room) return;

    updateHud(room);
    updateGuessButton();

    if (room.status === "waiting") {
      setStatus("Waiting for the second player in the lobby.");
      return;
    }

    if (room.status === "playing" && room.location && currentLocationId !== room.location.id) {
      currentLocationId = room.location.id;
      GameMaps.resetGuessMarker();
      UI.closeModal();
      const ok = await StreetViewGame.initStreetView(room.location);
      if (!ok) {
        GoogleLoader.showGoogleSetupError("No Street View panorama found for the selected online round.");
        return;
      }
      setStatus(`Round ${room.round}. Place your guess on the Google map.`);
    }

    if (room.status === "playing") {
      renderPlayingState(room);
      return;
    }

    stopDeadlineTimer();
    if (room.status === "round-summary") {
      showOnlineSummary(room);
      return;
    }

    if (room.status === "finished") {
      finishOnlineDuel(room);
    }
  }

  function renderPlayingState(room) {
    const me = room.meSlot;
    const opponent = me === "player1" ? "player2" : "player1";
    const myGuess = me ? room.guesses[me] : null;
    const opponentGuess = opponent ? room.guesses[opponent] : null;

    if (!me) {
      setStatus("You are watching this room.");
      return;
    }

    if (myGuess) {
      setStatus("Your guess is locked. Waiting for opponent.");
      stopDeadlineTimer();
      return;
    }

    if (opponentGuess && room.deadlineAt) {
      setStatus("Opponent guessed. You have 15 seconds left.");
      startDeadlineTimer(room.deadlineAt);
      return;
    }

    setStatus("Your turn. Place a pin and press Guess.");
    stopDeadlineTimer(false);
  }

  async function submitGuess(missed = false) {
    if (!activeRoom?.meSlot || activeRoom.status !== "playing") return;
    const pin = GameMaps.getGuessLatLng();
    if (!missed && !pin) return;

    try {
      updateGuessButton(true);
      const body = missed ? { missed: true } : { lat: pin.lat(), lng: pin.lng() };
      const data = await api(`/api/zabava/rooms/${activeRoom.code}/guess`, { method: "POST", body });
      activeRoom = data.room;
      renderDuelRoom();
    } catch (error) {
      UI.toast(error.message);
    } finally {
      updateGuessButton(false);
    }
  }

  function startDeadlineTimer(deadlineAt) {
    stopDeadlineTimer(false);
    submittingDeadline = false;
    const timer = UI.qs("#timer");

    deadlineTimer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000));
      UI.setTimer(timer, remaining);
      if (remaining <= 0 && !submittingDeadline) {
        submittingDeadline = true;
        stopDeadlineTimer(false);
        submitGuess(!GameMaps.getGuessLatLng());
      }
    }, 250);
  }

  function stopDeadlineTimer(reset = true) {
    if (deadlineTimer) window.clearInterval(deadlineTimer);
    deadlineTimer = null;
    if (reset) {
      const timer = UI.qs("#timer");
      timer.textContent = "ONLINE";
      timer.classList.remove("timer-danger");
    }
  }

  function showOnlineSummary(room) {
    const key = `${room.round}-${room.roundResult?.resolvedAt}`;
    if (lastSummaryKey === key) return;
    lastSummaryKey = key;

    const result = room.roundResult;
    const winnerName = result.winnerSlot ? room.players[result.winnerSlot].name : "Tie";
    const loserName = result.loserSlot === "player1" || result.loserSlot === "player2" ? room.players[result.loserSlot].name : "Nobody";
    const html = `
      <div class="wide">
        <p class="eyebrow">Round ${room.round} summary</p>
        <h2>${winnerName === "Tie" ? "Round tied" : `${winnerName} wins the round`}</h2>
        <div id="result-map"></div>
        <div class="result-grid">
          <div class="metric"><span>${room.players.player1.name}</span><strong>${result.p1Missed ? "Missed" : `${result.p1Distance} km`}</strong></div>
          <div class="metric"><span>${room.players.player2.name}</span><strong>${result.p2Missed ? "Missed" : `${result.p2Distance} km`}</strong></div>
          <div class="metric"><span>Damage</span><strong class="damage-pop">${result.damage.finalDamage}</strong></div>
          <div class="metric"><span>Multiplier</span><strong>${result.damage.multiplier}x</strong></div>
        </div>
        <p class="muted">${loserName} takes ${result.damage.finalDamage} damage. Correct country: ${result.country}.</p>
        <div class="button-row">
          <button class="btn" id="next-online-round-btn" type="button">Next Round</button>
          <a class="btn secondary" href="duel-lobby.html">New Room</a>
        </div>
      </div>
    `;
    UI.modal(html, false);
    showOnlineResultMap(room);
    UI.qs("#next-online-round-btn")?.addEventListener("click", nextRound);
  }

  async function nextRound() {
    if (!activeRoom) return;
    try {
      const data = await api(`/api/zabava/rooms/${activeRoom.code}/next`, { method: "POST" });
      activeRoom = data.room;
      UI.closeModal();
      renderDuelRoom();
    } catch (error) {
      UI.toast(error.message);
    }
  }

  function showOnlineResultMap(room) {
    const target = UI.qs("#result-map");
    if (!target || !room.location) return;
    const correct = { lat: room.location.lat, lng: room.location.lng };
    const map = new google.maps.Map(target, {
      center: correct,
      zoom: 2,
      clickableIcons: false,
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false
    });
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(correct);
    new google.maps.Marker({ map, position: correct, title: "Correct location", label: "C" });
    drawGuess(room, map, bounds, "player1", "#1de9b6", "1");
    drawGuess(room, map, bounds, "player2", "#ff4d5e", "2");
    map.fitBounds(bounds, 80);
  }

  function drawGuess(room, map, bounds, slot, color, label) {
    const guess = room.guesses[slot];
    if (!guess || guess.missed || !Number.isFinite(guess.lat) || !Number.isFinite(guess.lng)) return;
    const position = { lat: guess.lat, lng: guess.lng };
    bounds.extend(position);
    new google.maps.Marker({ map, position, title: room.players[slot].name, label });
    new google.maps.Polyline({
      map,
      path: [{ lat: room.location.lat, lng: room.location.lng }, position],
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 0.95,
      strokeWeight: 3
    });
  }

  function finishOnlineDuel(room) {
    const winner = room.winnerSlot ? room.players[room.winnerSlot].name : "Tie";
    Store.saveDuelResult({
      winner,
      player1: room.players.player1.name,
      player2: room.players.player2?.name || "Player 2",
      hp1: room.hp1,
      hp2: room.hp2,
      rounds: room.round,
      biggestDamage: Math.max(...room.history.map((entry) => entry.damage?.finalDamage || 0), 0)
    });
    window.clearInterval(pollTimer);
    location.href = "results.html";
  }

  function updateHud(room) {
    UI.qs("#player1-name").textContent = room.players.player1.name;
    UI.qs("#player2-name").textContent = room.players.player2?.name || "Waiting";
    UI.qs("#player1-hp").textContent = room.hp1;
    UI.qs("#player2-hp").textContent = room.hp2;
    UI.qs("#round").textContent = room.round;
    UI.qs("#multiplier").textContent = `${room.multiplier || Scoring.getDuelMultiplier(Math.max(1, room.round))}x`;
    UI.qs("#player1-fill").style.width = `${Math.max(0, room.hp1 / 6000 * 100)}%`;
    UI.qs("#player2-fill").style.width = `${Math.max(0, room.hp2 / 6000 * 100)}%`;
    UI.qs("#player1-fill").classList.toggle("danger-zone", room.hp1 < 2000);
    UI.qs("#player2-fill").classList.toggle("danger-zone", room.hp2 < 2000);
  }

  function updateGuessButton(forceDisable = false) {
    const button = UI.qs("#duel-guess-btn");
    if (!button) return;
    const me = activeRoom?.meSlot;
    const alreadyGuessed = me && activeRoom?.guesses?.[me];
    button.disabled = forceDisable
      || !activeRoom
      || activeRoom.status !== "playing"
      || !me
      || Boolean(alreadyGuessed)
      || !GameMaps.getGuessLatLng();
  }

  function setStatus(message) {
    UI.qs("#duel-status").textContent = message;
  }

  document.addEventListener("DOMContentLoaded", () => {
    initLobby();
    initOnlineDuel();
  });

  window.OnlineDuel = { initLobby, initOnlineDuel };
})();
