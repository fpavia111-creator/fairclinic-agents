#!/usr/bin/env node
// Accuracy on the fictional fixtures, per agent and for the family:
//   1. planted set: the demo files. Recall = planted (item, finding) pairs found / planted pairs
//      listed in scripts/accuracy-specs.mjs (taken from each fixtures/README.md). Any other finding
//      is listed as unplanned.
//   2. clean set: the same files with every planted problem removed (fixtures/clean/). Every
//      finding there is a false positive.
//   3. mutation cases: one edit to the clean set that must raise one named finding.
// Checks run with patient-data masking off (phi: 'off') so planted names match the fixtures.
//
//   node scripts/accuracy.mjs --write [agent ...]   regenerate fixtures/clean/ from the specs, then measure
//   node scripts/accuracy.mjs [agent ...]           measure (exit 1 when a clean set is stale or a number is off)
//   node scripts/accuracy.mjs --record              also write docs/accuracy-<date>.json and .md
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SPECS } from './accuracy-specs.mjs';
import { DEMO_ARGS } from './demo-args.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PK = join(ROOT, 'packages');
const { AgentRuntime, parseCsvRows } = await import(pathToFileURL(join(PK, 'fairclinic-core', 'src', 'index.js')).href);
const argv = process.argv.slice(2);
const write = argv.includes('--write'); const record = argv.includes('--record');
const only = argv.filter((a) => !a.startsWith('--'));
const DATE = '2026-11-19';
const lf = (s) => s.replace(/\r\n/g, '\n');

