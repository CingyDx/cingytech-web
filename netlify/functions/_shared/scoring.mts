export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function getDuelMultiplier(round: number) {
  return round < 5 ? 1 : 1 + ((round - 4) * 0.5);
}

export function calculateScore(distanceKm: number) {
  const score = Math.round(5000 * Math.exp(-Math.max(0, distanceKm) / 2000));
  return Math.max(0, Math.min(5000, score));
}

export function calculateDuelDamage(
  distanceA: number,
  distanceB: number,
  round: number,
  playerAMissed = false,
  playerBMissed = false
) {
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
