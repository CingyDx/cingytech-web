const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const publicRoot = path.join(root, "public");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("Netlify publishes only public files and blocks internal repository paths", () => {
  const config = read("netlify.toml");
  assert.match(config, /publish\s*=\s*"public"/);
  assert.doesNotMatch(config, /functions\s*=/);

  const redirects = read("public/_redirects");
  assert.match(redirects, /^\/netlify\/\*\s+\/404\.html\s+404!/m);
  assert.match(redirects, /^\/package\.json\s+\/404\.html\s+404!/m);
  assert.match(redirects, /^\/README\.md\s+\/404\.html\s+404!/m);
  assert.match(redirects, /^\/AGENTS\.md\s+\/404\.html\s+404!/m);
  assert.match(redirects, /^\/deploy\.ps1\s+\/404\.html\s+404!/m);
});

test("legacy game URLs redirect to the work site instead of publishing CingyFun", () => {
  const redirects = read("public/_redirects");
  assert.match(redirects, /^\/zabava\s+\/\s+301$/m);
  assert.match(redirects, /^\/zabava\/\*\s+\/\s+301$/m);
  assert.match(redirects, /^\/cingyfun\s+\/\s+301$/m);
  assert.match(redirects, /^\/cingyfun\/\*\s+\/\s+301$/m);
  assert.match(redirects, /^\/CingyFun\s+\/\s+301$/m);
  assert.match(redirects, /^\/CingyFun\/\*\s+\/\s+301$/m);

  assert.equal(fs.existsSync(path.join(publicRoot, "CingyFun")), false);
  assert.equal(fs.existsSync(path.join(publicRoot, "js")), false);
  assert.equal(fs.existsSync(path.join(publicRoot, "css")), false);
});

test("content security policy is scoped to the static work site", () => {
  const headers = read("public/_headers");
  assert.match(headers, /script-src 'self'/);
  assert.match(headers, /connect-src 'self'/);
  assert.doesNotMatch(headers, /maps\.googleapis|maps\.gstatic|esm\.sh/);
  assert.match(headers, /frame-ancestors 'none'/);
  assert.match(headers, /object-src 'none'/);
});

test("contact form includes bot friction and client-side size limits", () => {
  const kontakt = read("public/pages/kontakt.html");
  const script = read("public/script.js");
  assert.match(kontakt, /data-netlify="true"/);
  assert.match(kontakt, /netlify-honeypot="bot-field"/);
  assert.match(kontakt, /data-netlify-recaptcha="true"/);
  assert.match(kontakt, /maxlength="120"/);
  assert.match(kontakt, /maxlength="160"/);
  assert.match(kontakt, /maxlength="4000"/);
  assert.match(script, /messageValue\.length > 4000/);
});

test("work-site proof is visible and game dependencies are not required", () => {
  const index = read("public/index.html");
  const weby = read("public/pages/tvorba-webu.html");
  const kontakt = read("public/pages/kontakt.html");
  const sluzby = read("public/pages/sluzby.html");
  const css = read("public/style.css");
  const pkg = JSON.parse(read("package.json"));
  assert.match(index, /Baník Rynholec/);
  assert.match(index, /IT servis|hardware/);
  assert.match(index, /hero-1600\.jpg/);
  assert.match(kontakt, /Kontakt pro web nebo IT servis/);
  assert.match(sluzby, /Weby, IT servis a hardware/);
  assert.match(weby, /portfolio-banik-rynholec\.png/);
  assert.match(css, /portfolio-preview img[\s\S]*object-fit: contain/);
  assert.equal(fs.existsSync(path.join(publicRoot, "assets", "portfolio-banik-rynholec.png")), true);

  for (const version of Object.values({ ...pkg.dependencies, ...pkg.devDependencies })) {
    assert.doesNotMatch(version, /latest|\^|~/);
  }
});
