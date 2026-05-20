(function () {
  let activeRoom = null;
  let pollTimer = null;
  let deadlineTimer = null;
  let currentLocationId = null;
  let lastSummaryKey = "";
  let lastFinishKey = "";
  let submittingDeadline = false;
  let deadlineLastSecond = null;
  let activeDeadlineAt = null;

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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function playerLabel(player, fallback = "Player") {
    return player?.name || fallback;
  }

  function playerHtml(player, fallback = "Player") {
    const name = escapeHtml(playerLabel(player, fallback));
    return player?.admin ? `<span class="rainbow-admin">${name}</span>` : name;
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
        <p class="muted">The account is only for CingyFun games.</p>
        <a class="btn" href="login.html">Log In / Sign Up</a>
      `;
      return;
    }

    actions.classList.remove("hidden");
    authBox.innerHTML = `
      <p class="eyebrow">Logged in</p>
      <h2>${user.isAdmin ? `<span class="rainbow-admin">${escapeHtml(user.name)}</span>` : escapeHtml(user.name || user.email)}</h2>
      <p class="muted">${GameAuth.authNote()}</p>
      <button class="btn secondary" id="logout-lobby-btn" type="button">Log Out</button>
    `;
  }

  async function createRoom() {
    try {
      const data = await api("/api/cingyfun/streetguess/rooms", { method: "POST" });
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
      const data = await api(`/api/cingyfun/streetguess/rooms/${code}/join`, { method: "POST" });
      sessionStorage.setItem("streetguess-room", data.room.code);
      location.href = `duel.html?room=${data.room.code}`;
    } catch (error) {
      UI.toast(error.message);
    }
  }

  async function startRoomFromLobby() {
    if (!activeRoom) return;
    try {
      const data = await api(`/api/cingyfun/streetguess/rooms/${activeRoom.code}/start`, { method: "POST" });
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
        const data = await api(`/api/cingyfun/streetguess/rooms/${code}`);
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
      <p class="muted">${room.players.player2 ? `${playerHtml(room.players.player2)} joined. Start when ready.` : "Send this code to your friend."}</p>
      <div class="result-grid">
        <div class="metric"><span>Player 1</span><strong>${playerHtml(room.players.player1)}</strong></div>
        <div class="metric"><span>Player 2</span><strong>${room.players.player2 ? playerHtml(room.players.player2) : "Waiting"}</strong></div>
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
      window.AudioManager?.installUnlock?.();
      window.AudioManager?.startAmbient?.();
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
    const data = await api(`/api/cingyfun/streetguess/rooms/${code}`);
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
      GameMaps.resetRoundMap();
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
      window.AudioManager?.startDrama?.();
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
      window.AudioManager?.guess?.();
      updateGuessButton(true);
      const body = missed ? { missed: true } : { lat: pin.lat(), lng: pin.lng() };
      const data = await api(`/api/cingyfun/streetguess/rooms/${activeRoom.code}/guess`, { method: "POST", body });
      activeRoom = data.room;
      renderDuelRoom();
    } catch (error) {
      UI.toast(error.message);
    } finally {
      updateGuessButton(false);
    }
  }

  function startDeadlineTimer(deadlineAt) {
    if (activeDeadlineAt === deadlineAt && deadlineTimer) return;
    stopDeadlineTimer(false);
    submittingDeadline = false;
    deadlineLastSecond = null;
    activeDeadlineAt = deadlineAt;
    const timer = UI.qs("#timer");

    deadlineTimer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000));
      UI.setTimer(timer, remaining);
      if (remaining !== deadlineLastSecond) {
        deadlineLastSecond = remaining;
        window.AudioManager?.tick?.(remaining);
      }
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
    deadlineLastSecond = null;
    activeDeadlineAt = null;
    window.AudioManager?.stopDrama?.(true);
    if (reset) {
      const timer = UI.qs("#timer");
      timer.textContent = "ONLINE";
      timer.classList.remove("timer-danger");
    }
  }

  function slotDistance(result, slot) {
    return slot === "player1" ? result.p1Distance : result.p2Distance;
  }

  function slotScore(result, slot) {
    const stored = slot === "player1" ? result.p1Score : result.p2Score;
    if (Number.isFinite(stored)) return stored;
    const missed = slot === "player1" ? result.p1Missed : result.p2Missed;
    return missed ? 0 : Scoring.calculateScore(slotDistance(result, slot));
  }

  function slotMissed(result, slot) {
    return slot === "player1" ? result.p1Missed : result.p2Missed;
  }

  function distanceText(result, slot) {
    return slotMissed(result, slot) ? "Missed" : `${slotDistance(result, slot)} km away`;
  }

  function relativeSlotLabel(room, slot) {
    if (room.meSlot === slot) return "You";
    if (room.meSlot && slot !== room.meSlot) return "Opponent";
    return playerLabel(room.players[slot], slot === "player1" ? "Player 1" : "Player 2");
  }

  function relativeSlotHtml(room, slot) {
    if (room.meSlot === slot) return "You";
    if (room.meSlot && slot !== room.meSlot) return "Opponent";
    return playerHtml(room.players[slot], slot === "player1" ? "Player 1" : "Player 2");
  }

  function showOnlineSummary(room) {
    const key = `${room.round}-${room.roundResult?.resolvedAt}`;
    if (lastSummaryKey === key) return;
    lastSummaryKey = key;

    const result = room.roundResult;
    window.AudioManager?.stopDrama?.(true);
    window.AudioManager?.damage?.();
    const mySlot = room.meSlot || "player1";
    const opponentSlot = mySlot === "player1" ? "player2" : "player1";
    const winnerName = result.winnerSlot ? relativeSlotLabel(room, result.winnerSlot) : "Tie";
    const winnerDisplay = result.winnerSlot ? relativeSlotHtml(room, result.winnerSlot) : "Tie";
    const loserName = result.loserSlot === "player1" || result.loserSlot === "player2" ? playerLabel(room.players[result.loserSlot]) : "Nobody";
    const damageTarget = result.loserSlot === "player1" || result.loserSlot === "player2" ? relativeSlotLabel(room, result.loserSlot) : "Nobody";
    const html = `
      <div class="wide">
        <p class="eyebrow">Round ${room.round} summary</p>
        <h2>${winnerName === "Tie" ? "Round tied" : `${winnerDisplay} wins the round`}</h2>
        <div id="result-map"></div>
        <div class="result-grid">
          <div class="metric"><span>${relativeSlotHtml(room, mySlot)}</span><strong>${distanceText(result, mySlot)}</strong></div>
          <div class="metric"><span>${relativeSlotHtml(room, opponentSlot)}</span><strong>${distanceText(result, opponentSlot)}</strong></div>
          <div class="metric"><span>${relativeSlotHtml(room, mySlot)} score</span><strong>${slotScore(result, mySlot)}</strong></div>
          <div class="metric"><span>${relativeSlotHtml(room, opponentSlot)} score</span><strong>${slotScore(result, opponentSlot)}</strong></div>
          <div class="metric"><span>Damage</span><strong class="damage-pop">${result.damage.finalDamage}</strong></div>
          <div class="metric"><span>${playerHtml(room.players.player1)}</span><strong>${result.hp1} HP</strong></div>
          <div class="metric"><span>${playerHtml(room.players.player2)}</span><strong>${result.hp2} HP</strong></div>
          <div class="metric"><span>Correct location</span><strong>${result.country}</strong></div>
        </div>
        <p class="muted">${damageTarget} takes ${result.damage.finalDamage} damage. Correct country: ${result.country}. ${loserName === "Nobody" ? "No HP changed." : ""}</p>
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
      const data = await api(`/api/cingyfun/streetguess/rooms/${activeRoom.code}/next`, { method: "POST" });
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
    new google.maps.Marker({
      map,
      position: correct,
      title: "Correct location",
      label: { text: "C", color: "#071016", fontWeight: "900" },
      icon: markerIcon("#f9c74f", 11)
    });
    drawGuess(room, map, bounds, "player1", markerColor(room, "player1"), markerLabel(room, "player1"));
    drawGuess(room, map, bounds, "player2", markerColor(room, "player2"), markerLabel(room, "player2"));
    map.fitBounds(bounds, 80);
  }

  function markerIcon(color, scale = 9) {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#061016",
      strokeWeight: 2
    };
  }

  function markerColor(room, slot) {
    if (room.meSlot === slot) return "#8ab4f8";
    if (room.meSlot && slot !== room.meSlot) return "#ff4d5e";
    return slot === "player1" ? "#1de9b6" : "#ff4d5e";
  }

  function markerLabel(room, slot) {
    if (room.meSlot === slot) return "Y";
    if (room.meSlot && slot !== room.meSlot) return "O";
    return slot === "player1" ? "1" : "2";
  }

  function drawGuess(room, map, bounds, slot, color, label) {
    const guess = room.guesses[slot];
    if (!guess || guess.missed || !Number.isFinite(guess.lat) || !Number.isFinite(guess.lng)) return;
    const position = { lat: guess.lat, lng: guess.lng };
    bounds.extend(position);
    new google.maps.Marker({
      map,
      position,
      title: relativeSlotLabel(room, slot),
      label: { text: label, color: "#071016", fontWeight: "900" },
      icon: markerIcon(color)
    });
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
    const finishKey = `${room.code}-${room.updatedAt}-${room.winnerSlot}`;
    if (lastFinishKey === finishKey) return;
    lastFinishKey = finishKey;

    const winner = room.winnerSlot ? playerLabel(room.players[room.winnerSlot]) : "Tie";
    const statSummary = summarizeDuelStats(room);
    const saveKey = `streetguess-duel-saved-${room.code}-${room.updatedAt}`;
    if (room.meSlot && !sessionStorage.getItem(saveKey)) {
      const duelResult = {
        winner,
        winnerSlot: room.winnerSlot,
        mySlot: room.meSlot,
        player1: playerLabel(room.players.player1),
        player2: playerLabel(room.players.player2, "Player 2"),
        hp1: room.hp1,
        hp2: room.hp2,
        rounds: room.round,
        biggestDamage: Math.max(...room.history.map((entry) => entry.damage?.finalDamage || 0), 0),
        damageDealt: statSummary.damageDealt,
        guesses: statSummary.guesses,
        totalDistance: statSummary.totalDistance,
        bestGuess: statSummary.bestGuess
      };
      Store.saveDuelResult(duelResult);
      window.ProfileStats?.recordDuel?.(duelResult);
      sessionStorage.setItem(saveKey, "1");
    }

    window.clearInterval(pollTimer);
    stopDeadlineTimer();
    window.AudioManager?.stopDrama?.(false);
    window.AudioManager?.success?.();

    const winnerDisplay = room.winnerSlot ? playerHtml(room.players[room.winnerSlot]) : "Tie";
    UI.modal(`
      <div class="wide">
        <p class="eyebrow">Duel complete</p>
        <h2>${winnerDisplay} wins the duel</h2>
        <div id="result-map"></div>
        <div class="result-grid">
          <div class="metric"><span>${playerHtml(room.players.player1)}</span><strong>${room.hp1} HP</strong></div>
          <div class="metric"><span>${playerHtml(room.players.player2)}</span><strong>${room.hp2} HP</strong></div>
          <div class="metric"><span>Rounds</span><strong>${room.round}</strong></div>
          <div class="metric"><span>Biggest damage</span><strong>${Math.max(...room.history.map((entry) => entry.damage?.finalDamage || 0), 0)}</strong></div>
        </div>
        <div class="button-row">
          <a class="btn" href="results.html">View Results</a>
          <a class="btn secondary" href="duel-lobby.html">New Room</a>
        </div>
      </div>
    `, false);
    showOnlineResultMap(room);
  }

  function summarizeDuelStats(room) {
    const slot = room.meSlot;
    if (!slot) return { damageDealt: 0, guesses: 0, totalDistance: 0, bestGuess: null };

    return (room.history || []).reduce((summary, entry) => {
      const missed = slot === "player1" ? entry.p1Missed : entry.p2Missed;
      const distance = slot === "player1" ? entry.p1Distance : entry.p2Distance;
      if (!missed && Number.isFinite(distance)) {
        summary.guesses += 1;
        summary.totalDistance += distance;
        summary.bestGuess = summary.bestGuess === null ? distance : Math.min(summary.bestGuess, distance);
      }
      if (entry.winnerSlot === slot || entry.damage?.winner === slot) {
        summary.damageDealt += entry.damage?.finalDamage || 0;
      }
      return summary;
    }, { damageDealt: 0, guesses: 0, totalDistance: 0, bestGuess: null });
  }

  function updateHud(room) {
    UI.qs("#player1-name").innerHTML = playerHtml(room.players.player1);
    UI.qs("#player2-name").innerHTML = room.players.player2 ? playerHtml(room.players.player2) : "Waiting";
    UI.qs("#player1-hp").textContent = room.hp1;
    UI.qs("#player2-hp").textContent = room.hp2;
    UI.qs("#round").textContent = room.round;
    UI.qs("#multiplier").textContent = `${room.multiplier || Scoring.getDuelMultiplier(Math.max(1, room.round))}x`;
    UI.qs("#player1-fill").style.width = `${Math.min(100, Math.max(0, room.hp1 / 6000 * 100))}%`;
    UI.qs("#player2-fill").style.width = `${Math.min(100, Math.max(0, room.hp2 / 6000 * 100))}%`;
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
