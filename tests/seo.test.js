const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicRoot = path.resolve(__dirname, '../public');
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filename) : filename.endsWith('.html') ? [filename] : [];
  });
}
const pages = [path.join(publicRoot, 'index.html'), ...walk(path.join(publicRoot, 'pages'))];
function canonical(html) {
  return html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
}
function metadata(html, name) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0]).find(tag => tag.includes(`="${name}"`))?.match(/content="([^"]*)"/)?.[1];
}

test('custom 404 assets resolve from the origin for nested missing routes', () => {
  const html = fs.readFileSync(path.join(publicRoot, '404.html'), 'utf8');
  const assets = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/gi)].map(match => match[1]);
  assert.ok(assets.length > 0);
  for (const asset of assets) {
    const resolved = new URL(asset, 'https://cingy.tech/missing/deep/customer-page');
    const filename = path.join(publicRoot, decodeURIComponent(resolved.pathname));
    assert.ok(fs.existsSync(filename), `Missing 404 asset at ${resolved.pathname}`);
    assert.equal(resolved.origin, 'https://cingy.tech');
  }
});

test('sitemap contains every public page canonical once and resolves to a real page', () => {
  const sitemap = fs.readFileSync(path.join(publicRoot, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  const expected = pages.map(filename => canonical(fs.readFileSync(filename, 'utf8')));
  assert.ok(expected.every(Boolean), 'Every public page needs a canonical');
  assert.equal(new Set(urls).size, urls.length, 'Sitemap must not duplicate canonical URLs');
  assert.deepEqual([...urls].sort(), [...expected].sort());
  for (const url of urls) {
    assert.equal(new URL(url).origin, 'https://cingy.tech');
    let filename = path.join(publicRoot, new URL(url).pathname);
    if (fs.existsSync(filename) && fs.statSync(filename).isDirectory()) filename = path.join(filename, 'index.html');
    if (!fs.existsSync(filename)) filename += '.html';
    assert.ok(fs.existsSync(filename), `Canonical has no HTML source: ${url}`);
  }
});

test('public subpages share their own title and description with the branded preview', () => {
  for (const filename of pages.slice(1)) {
    const html = fs.readFileSync(filename, 'utf8');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.equal(metadata(html, 'og:title'), title, filename);
    assert.equal(metadata(html, 'og:description'), metadata(html, 'description'), filename);
    assert.equal(metadata(html, 'og:url'), canonical(html), filename);
    assert.equal(metadata(html, 'og:image'), 'https://cingy.tech/assets/og-cingy-tech-2026-10.jpg', filename);
    assert.equal(metadata(html, 'twitter:image'), metadata(html, 'og:image'), filename);
    assert.equal(metadata(html, 'twitter:card'), 'summary_large_image', filename);
  }
});
