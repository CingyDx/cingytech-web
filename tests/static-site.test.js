const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const publicRoot = path.join(root, "public");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function existingTarget(page, rawTarget) {
  const cleanTarget = rawTarget.split("#")[0].split("?")[0];
  if (!cleanTarget || cleanTarget === "/") return publicRoot;
  const decoded = decodeURIComponent(cleanTarget);
  return decoded.startsWith("/")
    ? path.join(publicRoot, decoded)
    : path.resolve(path.dirname(page), decoded);
}

function existsAsStaticTarget(target) {
  if (fs.existsSync(target)) return true;
  if (fs.existsSync(`${target}.html`)) return true;
  return fs.existsSync(path.join(target, "index.html"));
}

test("all public HTML pages reference existing local static assets and pages", () => {
  const htmlFiles = walk(publicRoot).filter((file) => file.endsWith(".html"));
  const failures = [];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const refs = html.matchAll(/\b(?:href|src|action)=["']([^"']+)["']/gi);
    for (const [, rawRef] of refs) {
      if (/^(?:https?:|mailto:|tel:|#|javascript:)/i.test(rawRef)) continue;
      if (rawRef.startsWith("/api/") || rawRef.startsWith("/.netlify/")) continue;
      const target = existingTarget(file, rawRef);
      if (!existsAsStaticTarget(target)) {
        failures.push(`${path.relative(publicRoot, file)} -> ${rawRef}`);
      }
    }
  }

  assert.deepEqual(failures, []);
});

test("theme defaults to dark while preserving an explicit light preference", () => {
  const script = fs.readFileSync(path.join(publicRoot, "script.js"), "utf8");

  function getInitialTheme(storedTheme) {
    const attributes = new Map();
    const documentElement = {
      classList: { add() {} },
      getAttribute(name) {
        return attributes.get(name) ?? null;
      },
      setAttribute(name, value) {
        attributes.set(name, value);
      },
    };

    vm.runInNewContext(script, {
      document: {
        documentElement,
        addEventListener() {},
        querySelector() {
          return null;
        },
      },
      window: {
        localStorage: {
          getItem() {
            return storedTheme;
          },
          setItem() {},
        },
      },
    });

    return documentElement.getAttribute("data-theme");
  }

  assert.equal(getInitialTheme(null), "dark");
  assert.equal(getInitialTheme("dark"), "dark");
  assert.equal(getInitialTheme("light"), "light");
  assert.equal(getInitialTheme("unexpected-value"), "dark");
});
