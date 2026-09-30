const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const publicRoot = path.join(__dirname, '..', 'public');

function element() {
  return {
    children: [],
    listeners: {},
    hidden: false,
    appendChild(child) { this.children.push(child); },
    append(...children) { this.children.push(...children); },
    setAttribute() {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
    click() { this.listeners.click(); }
  };
}

function loadConsent(savedChoice = null) {
  const handlers = {};
  const storage = new Map();
  if (savedChoice) storage.set('cingy-ads-consent-v1', JSON.stringify({ choice: savedChoice, time: Date.now() }));
  const document = {
    head: element(),
    body: element(),
    createElement: element,
    querySelector() { return null; },
    addEventListener(type, listener) { handlers[type] = listener; }
  };
  const window = {
    localStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, value); }
    },
    location: { reload() { window.reloaded = true; } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(publicRoot, 'ads-tracking.js'), 'utf8'), {
    document, window, Date
  });
  handlers.DOMContentLoaded();
  return { document, window, storage, banner: document.body.children[0] };
}

test('Google tag and conversion remain off until advertising consent is granted', () => {
  const { document, window, banner } = loadConsent();
  window.CingyAds.trackLead();
  assert.equal(document.head.children.length, 0);
  banner.children[1].children[0].click();
  assert.equal(document.head.children.length, 0);
  window.CingyAds.trackLead();
  assert.equal(window.dataLayer, undefined);

  banner.children[1].children[1].click();
  assert.equal(document.head.children.length, 1);
  assert.match(document.head.children[0].src, /gtag\/js\?id=AW-18484089030$/);
  assert.equal(window.dataLayer[0][0], 'consent');
  assert.equal(window.dataLayer[0][1], 'default');
  assert.equal(window.dataLayer[0][2].ad_storage, 'denied');
  assert.equal(window.dataLayer[1][2].ad_storage, 'granted');
  window.CingyAds.trackLead();
  const conversion = window.dataLayer.at(-1);
  assert.equal(conversion[0], 'event');
  assert.equal(conversion[1], 'conversion');
  assert.equal(conversion[2].send_to, 'AW-18484089030/rctDCOyXt4sdEMah8-1E');
  assert.equal(conversion[2].email, undefined);
});

test('a returning visitor who declined does not load the tag', () => {
  const { document, banner } = loadConsent('denied');
  assert.equal(banner.hidden, true);
  assert.equal(document.head.children.length, 0);
});

test('a visitor can revoke a previously saved consent', () => {
  const { document, window, banner, storage } = loadConsent('granted');
  assert.equal(document.head.children.length, 1);
  banner.children[1].children[0].click();
  assert.equal(JSON.parse(storage.get('cingy-ads-consent-v1')).choice, 'denied');
  assert.equal(window.dataLayer.at(-1)[2].ad_storage, 'denied');
  assert.equal(window.reloaded, true);
});

test('all pages using the shared script load consent before form handling', () => {
  function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    });
  }
  for (const file of walk(publicRoot).filter((name) => name.endsWith('.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('script.js" defer')) continue;
    assert.match(html, /ads-tracking\.js" defer><\/script>[\s\S]*script\.js" defer><\/script>/,
      `${path.relative(publicRoot, file)} must load consent first`);
  }
});

function loadContactForm(response, trackingFails = false, campaignSearch = '', campaignStore = new Map()) {
  const handlers = {};
  const fields = {
    name: { value: 'Test' },
    email: { value: 'test@example.invalid' },
    message: { value: 'Prosím o web.' }
  };
  const button = { textContent: 'Odeslat zprávu', disabled: false };
  const status = { textContent: '', className: '' };
  const form = {
    querySelector(selector) {
      if (selector === 'button[type="submit"]') return button;
      const name = selector.match(/\[name="([^"]+)"\]/)?.[1];
      return fields[name] || null;
    },
    getAttribute() { return '/'; },
    addEventListener(type, listener) { handlers[type] = listener; },
    reset() { form.resetCalled = true; }
  };
  const document = {
    documentElement: { classList: { add() {} }, getAttribute() { return null; }, setAttribute() {} },
    addEventListener(type, listener) { handlers[type] = listener; },
    getElementById(id) { return id === 'contact-form' ? form : id === 'form-status' ? status : null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  let conversions = 0;
  const window = {
    localStorage: { getItem() { return null; } },
    sessionStorage: {
      getItem(key) { return campaignStore.get(key) || null; },
      setItem(key, value) { campaignStore.set(key, value); }
    },
    location: { pathname: '/', href: 'https://cingy.tech/', origin: 'https://cingy.tech', search: campaignSearch },
    matchMedia() { return { matches: true }; },
    CingyAds: { trackLead() {
      if (trackingFails) throw new Error('Tag unavailable');
      conversions++;
    } }
  };
  class MockFormData {
    constructor() { this.fields = new Map([['form-name', 'kontakt']]); }
    set(key, value) { this.fields.set(key, value); }
    *[Symbol.iterator]() { yield* this.fields; }
  }
  let postedBody = '';
  vm.runInNewContext(fs.readFileSync(path.join(publicRoot, 'script.js'), 'utf8'), {
    document, window, FormData: MockFormData, URLSearchParams,
    fetch: async (target, request) => { postedBody = request.body; return response; }
  });
  handlers.DOMContentLoaded();
  return { submit: handlers.submit, form, status, conversions: () => conversions, postedBody: () => postedBody };
}

test('campaign source survives navigation and reaches the CRM form submission', async () => {
  const store = new Map();
  loadContactForm({ ok: true }, false, '?utm_source=google&utm_medium=cpc&utm_campaign=launch_sep26', store);
  const contact = loadContactForm({ ok: true }, false, '', store);
  await contact.submit({ preventDefault() {} });
  const body = new URLSearchParams(contact.postedBody());
  assert.equal(body.get('utm_source'), 'google');
  assert.equal(body.get('utm_medium'), 'cpc');
  assert.equal(body.get('utm_campaign'), 'launch_sep26');
});

test('contact form counts a lead only after Netlify confirms a successful response', async () => {
  const success = loadContactForm({ ok: true });
  await success.submit({ preventDefault() {} });
  assert.equal(success.conversions(), 1);
  assert.equal(success.form.resetCalled, true);

  const failure = loadContactForm({ ok: false });
  await failure.submit({ preventDefault() {} });
  assert.equal(failure.conversions(), 0);
  assert.equal(failure.form.resetCalled, undefined);
  assert.match(failure.status.textContent, /nepovedlo/);

  const trackingFailure = loadContactForm({ ok: true }, true);
  await trackingFailure.submit({ preventDefault() {} });
  assert.equal(trackingFailure.conversions(), 0);
  assert.match(trackingFailure.status.textContent, /Zpráva byla odeslána/);
});
