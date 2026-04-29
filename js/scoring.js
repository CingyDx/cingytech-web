(function () {
  function toRad(value) {
    return value * Math.PI / 180;
  }

  function haversineDistance(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(earthRadiusKm * c);
  }

  function isCorrectCountry(guessCountryCode, locationCountryCode) {
    return String(guessCountryCode || "").toUpperCase() === String(locationCountryCode || "").toUpperCase();
  }

  function getDuelMultiplier(round) {
    return round < 5 ? 1 : 1 + ((round - 4) * 0.5);
  }

  function calculateSoloScore(distanceKm, correct) {
    if (!correct) return 0;
    return Math.max(100, Math.round(5000 - Math.min(4900, distanceKm * 2)));
  }

  function calculateDuelDamage(distanceA, distanceB, round, playerAMissed, playerBMissed) {
    const multiplier = getDuelMultiplier(round);

    if (playerAMissed && playerBMissed) {
      return { loser: "tie", winner: "tie", baseDamage: 0, multiplier, finalDamage: 0 };
    }

    if (playerAMissed || playerBMissed) {
      const loser = playerAMissed ? "player1" : "player2";
      const winner = playerAMissed ? "player2" : "player1";
      const finalDamage = Math.round(2000 * multiplier);
      return { loser, winner, baseDamage: 2000, multiplier, finalDamage };
    }

    const diff = Math.abs(distanceA - distanceB);
    if (diff < 1) {
      return { loser: "tie", winner: "tie", baseDamage: 0, multiplier, finalDamage: 0 };
    }

    const loser = distanceA > distanceB ? "player1" : "player2";
    const winner = distanceA > distanceB ? "player2" : "player1";
    const baseDamage = Math.min(2500, Math.max(50, diff * 1.5));
    const finalDamage = Math.max(0, Math.round(baseDamage * multiplier));

    return { loser, winner, baseDamage: Math.round(baseDamage), multiplier, finalDamage };
  }

  window.WorldGuessScoring = {
    haversineDistance,
    getDuelMultiplier,
    calculateDuelDamage,
    calculateSoloScore,
    isCorrectCountry
  };
})();
