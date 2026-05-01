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

export function calculateDuelDamage(
  distanceA: number,
  distanceB: number,
  round: number,
  playerAMissed = false,
  playerBMissed = false
) {
  const multiplier = getDuelMultiplier(round);

  if (playerAMissed && playerBMissed) {
    return { loser: "tie", winner: "tie", baseDamage: 0, multiplier, finalDamage: 0 };
  }

  if (playerAMissed || playerBMissed) {
    const loser = playerAMissed ? "player1" : "player2";
    const winner = playerAMissed ? "player2" : "player1";
    return { loser, winner, baseDamage: 2000, multiplier, finalDamage: Math.round(2000 * multiplier) };
  }

  const diff = Math.abs(distanceA - distanceB);
  if (diff < 1) {
    return { loser: "tie", winner: "tie", baseDamage: 0, multiplier, finalDamage: 0 };
  }

  const baseDamage = Math.min(2500, Math.max(50, diff * 1.5));
  return {
    loser: distanceA > distanceB ? "player1" : "player2",
    winner: distanceA > distanceB ? "player2" : "player1",
    baseDamage: Math.round(baseDamage),
    multiplier,
    finalDamage: Math.round(baseDamage * multiplier)
  };
}