// ------------------------------------------------------------------ files ----
const isCsv = (f) => /\.csv$/i.test(f);
const readFile = (file) => {
  const text = lf(readFileSync(file, 'utf8'));
  if (!isCsv(file)) return { text };
  const rows = parseCsvRows(text).filter((r) => r.some((c) => String(c).trim() !== ''));
  const head = rows[0];
  return { head, rows: rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? '']))) };
};
const cell = (v) => { const s = String(v ?? ''); return /[",\n\r]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const fileText = (t) => (t.text !== undefined ? t.text : [t.head.map(cell).join(','), ...t.rows.map((r) => t.head.map((h) => cell(r[h])).join(','))].join('\n') + '\n');
const hits = (r, where) => Object.entries(where).every(([k, v]) => String(r[k] ?? '').trim() === String(v));
function apply(files, op, label) {
  const [kind, file] = op; const t = files[file];
  if (!t) throw new Error(`${label}: no file ${file}`);
  if (kind === 'text') {
    const re = new RegExp(op[2]);
    if (!re.test(t.text)) throw new Error(`${label}: /${op[2]}/ matches nothing in ${file}`);
    t.text = t.text.replace(re, op[3]); return;
  }
  if (kind === 'add') {
    for (const h of Object.keys(op[2])) if (!t.head.includes(h)) throw new Error(`${label}: ${file} has no column ${h}`);
    t.rows.push(Object.fromEntries(t.head.map((h) => [h, op[2][h] ?? '']))); return;
  }
  const idx = t.rows.map((r, i) => (hits(r, op[2]) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) throw new Error(`${label}: ${JSON.stringify(op[2])} matches no row of ${file}`);
  if (kind === 'drop') t.rows = t.rows.filter((_, i) => !idx.includes(i));
  else if (kind === 'dropLast') t.rows.splice(idx.at(-1), 1);
  else if (kind === 'set') for (const i of idx) for (const [k, v] of Object.entries(op[3])) {
    if (!t.head.includes(k)) throw new Error(`${label}: ${file} has no column ${k}`);
    t.rows[i][k] = v;
  } else throw new Error(`${label}: unknown edit ${kind}`);
}

// ------------------------------------------------------------------ checks ----
async function runCheck(manifest, prefix, args, dir, files) {
  const root = mkdtempSync(join(tmpdir(), 'fc-acc-'));
  try {
    cpSync(dir, root, { recursive: true, filter: (p) => !/[\\/](clean|intl|exports)$/.test(p) });
    for (const [f, t] of Object.entries(files || {})) writeFileSync(join(root, f), fileText(t));
    const r = await new AgentRuntime(manifest, { root, stateDir: join(root, '.fairclinic-acc'), audit: false, memory: false, phi: 'off' }).call(`${prefix}_check`, { ...args, limit: 5000 });
    if (r.status !== 'executed') throw new Error(`${prefix}_check: ${r.status} ${r.reason || r.error || ''}`);
    return r.result.items;
  } finally { rmSync(root, { recursive: true, force: true }); }
}
// Finding codes when the item has a findings list, else its status; statuses and codes in `fine` are not problems.
const codesOf = (spec, i) => (Array.isArray(i.findings) && i.findings.length ? i.findings.map((f) => f.code) : [i.status]).filter((c) => !spec.fine.includes(c));
const pairs = (spec, items) => items.flatMap((i) => codesOf(spec, i).map((code) => ({ item: spec.key(i), code })));
const label = (p) => `${p.item}: ${p.code}`;

const results = []; let problems = 0;
const agents = readdirSync(PK).filter((n) => /^fairclinic-(?!core$)/.test(n) && (!only.length || only.includes(n))).sort();
for (const n of agents) {
  const spec = SPECS[n]; const args = DEMO_ARGS[n];
  if (!spec || !args) { console.log(`${n}: NO SPEC`); problems++; continue; }
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  const prefix = manifest.tools[0].name.replace(/_check$/, '');
  const dir = join(PK, n, 'fixtures');
  const dataFiles = Object.values(args).filter((v) => typeof v === 'string' && !/\.json$/i.test(v) && existsSync(join(dir, v)));
  const r = { agent: n, planted_total: 0, planted_found: 0, missed: [], unplanned: [], clean_rows: 0, clean_findings: [], mutation_cases: spec.mutations.length, mutation_caught: 0, mutation_missed: [], mutation_side_findings: 0 };
  try {
    // 1. planted set
    const demo = pairs(spec, await runCheck(manifest, prefix, args, dir));
    const claimed = new Set();
    for (const [key, codes] of Object.entries(spec.planted)) for (const c of codes) {
      r.planted_total++;
      const ix = demo.findIndex((p, i) => !claimed.has(i) && p.item === key && p.code === c);
      if (ix >= 0) { r.planted_found++; claimed.add(ix); } else r.missed.push(`${key}: ${c}`);
    }
    r.unplanned = demo.filter((_, i) => !claimed.has(i)).map(label);

    // 2. clean set
    const clean = Object.fromEntries(dataFiles.map((f) => [f, readFile(join(dir, f))]));
    for (const op of spec.clean) apply(clean, op, `${n} clean`);
    const cdir = join(dir, 'clean');
    for (const [f, t] of Object.entries(clean)) {
      const want = fileText(t); const p = join(cdir, f);
      if (write) { mkdirSync(cdir, { recursive: true }); writeFileSync(p, want); }
      else if (!existsSync(p) || lf(readFileSync(p, 'utf8')) !== want) { console.log(`${n}: fixtures/clean/${f} is out of date (run with --write)`); problems++; }
    }
    if (write) writeFileSync(join(cdir, 'README.md'), `# Clean set\n\nThe demo files with every planted problem in [../README.md](../README.md) removed and nothing else changed, made by \`scripts/accuracy.mjs\` from \`scripts/accuracy-specs.mjs\` in the repository. The check must report no findings on these files (settings: \`../settings.json\` where the demo uses one). Fictional data.\n`);
    r.clean_rows = Object.values(clean).reduce((t, x) => t + (x.rows ? x.rows.length : (x.text.match(/CLP\*/g) || []).length), 0);
    r.clean_findings = pairs(spec, await runCheck(manifest, prefix, args, dir, clean)).map(label);

    // 3. mutation cases on the clean set
    for (const m of spec.mutations) {
      const files = JSON.parse(JSON.stringify(clean));
      apply(files, m.op, `${n} mutation ${m.id}`);
      const got = pairs(spec, await runCheck(manifest, prefix, args, dir, files));
      const hit = got.some((p) => p.item === m.expect[0] && p.code === m.expect[1]);
      if (hit) r.mutation_caught++; else r.mutation_missed.push(`${m.id}: expected ${m.expect[0]}: ${m.expect[1]}; got ${got.map(label).join('; ') || 'nothing'}`);
      r.mutation_side_findings += got.filter((p) => !(p.item === m.expect[0] && p.code === m.expect[1])).length;
    }
  } catch (e) { r.error = e.message; }

  const ok = !r.error && r.planted_found === r.planted_total && !r.unplanned.length && !r.clean_findings.length && r.mutation_caught === r.mutation_cases;
  if (!ok) problems++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: planted ${r.planted_found}/${r.planted_total}, unplanned ${r.unplanned.length}, clean ${r.clean_findings.length} finding(s) on ${r.clean_rows} rows, mutations ${r.mutation_caught}/${r.mutation_cases}`);
  if (r.error) console.log(`       error       ${r.error}`);
  for (const x of r.missed) console.log(`       missed      ${x}`);
  for (const x of r.unplanned) console.log(`       unplanned   ${x}`);
  for (const x of r.clean_findings) console.log(`       clean FP    ${x}`);
  for (const x of r.mutation_missed) console.log(`       not caught  ${x}`);
  results.push(r);
}

const sum = (k) => results.reduce((t, r) => t + (r[k] || 0), 0);
const fam = {
  date: DATE, agents: results.length,
  planted_total: sum('planted_total'), planted_found: sum('planted_found'), unplanned: results.reduce((t, r) => t + r.unplanned.length, 0),
  clean_rows: sum('clean_rows'), clean_false_positives: results.reduce((t, r) => t + r.clean_findings.length, 0),
  mutation_cases: sum('mutation_cases'), mutation_caught: sum('mutation_caught'), mutation_side_findings: sum('mutation_side_findings'),
};
console.log(`\n${fam.agents} agent(s): planted ${fam.planted_found}/${fam.planted_total} found, ${fam.unplanned} unplanned finding(s); clean set ${fam.clean_false_positives} false positive(s) on ${fam.clean_rows} rows; mutations ${fam.mutation_caught}/${fam.mutation_cases} caught.`);

if (record) {
  mkdirSync(join(ROOT, 'docs'), { recursive: true });
  writeFileSync(join(ROOT, 'docs', `accuracy-${DATE}.json`), JSON.stringify({ family: fam, agents: results }, null, 2) + '\n');
  const L = [`# Accuracy on the fictional fixtures (${DATE})`, '',
    'Made by `node scripts/accuracy.mjs --record` (`npm run accuracy`). Planted problems are the ones each `fixtures/README.md` lists; the clean set is `fixtures/clean/` (the same files with those problems removed and nothing else changed); a mutation case changes one field, or adds or removes one row, of the clean set and expects one named finding. The checks run with masking off so planted names can be matched. The fixtures, the clean sets and the mutations were written by the same author as the rules: these numbers say the rules do what they are written to do on data built to test them, not how they will do on a real practice\'s exports (see `realdata-2026-11-19.md` for public data).', '',
    `**Family:** ${fam.planted_found} of ${fam.planted_total} planted problems found, ${fam.unplanned} unplanned findings on the planted set, ${fam.clean_false_positives} findings on ${fam.clean_rows} clean rows (all ${fam.agents} agents have a clean set), ${fam.mutation_caught} of ${fam.mutation_cases} mutation cases caught.`, '',
    '| Agent | Planted found | Unplanned | Clean rows | Findings on clean | Mutations caught |', '|---|---|---|---|---|---|',
    ...results.map((r) => `| ${r.agent} | ${r.planted_found}/${r.planted_total} | ${r.unplanned.length} | ${r.clean_rows} | ${r.clean_findings.length} | ${r.mutation_caught}/${r.mutation_cases} |`), ''];
  writeFileSync(join(ROOT, 'docs', `accuracy-${DATE}.md`), L.join('\n') + '\n');
  console.log(`Wrote docs/accuracy-${DATE}.json and .md`);
}
process.exit(problems ? 1 : 0);
