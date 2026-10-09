/** A deliberately local, bounded CSV workflow. No network or DOM dependencies. */
function parseCSV(text) {
  const rows = []; let row = [], cell = '', quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === '"') {
      if (cell.trim() || closed) throw new Error('Zkontrolujte uvozovky v CSV.');
      cell = ''; quoted = true;
    } else if (char === ';') { row.push(cell); cell = ''; closed = false; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(value => value.trim())) rows.push(row);
      row = []; cell = ''; closed = false;
    } else {
      if (closed && char.trim()) throw new Error('Zkontrolujte uvozovky v CSV.');
      cell += char;
    }
  }
  if (quoted) throw new Error('V CSV chybí uzavírací uvozovky.');
  row.push(cell); if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

export function cleanContacts(text) {
  if (typeof text !== 'string' || text.length > 10000) throw new Error('Použijte nejvýše 10 000 znaků.');
  const parsed = parseCSV(text.replace(/^\ufeff/, ''));
  const header = parsed.shift();
  if (!header || header.map(value => value.trim().toLowerCase()).join(';') !== 'jmeno;email;stav') {
    throw new Error('První řádek musí být jmeno;email;stav.');
  }
  if (parsed.length > 200) throw new Error('Demo zpracuje nejvýše 200 řádků.');
  const rows = [], seen = new Set();
  const counts = {input: parsed.length, duplicates: 0, invalid: 0, output: 0};
  for (const fields of parsed) {
    if (fields.length !== 3) throw new Error('Každý řádek musí mít přesně 3 sloupce.');
    const [jmeno, email, stav] = fields.map(value => value.trim());
    const normalized = email.toLowerCase();
    if (!jmeno || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { counts.invalid++; continue; }
    if (seen.has(normalized)) { counts.duplicates++; continue; }
    seen.add(normalized);
    rows.push({jmeno, email: normalized, stav: stav || 'novy'});
  }
  counts.output = rows.length;
  return {rows, counts};
}

export function exportContacts(rows) {
  const safeCell = value => {
    let text = String(value);
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return /[;"\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
  };
  return ['jmeno;email;stav', ...rows.map(row => [row.jmeno, row.email, row.stav].map(safeCell).join(';'))].join('\r\n');
}
