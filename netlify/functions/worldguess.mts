import type { Config, Context } from "@netlify/functions";
import { getDeployStore, getStore } from "@netlify/blobs";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

type JsonRecord = Record<string, unknown>;
type Store = ReturnType<typeof getStore>;
type NetlifyGlobal = {
  env?: { get(name: string): string | undefined };
  context?: { deploy?: { context?: string } };
};

type UserRecord = {
  username: string;
  displayName: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
};

type SessionRecord = {
  token: string;
  username: string;
  createdAt: string;
};

type Guess = {
  countryCode: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  missed?: boolean;
  submittedAt?: string;
};

type DuelPlayer = {
  id: "player1" | "player2";
  username: string;
  displayName: string;
  hp: number;
  guess: Guess | null;
  pendingGuess: Guess | null;
};

type DuelRoom = {
  code: string;
  status: "waiting" | "playing" | "result" | "finished";
  mapPool: string;
  ruleset: string;
  round: number;
  locationId: string | null;
  players: DuelPlayer[];
  firstGuessBy: string | null;
  turnEndsAt: string | null;
  lastResult: JsonRecord | null;
  winner: string | null;
  createdAt: string;
  updatedAt: string;
};

const STORE_NAME = "worldguess";
const MAX_HP = 6000;
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const LOCATIONS = [
  { id: "cz-prague-suburb", country: "Czech Republic", countryCode: "CZ", lat: 50.0755, lng: 14.4378, mapPool: ["World", "Europe", "City Mix"] },
  { id: "de-bavaria-road", country: "Germany", countryCode: "DE", lat: 48.1351, lng: 11.582, mapPool: ["World", "Europe", "City Mix"] },
  { id: "fr-provence-lane", country: "France", countryCode: "FR", lat: 43.9352, lng: 6.0679, mapPool: ["World", "Europe"] },
  { id: "es-andalusia", country: "Spain", countryCode: "ES", lat: 37.3891, lng: -5.9845, mapPool: ["World", "Europe", "City Mix"] },
  { id: "it-tuscany", country: "Italy", countryCode: "IT", lat: 43.7711, lng: 11.2486, mapPool: ["World", "Europe", "City Mix"] },
  { id: "pl-krakow", country: "Poland", countryCode: "PL", lat: 50.0647, lng: 19.945, mapPool: ["World", "Europe", "City Mix"] },
  { id: "gb-yorkshire", country: "United Kingdom", countryCode: "GB", lat: 53.9583, lng: -1.0803, mapPool: ["World", "Europe", "City Mix"] },
  { id: "us-arizona", country: "United States", countryCode: "US", lat: 34.0489, lng: -111.0937, mapPool: ["World", "City Mix"] },
  { id: "ca-banff", country: "Canada", countryCode: "CA", lat: 51.1784, lng: -115.5708, mapPool: ["World"] },
  { id: "br-rio", country: "Brazil", countryCode: "BR", lat: -22.9068, lng: -43.1729, mapPool: ["World", "City Mix"] },
  { id: "jp-tokyo", country: "Japan", countryCode: "JP", lat: 35.6762, lng: 139.6503, mapPool: ["World", "City Mix"] },
  { id: "kr-seoul", country: "South Korea", countryCode: "KR", lat: 37.5665, lng: 126.978, mapPool: ["World", "City Mix"] },
  { id: "au-outback", country: "Australia", countryCode: "AU", lat: -25.2744, lng: 133.7751, mapPool: ["World"] },
  { id: "za-cape-town", country: "South Africa", countryCode: "ZA", lat: -33.9249, lng: 18.4241, mapPool: ["World", "City Mix"] },
  { id: "no-fjord", country: "Norway", countryCode: "NO", lat: 60.3913, lng: 5.3221, mapPool: ["World", "Europe"] },
  { id: "se-stockholm", country: "Sweden", countryCode: "SE", lat: 59.3293, lng: 18.0686, mapPool: ["World", "Europe", "City Mix"] },
  { id: "fi-lapland", country: "Finland", countryCode: "FI", lat: 66.5039, lng: 25.7294, mapPool: ["World", "Europe"] },
  { id: "mx-oaxaca", country: "Mexico", countryCode: "MX", lat: 17.0732, lng: -96.7266, mapPool: ["World", "City Mix"] },
  { id: "ar-buenos-aires", country: "Argentina", countryCode: "AR", lat: -34.6037, lng: -58.3816, mapPool: ["World", "City Mix"] },
  { id: "nz-queenstown", country: "New Zealand", countryCode: "NZ", lat: -45.0312, lng: 168.6626, mapPool: ["World"] }
];

function netlify(): NetlifyGlobal | undefined {
  return (globalThis as typeof globalThis & { Netlify?: NetlifyGlobal }).Netlify;
}

