(function () {
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  function calculateScore(distanceKm) {
    return Math.max(0, Math.min(5000, Math.round(5000 * Math.exp(-distanceKm / 2000))));
  }

  function getDuelMultiplier(round) {
    return round < 5 ? 1 : 1 + ((round - 4) * 0.5);
  }

  function calculateDuelDamage(distanceA, distanceB, round, playerAMissed = false, playerBMissed = false) {
    const multiplier = 1;
    const scoreA = playerAMissed ? 0 : calculateScore(distanceA);
    const scoreB = playerBMissed ? 0 : calculateScore(distanceB);
    const baseDamage = Math.abs(scoreA - scoreB);

    if (baseDamage <= 0) {
      return { loser: "tie", winner: "tie", scoreA, scoreB, baseDamage: 0, multiplier, finalDamage: 0 };
    }

    const loser = scoreA < scoreB ? "player1" : "player2";
    const winner = scoreA < scoreB ? "player2" : "player1";
    return {
      loser,
      winner,
      scoreA,
      scoreB,
      baseDamage,
      multiplier,
      finalDamage: baseDamage
    };
  }

  function sameCountry(a, b) {
    return String(a || "").toUpperCase() === String(b || "").toUpperCase();
  }

  window.Scoring = {
    haversineDistance,
    calculateScore,
    getDuelMultiplier,
    calculateDuelDamage,
    sameCountry
  };
  window.haversineDistance = haversineDistance;
  window.calculateScore = calculateScore;
  window.getDuelMultiplier = getDuelMultiplier;
  window.calculateDuelDamage = calculateDuelDamage;
  window.isCorrectCountry = sameCountry;
})();
