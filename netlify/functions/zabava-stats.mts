import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

type Player = {
  id: string;
  name: string;
  email?: string;
  admin?: boolean;
  dev?: boolean;
};

type Stats = {
  gamesPlayed: number;
  soloGamesPlayed: number;
  duelsPlayed: number;
  duelsWon: number;
  duelsLost: number;
  soloBestScore: number;
  soloBestStreak: number;
  duelWins: number;
  averageDistance: number;
  guesses: number;
  totalGuesses: number;
  totalDistance: number;
  bestGuess: number | null;
  totalDamageDealt: number;
  rating: number | null;
  updatedAt?: string;
};

const STORE_NAME = "zabava-user-stats";
const ADMIN_EMAIL = "krystofcingalek@gmail.com";
const ADMIN_NAME = "👑 Cingy";

declare const Netlify: {
  context?: {
    deploy?: {
      context?: string;
    };
  };
  env?: {
    get?: (name: string) => string | undefined;
  };
};

const defaults: Stats = {
  gamesPlayed: 0,
  soloGamesPlayed: 0,
  duelsPlayed: 0,
  duelsWon: 0,
  duelsLost: 0,
  soloBestScore: 0,
  soloBestStreak: 0,
  duelWins: 0,
  averageDistance: 0,
  guesses: 0,
  totalGuesses: 0,
  totalDistance: 0,
  bestGuess: null,
  totalDamageDealt: 0,
  rating: null
};

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function getDeployContext() {
  try {
    return Netlify?.context?.deploy?.context || Netlify?.env?.get?.("CONTEXT") || "dev";
  } catch {
    return "dev";
  }
}

function isLocalDevRequest(req: Request) {
  if (getDeployContext() === "production") return false;
  const host = req.headers.get("host") || "";
  return /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
}

function isAdminEmail(email?: string) {
  return String(email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

function playerName(email: string | undefined, fallback: string) {
  return isAdminEmail(email) ? ADMIN_NAME : fallback;
}

async function currentPlayer(req: Request): Promise<Player | null> {
  try {
    const identity = await import("@netlify/identity");
    const user: any = await identity.getUser();
    if (user) {
      const email = user.email || "";
      const fallback = user.name || user.user_metadata?.full_name || email.split("@")[0] || "Player";
      return { id: user.id || user.sub || email, email, name: playerName(email, fallback), admin: isAdminEmail(email) };
    }
  } catch {
    // Local Netlify dev uses explicit dev headers because Identity is not fully emulated.
  }

  const devId = req.headers.get("x-streetguess-dev-user");
  if (isLocalDevRequest(req) && devId) {
    const email = req.headers.get("x-streetguess-dev-email") || `${devId}@local.streetguess`;
    const fallback = req.headers.get("x-streetguess-dev-name") || "Local Player";
    return {
      id: devId,
      name: playerName(email, fallback),
      email,
      admin: isAdminEmail(email),
      dev: true
    };
  }

  return null;
}

function statsStore() {
  return getStore(STORE_NAME, { consistency: "strong" });
}

function statsKey(player: Player) {
  return `users/${player.id}/stats`;
}

async function readStats(player: Player) {
  const stored = await statsStore().get(statsKey(player), { type: "json" }) as Partial<Stats> | null;
  return { ...defaults, ...(stored || {}) };
}

function mergeStats(current: Stats, delta: Partial<Stats>) {
  const next = { ...defaults, ...current };
  const additive: Array<keyof Stats> = [
    "gamesPlayed",
    "soloGamesPlayed",
    "duelsPlayed",
    "duelsWon",
    "duelsLost",
    "totalGuesses",
    "totalDistance",
    "totalDamageDealt"
  ];

  additive.forEach((key) => {
    const value = Number(delta[key]);
    if (Number.isFinite(value) && value > 0) {
      (next as any)[key] = Number(next[key] || 0) + value;
    }
  });

  next.soloBestScore = Math.max(Number(next.soloBestScore || 0), Number(delta.soloBestScore || 0));
  next.soloBestStreak = Math.max(Number(next.soloBestStreak || 0), Number(delta.soloBestStreak || 0));
  next.duelWins = next.duelsWon;
  next.guesses = next.totalGuesses;
  next.averageDistance = next.totalGuesses ? Math.round(next.totalDistance / next.totalGuesses) : 0;

  const bestGuess = Number(delta.bestGuess);
  if (Number.isFinite(bestGuess) && bestGuess > 0) {
    next.bestGuess = next.bestGuess === null ? bestGuess : Math.min(next.bestGuess, bestGuess);
  }

  next.updatedAt = new Date().toISOString();
  return next;
}

function validateStatsDelta(body: any): Partial<Stats> | null {
  const clientEventId = String(body?.clientEventId || "").trim();
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(clientEventId)) return null;

  // Client submitted score deltas are not authoritative enough for remote profile stats.
  // Keep GET support active, but reject writes until stats are derived server-side.
  return null;
}

export default async (req: Request) => {
  const player = await currentPlayer(req);
  if (!player) return json({ error: "Login required" }, 401);

  if (req.method === "GET") {
    return json({ player: { name: player.name, email: player.email, admin: Boolean(player.admin) }, stats: await readStats(player) });
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const delta = validateStatsDelta(body);
    if (!delta) return json({ error: "Server-side stat recording is temporarily disabled" }, 403);
    const next = mergeStats(await readStats(player), delta);
    await statsStore().setJSON(statsKey(player), next);
    return json({ player: { name: player.name, email: player.email, admin: Boolean(player.admin) }, stats: next });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: [
    "/api/cingyfun/streetguess/stats",
    "/api/zabava/stats"
  ]
};
