import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { calculateDuelDamage, getDuelMultiplier, haversineDistance } from "./_shared/scoring.mts";
import { locations, type StreetLocation } from "./_shared/locations.mts";

type Player = {
  id: string;
  name: string;
  email?: string;
  dev?: boolean;
};

type Guess = {
  lat?: number;
  lng?: number;
  missed?: boolean;
  at: string;
};

type Room = {
  code: string;
  status: "waiting" | "playing" | "round-summary" | "finished";
  player1: Player;
  player2: Player | null;
  hp1: number;
  hp2: number;
  round: number;
  location: StreetLocation | null;
  firstGuessBy: "player1" | "player2" | null;
  deadlineAt: string | null;
  guesses: { player1: Guess | null; player2: Guess | null };
  roundResult: any | null;
  winnerSlot: "player1" | "player2" | null;
  history: any[];
  createdAt: string;
  updatedAt: string;
};

const START_HP = 6000;
const STORE_NAME = "zabava-rooms";

function roomsStore() {
  return getStore(STORE_NAME, { consistency: "strong" });
}

function roomKey(code: string) {
  return `rooms/${code.toUpperCase()}`;
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getDeployContext() {
  const netlify = (globalThis as any).Netlify;
  return netlify?.context?.deploy?.context || netlify?.env?.get?.("CONTEXT") || "dev";
}

async function currentPlayer(req: Request): Promise<Player | null> {
  try {
    const identity = await import("@netlify/identity");
    const user: any = await identity.getUser();
    if (user) {
      const name = user.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Player";
      return { id: user.id || user.sub || user.email, email: user.email, name };
    }
  } catch {
    // Local Netlify dev currently cannot fully emulate Identity; dev headers handle localhost only.
  }

  const devId = req.headers.get("x-streetguess-dev-user");
  const isProduction = getDeployContext() === "production";
  if (!isProduction && devId) {
    return {
      id: devId,
      name: req.headers.get("x-streetguess-dev-name") || "Local Player",
      email: `${devId}@local.streetguess`,
      dev: true
    };
  }

  return null;
}

async function readRoom(code: string) {
  return await roomsStore().get(roomKey(code), { type: "json" }) as Room | null;
}

async function writeRoom(room: Room) {
  room.updatedAt = new Date().toISOString();
  await roomsStore().setJSON(roomKey(room.code), room);
}

function slotFor(room: Room, player: Player): "player1" | "player2" | null {
  if (room.player1.id === player.id) return "player1";
  if (room.player2?.id === player.id) return "player2";
  return null;
}

function publicRoom(room: Room, player: Player) {
  const meSlot = slotFor(room, player);
  return {
    code: room.code,
    status: room.status,
    meSlot,
    isHost: meSlot === "player1",
    players: {
      player1: { name: room.player1.name },
      player2: room.player2 ? { name: room.player2.name } : null
    },
    hp1: room.hp1,
    hp2: room.hp2,
    round: room.round,
    location: room.status === "waiting" ? null : room.location,
    firstGuessBy: room.firstGuessBy,
    deadlineAt: room.deadlineAt,
    guesses: {
      player1: room.guesses.player1 ? { locked: true, missed: Boolean(room.guesses.player1.missed), lat: room.guesses.player1.lat, lng: room.guesses.player1.lng } : null,
      player2: room.guesses.player2 ? { locked: true, missed: Boolean(room.guesses.player2.missed), lat: room.guesses.player2.lat, lng: room.guesses.player2.lng } : null
    },
    roundResult: room.roundResult,
    winnerSlot: room.winnerSlot,
    multiplier: getDuelMultiplier(Math.max(1, room.round)),
    history: room.history.slice(-12),
    updatedAt: room.updatedAt
  };
}

function pickLocation(previousId?: string) {
  const pool = locations.filter((location) => location.id !== previousId);
  return pool[Math.floor(Math.random() * pool.length)];
}

function beginRound(room: Room) {
  room.status = "playing";
  room.round += 1;
  room.location = pickLocation(room.location?.id);
  room.firstGuessBy = null;
  room.deadlineAt = null;
  room.guesses = { player1: null, player2: null };
  room.roundResult = null;
}

function maybeResolveDeadline(room: Room) {
  if (room.status !== "playing" || !room.deadlineAt) return false;
  if (Date.now() <= new Date(room.deadlineAt).getTime()) return false;

  if (!room.guesses.player1) {
    room.guesses.player1 = { missed: true, at: new Date().toISOString() };
  }
  if (!room.guesses.player2) {
    room.guesses.player2 = { missed: true, at: new Date().toISOString() };
  }
  resolveRound(room);
  return true;
}

function resolveRound(room: Room) {
  if (!room.location) return;

  const p1Missed = !room.guesses.player1 || Boolean(room.guesses.player1.missed);
  const p2Missed = !room.guesses.player2 || Boolean(room.guesses.player2.missed);
  const p1Distance = p1Missed ? 20000 : haversineDistance(room.location.lat, room.location.lng, room.guesses.player1!.lat!, room.guesses.player1!.lng!);
  const p2Distance = p2Missed ? 20000 : haversineDistance(room.location.lat, room.location.lng, room.guesses.player2!.lat!, room.guesses.player2!.lng!);
  const damage = calculateDuelDamage(p1Distance, p2Distance, room.round, p1Missed, p2Missed);

  if (damage.loser === "player1") {
    room.hp1 = Math.max(0, room.hp1 - damage.finalDamage);
  } else if (damage.loser === "player2") {
    room.hp2 = Math.max(0, room.hp2 - damage.finalDamage);
  }

  const winnerSlot = damage.winner === "player1" || damage.winner === "player2" ? damage.winner : null;
  room.roundResult = {
    country: room.location.country,
    countryCode: room.location.countryCode,
    correctLat: room.location.lat,
    correctLng: room.location.lng,
    p1Distance,
    p2Distance,
    p1Missed,
    p2Missed,
    damage,
    winnerSlot,
    loserSlot: damage.loser,
    hp1: room.hp1,
    hp2: room.hp2,
    resolvedAt: new Date().toISOString()
  };
  room.history.push({ round: room.round, ...room.roundResult });

  if (room.hp1 <= 0 || room.hp2 <= 0) {
    room.status = "finished";
    room.winnerSlot = room.hp1 > room.hp2 ? "player1" : "player2";
  } else {
    room.status = "round-summary";
  }
}

async function handleCreate(req: Request) {
  const player = await currentPlayer(req);
  if (!player) return json({ error: "Login required" }, 401);

  const code = randomCode();
  const now = new Date().toISOString();
  const room: Room = {
    code,
    status: "waiting",
    player1: player,
    player2: null,
    hp1: START_HP,
    hp2: START_HP,
    round: 0,
    location: null,
    firstGuessBy: null,
    deadlineAt: null,
    guesses: { player1: null, player2: null },
    roundResult: null,
    winnerSlot: null,
    history: [],
    createdAt: now,
    updatedAt: now
  };

  await writeRoom(room);
  return json({ room: publicRoom(room, player) }, 201);
}

async function handleRoom(req: Request, context: Context) {
  const player = await currentPlayer(req);
  if (!player) return json({ error: "Login required" }, 401);

  const code = String(context.params.code || "").toUpperCase();
  const action = String(context.params.action || "");
  const room = await readRoom(code);
  if (!room) return json({ error: "Room not found" }, 404);

  const method = req.method.toUpperCase();
  const slot = slotFor(room, player);

  if (method === "GET") {
    if (maybeResolveDeadline(room)) await writeRoom(room);
    return json({ room: publicRoom(room, player) });
  }

  if (method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (action === "join") {
    if (!room.player2 && room.player1.id !== player.id) {
      room.player2 = player;
      await writeRoom(room);
    }
    return json({ room: publicRoom(room, player) });
  }

  if (!slot) return json({ error: "You are not in this room" }, 403);

  if (action === "start" || action === "next") {
    if (!room.player2) return json({ error: "Waiting for second player" }, 409);
    if (room.status !== "waiting" && room.status !== "round-summary") {
      return json({ error: "Round is already running" }, 409);
    }
    beginRound(room);
    await writeRoom(room);
    return json({ room: publicRoom(room, player) });
  }

  if (action === "guess") {
    if (maybeResolveDeadline(room)) {
      await writeRoom(room);
      return json({ room: publicRoom(room, player) });
    }
    if (room.status !== "playing") return json({ error: "No active round" }, 409);
    if (room.guesses[slot]) return json({ room: publicRoom(room, player) });

    const body = await req.json().catch(() => ({}));
    const missed = Boolean(body.missed);
    const guess: Guess = missed
      ? { missed: true, at: new Date().toISOString() }
      : { lat: Number(body.lat), lng: Number(body.lng), at: new Date().toISOString() };

    if (!missed && (!Number.isFinite(guess.lat) || !Number.isFinite(guess.lng))) {
      return json({ error: "Invalid guess coordinates" }, 400);
    }

    room.guesses[slot] = guess;
    if (!room.firstGuessBy) {
      room.firstGuessBy = slot;
      room.deadlineAt = new Date(Date.now() + 15000).toISOString();
    }
    if (room.guesses.player1 && room.guesses.player2) {
      resolveRound(room);
    }

    await writeRoom(room);
    return json({ room: publicRoom(room, player) });
  }

  return json({ error: "Unknown room action" }, 404);
}

export default async (req: Request, context: Context) => {
  if (req.method === "POST" && !context.params.code) {
    return handleCreate(req);
  }
  if (context.params.code) {
    return handleRoom(req, context);
  }
  return json({ error: "Not found" }, 404);
};

export const config: Config = {
  path: ["/api/zabava/rooms", "/api/zabava/rooms/:code", "/api/zabava/rooms/:code/:action"]
};
