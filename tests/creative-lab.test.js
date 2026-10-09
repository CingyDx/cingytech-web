const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = () => import('../public/experiments/signal-loom/data-engine.mjs');

test('cleaner normalizes, deduplicates and reports actual rejects', async () => {
  const { cleanContacts } = await engine();
  const out = cleanContacts('jmeno;email;stav\n Jana ; JANA@example.cz ; novy\nJana; jana@example.cz;novy\nPetr;bad;novy\nEva;eva@example.cz;aktivni');
  assert.deepEqual(out.counts, { input: 4, duplicates: 1, invalid: 1, output: 2 });
  assert.equal(out.rows[0].email, 'jana@example.cz');
  assert.equal(out.rows[0].jmeno, 'Jana');
});
test('quoted fields, UTF8 BOM and CRLF are parsed without data corruption', async () => {
  const { cleanContacts } = await engine();
  const out = cleanContacts('\ufeffjmeno;email;stav\r\n"Eva; Nová";eva@example.cz;"aktivni"\r\n"Jan ""J""";jan@example.cz;novy');
  assert.equal(out.rows[0].jmeno, 'Eva; Nová');
  assert.equal(out.rows[1].jmeno, 'Jan "J"');
});
test('malformed input and bounded sizes return understandable errors', async () => {
  const { cleanContacts } = await engine();
  assert.throws(() => cleanContacts('foo;bar\na;b'), /jmeno;email;stav/);
  assert.throws(() => cleanContacts('jmeno;email;stav\n"bad'), /uvozov/);
  assert.throws(() => cleanContacts('x'.repeat(10001)), /10 000/);
  assert.throws(() => cleanContacts('jmeno;email;stav\n' + Array(201).fill('Jan;jan@example.cz;novy').join('\n')), /200/);
  assert.throws(() => cleanContacts('jmeno;email;stav\nJan;jan@example.cz;novy;extra'), /sloupce/);
});
test('export quotes delimiters and neutralizes spreadsheet formulas', async () => {
  const { exportContacts } = await engine();
  const out = exportContacts([{jmeno:'=HYPERLINK("bad")',email:'a@example.cz',stav:'aktivni'},{jmeno:'Eva; Nová',email:'e@example.cz',stav:'+bad'}]);
  assert.ok(out.includes('\'='));
  assert.ok(out.includes('"Eva; Nová"'));
  assert.ok(out.includes('\'+bad'));
});