function store(): Store {
  const n = netlify();
  const context = n?.context?.deploy?.context ?? n?.env?.get("CONTEXT");
  if (context === "production") return getStore({ name: STORE_NAME, consistency: "strong" });
  return getDeployStore({ name: `${STORE_NAME}-dev` });
}

function json(data: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function body(req: Request): Promise<JsonRecord> {
  try {
    const data = await req.json();
    return isRecord(data) ? data : {};
  } catch {
    return {};
  }
}

function str(data: JsonRecord, key: string): string {
  return typeof data[key] === "string" ? data[key] as string : "";
}

function normalizeUsername(value: string): string {
  return value.trim().normalize("NFKC").toLowerCase();
}

function hash(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

function token(): string {
  return randomBytes(32).toString("hex");
}

function userKey(username: string): string {
  return `users/${encodeURIComponent(normalizeUsername(username))}`;
}

function sessionKey(value: string): string {
  return `sessions/${encodeURIComponent(value)}`;
}

function roomKey(code: string): string {
  return `rooms/${code.toUpperCase()}`;
}

function roomCode(): string {
  let code = "";
  for (let i = 0; i < 5; i += 1) code += ROOM_CHARS[randomBytes(1)[0] % ROOM_CHARS.length];
  return code;
}

function publicUser(user: UserRecord): JsonRecord {
  return { username: user.username, displayName: user.displayName };
}

async function readUser(s: Store, username: string): Promise<UserRecord | null> {
  return s.get(userKey(username), { type: "json" }) as Promise<UserRecord | null>;
}

async function requireUser(s: Store, req: Request): Promise<UserRecord | Response> {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return json({ error: "Login required." }, 401);

  const session = await s.get(sessionKey(bearer), { type: "json" }) as SessionRecord | null;
  if (!session) return json({ error: "Session expired." }, 401);

  const user = await readUser(s, session.username);
  return user ?? json({ error: "User not found." }, 401);
}

function cleanGuess(value: unknown): Guess {
  const data = isRecord(value) ? value : {};
  const countryCode = typeof data.countryCode === "string" ? data.countryCode.toUpperCase().slice(0, 3) : null;
  const country = typeof data.country === "string" ? data.country.slice(0, 80) : null;
  const lat = typeof data.lat === "number" && Number.isFinite(data.lat) ? Math.max(-90, Math.min(90, data.lat)) : null;
  const lng = typeof data.lng === "number" && Number.isFinite(data.lng) ? Math.max(-180, Math.min(180, data.lng)) : null;
  return { countryCode, country, lat, lng };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function distance(guess: Guess | null, location: typeof LOCATIONS[number]): number {
  if (!guess || guess.lat === null || guess.lng === null) return 20000;
  return haversine(guess.lat, guess.lng, location.lat, location.lng);
}

function multiplier(round: number): number {
  return round < 5 ? 1 : 1 + ((round - 4) * 0.5);
}

function damage(distanceA: number, distanceB: number, round: number, missedA: boolean, missedB: boolean) {
  const mult = multiplier(round);
  if (missedA && missedB) return { winner: "tie", loser: "tie", baseDamage: 0, multiplier: mult, finalDamage: 0 };
  if (missedA || missedB) {
    return {
      winner: missedA ? "player2" : "player1",
      loser: missedA ? "player1" : "player2",
      baseDamage: 2000,
      multiplier: mult,
      finalDamage: Math.round(2000 * mult)
    };
  }
  const diff = Math.abs(distanceA - distanceB);
  if (diff < 1) return { winner: "tie", loser: "tie", baseDamage: 0, multiplier: mult, finalDamage: 0 };
  const baseDamage = Math.min(2500, Math.max(50, diff * 1.5));
  return {
    winner: distanceA < distanceB ? "player1" : "player2",
    loser: distanceA > distanceB ? "player1" : "player2",
    baseDamage: Math.round(baseDamage),
    multiplier: mult,
    finalDamage: Math.round(baseDamage * mult)
  };
}

function pickLocation(mapPool: string, excludeId?: string | null): string {
  const filtered = LOCATIONS.filter((location) => {
    const poolMatch = mapPool === "Random" || location.mapPool.includes(mapPool);
    return poolMatch && location.id !== excludeId;
  });
  const pool = filtered.length ? filtered : LOCATIONS.filter((location) => location.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

function getLocation(id: string | null) {
  return LOCATIONS.find((location) => location.id === id) ?? LOCATIONS[0];
}

async function readRoom(s: Store, code: string): Promise<DuelRoom | null> {
  return s.get(roomKey(code), { type: "json" }) as Promise<DuelRoom | null>;
}

async function writeRoom(s: Store, room: DuelRoom) {
  room.updatedAt = new Date().toISOString();
  await s.setJSON(roomKey(room.code), room);
}

function publicRoom(room: DuelRoom): JsonRecord {
  return {
    code: room.code,
    status: room.status,
    mapPool: room.mapPool,
    ruleset: room.ruleset,
    round: room.round,
    locationId: room.locationId,
    firstGuessBy: room.firstGuessBy,
    turnEndsAt: room.turnEndsAt,
    lastResult: room.lastResult,
    winner: room.winner,
    players: room.players.map((player) => ({
      id: player.id,
      username: player.username,
      displayName: player.displayName,
      hp: player.hp,
      submitted: Boolean(player.guess),
      hasPin: Boolean(player.pendingGuess)
    }))
  };
}

function beginRound(room: DuelRoom, increment: boolean) {
  room.status = "playing";
  room.round = increment ? room.round + 1 : Math.max(1, room.round);
  room.locationId = pickLocation(room.mapPool, room.locationId);
  room.firstGuessBy = null;
  room.turnEndsAt = null;
  room.lastResult = null;
  room.players.forEach((player) => {
    player.guess = null;
    player.pendingGuess = null;
  });
}

function resolveRound(room: DuelRoom) {
  if (room.status !== "playing" || room.players.length < 2) return;
  const location = getLocation(room.locationId);
  const p1 = room.players[0];
  const p2 = room.players[1];
  const d1 = distance(p1.guess, location);
  const d2 = distance(p2.guess, location);
  const missed1 = !p1.guess || Boolean(p1.guess.missed);
  const missed2 = !p2.guess || Boolean(p2.guess.missed);
  const hit = damage(d1, d2, room.round, missed1, missed2);

  if (hit.loser === "player1") p1.hp = Math.max(0, p1.hp - hit.finalDamage);
  if (hit.loser === "player2") p2.hp = Math.max(0, p2.hp - hit.finalDamage);

  room.lastResult = {
    locationId: location.id,
    country: location.country,
    countryCode: location.countryCode,
    distances: { player1: d1, player2: d2 },
    damage: hit,
    hp: { player1: p1.hp, player2: p2.hp },
    resolvedAt: new Date().toISOString()
  };

  const defeated = room.players.find((player) => player.hp <= 0);
  room.status = defeated ? "finished" : "result";
  room.winner = defeated ? room.players.find((player) => player.hp > 0)?.displayName ?? null : null;
  room.turnEndsAt = null;
}

function resolveExpired(room: DuelRoom): boolean {
  if (room.status !== "playing" || !room.turnEndsAt) return false;
  if (Date.now() <= new Date(room.turnEndsAt).getTime()) return false;
  room.players.forEach((player) => {
    if (!player.guess) {
      player.guess = player.pendingGuess ?? {
        countryCode: null,
        country: null,
        lat: null,
        lng: null,
        missed: true,
        submittedAt: new Date().toISOString()
      };
    }
  });
  resolveRound(room);
  return true;
}

async function register(s: Store, data: JsonRecord) {
  const rawName = str(data, "username");
  const username = normalizeUsername(rawName);
  const password = str(data, "password");
  if (!/^[a-z0-9_.-]{3,20}$/.test(username)) return json({ error: "Username must be 3-20 chars: letters, numbers, dot, dash, underscore." }, 400);
  if (password.length < 4 || password.length > 72) return json({ error: "Password must be 4-72 chars." }, 400);
  if (await readUser(s, username)) return json({ error: "User already exists." }, 409);

  const salt = randomBytes(16).toString("hex");
  const user: UserRecord = {
    username,
    displayName: rawName.trim().slice(0, 20) || username,
    salt,
    passwordHash: hash(password, salt),
    createdAt: new Date().toISOString()
  };
  await s.setJSON(userKey(username), user);
  const authToken = token();
  await s.setJSON(sessionKey(authToken), { token: authToken, username, createdAt: new Date().toISOString() });
  return json({ token: authToken, user: publicUser(user) }, 201);
}

async function login(s: Store, data: JsonRecord) {
  const username = normalizeUsername(str(data, "username"));
  const password = str(data, "password");
  const user = await readUser(s, username);
  if (!user || !safeEqual(user.passwordHash, hash(password, user.salt))) return json({ error: "Invalid username or password." }, 401);
  const authToken = token();
  await s.setJSON(sessionKey(authToken), { token: authToken, username, createdAt: new Date().toISOString() });
  return json({ token: authToken, user: publicUser(user) });
}

async function createRoom(s: Store, user: UserRecord, data: JsonRecord) {
  let code = roomCode();
  for (let i = 0; i < 8 && await readRoom(s, code); i += 1) code = roomCode();
  const now = new Date().toISOString();
  const room: DuelRoom = {
    code,
    status: "waiting",
    mapPool: str(data, "mapPool") || "World",
    ruleset: str(data, "ruleset") || "Moving allowed",
    round: 1,
    locationId: null,
    players: [{ id: "player1", username: user.username, displayName: user.displayName, hp: MAX_HP, guess: null, pendingGuess: null }],
    firstGuessBy: null,
    turnEndsAt: null,
    lastResult: null,
    winner: null,
    createdAt: now,
    updatedAt: now
  };
  await writeRoom(s, room);
  return json({ room: publicRoom(room) }, 201);
}

async function joinRoom(s: Store, user: UserRecord, data: JsonRecord) {
  const code = str(data, "code").toUpperCase().trim();
  const room = await readRoom(s, code);
  if (!room) return json({ error: "Room not found." }, 404);
  if (room.players.some((player) => player.username === user.username)) return json({ room: publicRoom(room) });
  if (room.players.length >= 2 || room.status !== "waiting") return json({ error: "Room is full or already playing." }, 409);
  room.players.push({ id: "player2", username: user.username, displayName: user.displayName, hp: MAX_HP, guess: null, pendingGuess: null });
  beginRound(room, false);
  await writeRoom(s, room);
  return json({ room: publicRoom(room) });
}

async function getRoom(s: Store, data: JsonRecord) {
  const room = await readRoom(s, str(data, "code").toUpperCase().trim());
  if (!room) return json({ error: "Room not found." }, 404);
  if (resolveExpired(room)) await writeRoom(s, room);
  return json({ room: publicRoom(room) });
}

async function setPin(s: Store, user: UserRecord, data: JsonRecord) {
  const room = await readRoom(s, str(data, "code").toUpperCase().trim());
  if (!room) return json({ error: "Room not found." }, 404);
  const player = room.players.find((item) => item.username === user.username);
  if (!player) return json({ error: "You are not in this room." }, 403);
  if (!resolveExpired(room) && room.status === "playing" && !player.guess) player.pendingGuess = cleanGuess(data.guess);
  await writeRoom(s, room);
  return json({ room: publicRoom(room) });
}

async function submitGuess(s: Store, user: UserRecord, data: JsonRecord) {
  const room = await readRoom(s, str(data, "code").toUpperCase().trim());
  if (!room) return json({ error: "Room not found." }, 404);
  if (resolveExpired(room)) {
    await writeRoom(s, room);
    return json({ room: publicRoom(room) });
  }
  if (room.status !== "playing") return json({ error: "Round is not accepting guesses." }, 409);
  const player = room.players.find((item) => item.username === user.username);
  if (!player) return json({ error: "You are not in this room." }, 403);
  if (!player.guess) {
    player.guess = { ...cleanGuess(data.guess), submittedAt: new Date().toISOString() };
    player.pendingGuess = player.guess;
  }
  const count = room.players.filter((item) => item.guess).length;
  if (count === 1) {
    room.firstGuessBy = player.id;
    room.turnEndsAt = new Date(Date.now() + 15000).toISOString();
  }
  if (count >= 2) resolveRound(room);
  await writeRoom(s, room);
  return json({ room: publicRoom(room) });
}

async function nextRound(s: Store, user: UserRecord, data: JsonRecord) {
  const room = await readRoom(s, str(data, "code").toUpperCase().trim());
  if (!room) return json({ error: "Room not found." }, 404);
  if (!room.players.some((player) => player.username === user.username)) return json({ error: "You are not in this room." }, 403);
  if (room.status !== "result") return json({ error: "Next round is available after result." }, 409);
  beginRound(room, true);
  await writeRoom(s, room);
  return json({ room: publicRoom(room) });
}

function mapsConfig() {
  const apiKey = netlify()?.env?.get("GOOGLE_MAPS_BROWSER_KEY")?.trim() ?? "";
  return json({ apiKey, enabled: Boolean(apiKey) });
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return json({ error: "POST only." }, 405);
  const data = await body(req);
  const action = str(data, "action");
  if (action === "mapsConfig") return mapsConfig();

  const s = store();
  if (action === "register") return register(s, data);
  if (action === "login") return login(s, data);

  const userOrResponse = await requireUser(s, req);
  if (userOrResponse instanceof Response) return userOrResponse;
  const user = userOrResponse;

  if (action === "me") return json({ user: publicUser(user) });
  if (action === "createRoom") return createRoom(s, user, data);
  if (action === "joinRoom") return joinRoom(s, user, data);
  if (action === "getRoom") return getRoom(s, data);
  if (action === "setPin") return setPin(s, user, data);
  if (action === "submitGuess") return submitGuess(s, user, data);
  if (action === "nextRound") return nextRound(s, user, data);
  return json({ error: "Unknown action." }, 400);
};

export const config: Config = {
  path: "/api/worldguess"
};
