const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function indexOfOrFail(source, needle) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `Missing expected snippet: ${needle}`);
  return index;
}

test("Netlify publishes only public files and blocks internal repository paths", () => {
  const config = read("netlify.toml");
  assert.match(config, /publish\s*=\s*"public"/);
  assert.match(config, /functions\s*=\s*"netlify\/functions"/);

  const redirects = read("public/_redirects");
  assert.match(redirects, /^\/netlify\/\*\s+\/404\.html\s+404!/m);
  assert.match(redirects, /^\/package\.json\s+\/404\.html\s+404!/m);
  assert.match(redirects, /^\/README\.md\s+\/404\.html\s+404!/m);
  assert.match(redirects, /^\/AGENTS\.md\s+\/404\.html\s+404!/m);
  assert.match(redirects, /^\/deploy\.ps1\s+\/404\.html\s+404!/m);
});

test("legacy zabava StreetGuess redirects do not double-prefix Streetguess", () => {
  const redirects = read("public/_redirects");
  const specific = indexOfOrFail(redirects, "/zabava/Streetguess/*");
  const generic = indexOfOrFail(redirects, "/zabava/*");
  assert.ok(specific < generic, "specific legacy redirect must come before generic /zabava/*");
  assert.match(redirects, /^\/zabava\/Streetguess\/\*\s+\/CingyFun\/Streetguess\/:splat\s+301!/m);
  assert.match(redirects, /^\/zabava\/streetguess\/\*\s+\/CingyFun\/Streetguess\/:splat\s+301!/m);
});

test("dev auth headers are accepted only for local requests", () => {
  const room = read("netlify/functions/zabava-room.mts");
  const stats = read("netlify/functions/zabava-stats.mts");
  for (const source of [room, stats]) {
    assert.match(source, /function isLocalDevRequest\(req: Request\)/);
    assert.match(source, /if \(isLocalDevRequest\(req\) && devId\)/);
    assert.doesNotMatch(source, /!isProduction && devId/);
  }
});

test("room reads require membership before exposing room state", () => {
  const source = read("netlify/functions/zabava-room.mts");
  const slotCheck = indexOfOrFail(source, 'if (!slot) return json({ error: "You are not in this room" }, 403);');
  const getBranch = indexOfOrFail(source, 'if (method === "GET")');
  assert.ok(slotCheck < getBranch, "membership check must happen before GET returns publicRoom");
  assert.doesNotMatch(source, /lat:\s*room\.location\.lat/);
  assert.doesNotMatch(source, /lng:\s*room\.location\.lng/);
});

test("only host can start or advance an online duel", () => {
  const source = read("netlify/functions/zabava-room.mts");
  const branchStart = indexOfOrFail(source, 'if (action === "start" || action === "next")');
  const branchEnd = source.indexOf('if (action === "guess")', branchStart);
  assert.notEqual(branchEnd, -1, "Missing guess branch after start/next branch");
  const branch = source.slice(branchStart, branchEnd);
  assert.match(branch, /slot !== "player1"/);
});

test("stats endpoint does not trust arbitrary client deltas", () => {
  const source = read("netlify/functions/zabava-stats.mts");
  assert.doesNotMatch(source, /body\.delta\s*\|\|\s*\{\}/);
  assert.match(source, /validateStatsDelta/);
  assert.match(source, /clientEventId/);
});

test("stored CingyFun result values are escaped before HTML rendering", () => {
  const app = read("public/js/app.js");
  assert.match(app, /function escapeHtml\(value\)/);
  assert.match(app, /escapeHtml\(entry\.player \|\| "You"\)/);
  assert.match(app, /escapeHtml\(result\.winner \|\| "Tie"\)/);
  assert.match(app, /escapeHtml\(result\.player1 \|\| "Player 1"\)/);
  assert.match(app, /escapeHtml\(result\.player2 \|\| "Player 2"\)/);
});

test("auth dependency is local and package versions are pinned", () => {
  const auth = read("public/js/auth.js");
  const pkg = JSON.parse(read("package.json"));
  assert.doesNotMatch(auth, /https:\/\/esm\.sh/);
  assert.match(auth, /\/js\/vendor\/netlify-identity\.js/);
  for (const version of Object.values({ ...pkg.dependencies, ...pkg.devDependencies })) {
    assert.doesNotMatch(version, /latest|\^|~/);
  }
  assert.ok(fs.existsSync(path.join(root, "package-lock.json")), "package-lock.json must be committed");
});

test("contact form has stronger bot friction and server-side size limits", () => {
  const kontakt = read("public/pages/kontakt.html");
  const script = read("public/script.js");
  assert.match(kontakt, /data-netlify-recaptcha="true"/);
  assert.match(kontakt, /maxlength="120"/);
  assert.match(kontakt, /maxlength="4000"/);
  assert.match(script, /messageValue\.length > 4000/);
});
