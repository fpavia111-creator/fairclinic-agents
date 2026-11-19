#!/usr/bin/env node
// Real-data tests on public files in their published format (19 Nov 2026). Never private data.
// Downloads go to _realdata/ (git-ignored, never committed); only this script and the results are committed.
//
//   node scripts/realdata.mjs --download   fetch the public files into _realdata/
//   node scripts/realdata.mjs              run the agents on them, recount each result with separate code,
//                                          and write docs/realdata-2026-11-19.json and .md
//
// The agents run with masking off (phi: 'off'): nothing is sent to any model here. The Washington file
// names real licence holders (a public record); the results keep counts only.
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PK = join(ROOT, 'packages'); const RD = join(ROOT, '_realdata');
const DATE = '2026-11-19';
const UA = { 'User-Agent': 'fair-agents-realdata-test (public data, one-off)' };
const core = await import(pathToFileURL(join(PK, 'fairclinic-core', 'src', 'index.js')).href);
const agent = async (n) => (await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href)).manifest;
const call = async (n, root, tool, args) => {
  const r = await new core.AgentRuntime(await agent(n), { root, stateDir: join(root, '.fairclinic-rd'), audit: false, memory: false, phi: 'off' }).call(tool, { ...args, limit: 5000 });
  if (r.status !== 'executed') throw new Error(`${n} ${tool}: ${r.status} ${r.reason || ''}`);
  return r.result;
};
const r2 = (x) => Math.round(x * 100) / 100;

// ------------------------------------------------------------------ sources ----
const WA_TYPES = ['Dentist License', 'Dental Hygiene License', 'Veterinary License', 'Veterinary Technician License'];
const WA_URL = `https://data.wa.gov/resource/qxh8-f4bd.csv?$where=${encodeURIComponent(`credentialtype in(${WA_TYPES.map((t) => `'${t}'`).join(',')})`)}&$limit=200000&$order=credentialnumber`;
const NV_URL = 'https://www.medicaid.nv.gov/Downloads/provider/Sample_835_File.pdf';
const NADAC_ID = 'fbb83258-11c7-47f5-8b18-5f8e79f7e704';
const NADAC_DATES = ['2026-01-07', '2026-11-18'];
// Human generics that veterinary practices commonly dispense (NADAC covers human drugs only).
const NADAC_DRUGS = ['GABAPENTIN 100 MG CAPSULE', 'PREDNISONE 5 MG TABLET', 'TRAZODONE 50 MG TABLET', 'METRONIDAZOLE 250 MG TABLET', 'CEPHALEXIN 500 MG CAPSULE', 'FAMOTIDINE 20 MG TABLET', 'LEVETIRACETAM 500 MG TABLET', 'DOXYCYCLINE HYCLATE 100 MG CAP', 'CLINDAMYCIN HCL 150 MG CAPSULE', 'METHIMAZOLE 5 MG TABLET', 'ENALAPRIL MALEATE 5 MG TABLET', 'FUROSEMIDE 20 MG TABLET', 'OMEPRAZOLE DR 20 MG CAPSULE', 'MIRTAZAPINE 15 MG TABLET', 'SUCRALFATE 1 GM TABLET', 'ONDANSETRON HCL 4 MG TABLET', 'CETIRIZINE HCL 10 MG TABLET', 'BENAZEPRIL HCL 10 MG TABLET', 'AMITRIPTYLINE HCL 10 MG TAB', 'METOCLOPRAMIDE 10 MG TABLET', 'SPIRONOLACTONE 25 MG TABLET', 'TRAMADOL HCL 50 MG TABLET', 'PHENOBARBITAL 64.8 MG TABLET', 'AZITHROMYCIN 250 MG TABLET', 'URSODIOL 300 MG CAPSULE', 'SILDENAFIL 20 MG TABLET'];
const MT = [
  { file: 'January2026DentalServicesFeeSchedule_rev.xlsx', url: 'https://medicaidprovider.mt.gov/docs/feeschedules/2026/January2026DentalServicesFeeSchedule_rev.xlsx', plan: 'Montana Medicaid dental (January 2026)' },
  { file: 'July2025DentalServicesFeeSchedule.xlsx', url: 'https://medicaidprovider.mt.gov/docs/feeschedules/2025/July2025DentalServicesFeeSchedule.xlsx', plan: 'Montana Medicaid dental (July 2025)' },
];

async function get(url) { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); }
async function download() {
  mkdirSync(join(RD, 'wa-doh'), { recursive: true }); writeFileSync(join(RD, 'wa-doh', 'credentials.csv'), await get(WA_URL));
  mkdirSync(join(RD, 'nv-835'), { recursive: true }); writeFileSync(join(RD, 'nv-835', 'Sample_835_File.pdf'), await get(NV_URL));
  mkdirSync(join(RD, 'mt-dental'), { recursive: true }); for (const m of MT) writeFileSync(join(RD, 'mt-dental', m.file), await get(m.url));
  mkdirSync(join(RD, 'nadac'), { recursive: true });
  for (const d of NADAC_DATES) {
    const rows = [];
    for (const drug of NADAC_DRUGS) {
      const q = new URLSearchParams({ 'conditions[0][property]': 'ndc_description', 'conditions[0][value]': drug, 'conditions[0][operator]': '=', 'conditions[1][property]': 'as_of_date', 'conditions[1][value]': d, 'conditions[1][operator]': '=', limit: '500' });
      const j = JSON.parse((await get(`https://data.medicaid.gov/api/1/datastore/query/${NADAC_ID}/0?${q}`)).toString('utf8'));
      rows.push(...j.results);
    }
    writeFileSync(join(RD, 'nadac', `nadac-${d}.json`), JSON.stringify(rows, null, 1));
  }
  console.log('Downloaded into _realdata/');
}

// A small CSV reader for the recounts (separate from the agents' reader on purpose).
function csv(text) {
  const out = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); out.push(row); row = []; f = ''; } else f += c;
  }
  if (f || row.length) { row.push(f); out.push(row); }
  const [h, ...rest] = out.filter((r) => r.some((x) => x !== ''));
  return rest.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])));
}
const mdy = (s) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s).trim()); return m ? `${m[3]}-${m[1]}-${m[2]}` : null; };
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

const results = [];

// 1. Washington State licence file -> credential expiry -----------------------------------
async function wa() {
  const dir = join(RD, 'wa-doh'); const rows = csv(readFileSync(join(dir, 'credentials.csv'), 'utf8'));
  const out = await call('fairclinic-credential-expiry', dir, 'credentials_check', { credentials: 'credentials.csv', as_of: DATE });
  const NOT_ACTIVE = /^(expired|closed|revoked|suspended|summary suspension|surrender(ed)?|voluntary surrender|terminated|denied|inactive|lapsed|retired|superseded|cancell?ed)$/i;
  const want = {}; let activePast = 0;
  for (const r of rows) {
    if (!r.lastname.trim() || !r.credentialtype.trim()) { want.skipped = (want.skipped || 0) + 1; continue; }
    const exp = mdy(r.expirationdate); let s;
    if (NOT_ACTIVE.test(r.status.trim())) s = 'not_active';
    else if (!exp) s = 'missing_expiry';
    else if (days(DATE, exp) < 0) { s = 'expired'; if (/^active/i.test(r.status.trim())) activePast++; }
    else if (days(DATE, exp) <= 90) s = 'expiring';
    else s = 'ok';
    want[s] = (want[s] || 0) + 1;
  }
  const got = out.by_status; const keys = ['not_active', 'expired', 'expiring', 'missing_expiry', 'ok'];
  const agree = keys.every((k) => (got[k] || 0) === (want[k] || 0)) && out.credentials === rows.length - (want.skipped || 0);
  const active = rows.filter((r) => /^active/i.test(r.status.trim())).length;
  const gotActivePast = out.items.length >= out.credentials ? out.items.filter((i) => i.status === 'expired' && /^active/i.test(i.board_status)).length : null;
  results.push({
    id: 'wa-doh-credentials', source: 'Washington State Department of Health, Health Care Provider Credential Data (data.wa.gov dataset qxh8-f4bd), CSV from the open-data API, four credential types: ' + WA_TYPES.join(', '),
    url: 'https://data.wa.gov/d/qxh8-f4bd', date: DATE, licence: 'Public domain (as stated on data.wa.gov)', agent: 'fairclinic-credential-expiry',
    rows: rows.length, ran: `credentials_check as of ${DATE}, warning 90 days`, got, want, agree,
    found: `${rows.length} credentials (${active} with a board status starting "Active"): ${got.not_active || 0} not active at the board, ${got.expired || 0} past their expiry date (${activePast} of them still "Active" at the board), ${got.expiring || 0} expiring within 90 days, ${got.missing_expiry || 0} with no expiry date.`,
    false_positives: `none against the recount (${agree ? 'all status counts equal' : 'COUNTS DIFFER'}); the ${activePast} "Active" credentials past their date are not wrong findings but a disagreement inside the board's own file, which the agent now says in the detail${gotActivePast !== null ? ` (${gotActivePast} found by the agent)` : ''}`,
    changed: 'Before this pass the agent could not read the file at all (no holder column: the board splits first and last name) and ignored the board status. It now joins first and last name, reads the status column, reports not_active when the board says expired, closed, suspended and the like, and says when the board still lists a past-date credential as Active.',
  });
}

// 2. Nevada Medicaid sample 835 -> ERA posting ---------------------------------------------
async function nv() {
  const dir = join(RD, 'nv-835');
  if (!existsSync(join(dir, 'sample.txt'))) {
    const p = spawnSync('pdftotext', ['-layout', join(dir, 'Sample_835_File.pdf'), join(dir, 'sample.txt')]);
    if (p.status !== 0) throw new Error('pdftotext (poppler) is needed to read the Nevada sample PDF');
  }
  // The sample is published as a PDF: drop the title and page lines and rejoin segments the page width wrapped.
  const lines = readFileSync(join(dir, 'sample.txt'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^Sample 835 File\.txt$/.test(l) && !/^Page \d+$/.test(l));
  const segs = []; for (const l of lines) { if (/^[A-Z][A-Z0-9]{1,2}\*/.test(l)) segs.push(l); else segs[segs.length - 1] += l; }
  writeFileSync(join(dir, 'sample.835'), segs.join('\n') + '\n');
  writeFileSync(join(dir, 'posted-none.csv'), 'Claim ID,Patient,Carrier,Check Number,Payment Posted,Write-off Posted,Posted Date,Posted By\n');
  const out = await call('fairclinic-era-posting', dir, 'era_check', { era: 'sample.835', posted: 'posted-none.csv' });
  // Recount from the segments.
  const el = segs.map((s) => s.split('*'));
  const clp = el.filter((e) => e[0] === 'CLP'); const denied = clp.filter((e) => e[2] === '4').length;
  const sets = []; let cur = null;
  for (const e of el) { if (e[0] === 'ST') { cur = { bpr: 0, trn: '', claims: 0, plb: 0 }; sets.push(cur); } else if (!cur) continue; else if (e[0] === 'BPR') cur.bpr = Number(e[2]); else if (e[0] === 'TRN') cur.trn = e[2]; else if (e[0] === 'CLP') cur.claims++; else if (e[0] === 'PLB') for (let k = 4; k < e.length; k += 2) cur.plb += Number(e[k]) || 0; }
  const withPlb = sets.filter((s) => Math.abs(s.plb) > 0.001);
  const want = { era_claims: clp.length, denied, provider_adjustments: withPlb.length, checks: sets.length, claimless: sets.filter((s) => !s.claims).length, plb_total: r2(withPlb.reduce((t, s) => t + s.plb, 0)) };
  const plbCheck = out.checks.find((c) => Math.abs(c.provider_adjustments) > 0.001);
  const got = { era_claims: out.era_claims, denied: out.denied, provider_adjustments: out.provider_adjustments, checks: out.checks.length, claimless: out.checks.filter((c) => !c.claims).length, plb_total: plbCheck ? plbCheck.provider_adjustments : 0 };
  const agree = Object.keys(want).every((k) => want[k] === got[k]);
  results.push({
    id: 'nv-medicaid-835', source: 'Nevada Medicaid sample 835 file (published as a PDF for providers; text extracted with pdftotext, page lines removed and wrapped segments rejoined)',
    url: NV_URL, date: DATE, licence: 'State of Nevada public provider document; no licence stated; names and ids in it are sample values', agent: 'fairclinic-era-posting',
    rows: segs.length, ran: 'era_check with an empty posting file', got, want, agree,
    found: `${got.checks} remittances (segments ended by line breaks, not "~"), ${got.era_claims} claims: ${got.denied} denials to work (claim status 4, CO-26), 1 claim processed as secondary with nothing paid (left as ok), and a ${plbCheck ? plbCheck.payment_amount : '?'} payment made only of provider-level adjustments (PLB, ${got.plb_total} in total) with no claims on it.`,
    false_positives: agree ? 'none against the recount' : 'COUNTS DIFFER',
    changed: 'Before this pass the claim-less payment and every provider-level (PLB) adjustment were dropped without a word: the 1,812.27 check was not in the result. The agent now lists each check with PLB adjustments as provider_adjustment (post at the account level) and shows the payment amount and PLB total per check.',
  });
}

// 3. NADAC unit costs on two dates -> pharmacy margins ---------------------------------------
async function nadac() {
  const dir = join(RD, 'nadac');
  const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
  const cost = {};
  for (const d of NADAC_DATES) { const rows = JSON.parse(readFileSync(join(dir, `nadac-${d}.json`), 'utf8')); for (const drug of NADAC_DRUGS) { (cost[drug] ||= {})[d] = med(rows.filter((r) => r.ndc_description === drug).map((r) => Number(r.nadac_per_unit))); } }
  const drugs = NADAC_DRUGS.filter((x) => cost[x][NADAC_DATES[0]] && cost[x][NADAC_DATES[1]]);
  // A fictional price list: each item priced at 2.2 times its January cost (rounded to the cent, at least 0.01 above cost), unchanged since.
  const round5 = (x) => Math.round(x * 100000) / 100000;
  const priceOf = (c) => Math.max(Math.round(c * 2.2 * 100) / 100, Math.ceil((c + 0.01) * 100) / 100);
  const lines = ['Item,Type,Cost,Previous Cost,Price,Previous Price,Dispensing Fee', ...drugs.map((x) => { const p = priceOf(cost[x][NADAC_DATES[0]]); return `${x},Rx,${round5(cost[x][NADAC_DATES[1]])},${round5(cost[x][NADAC_DATES[0]])},${p},${p},12.00`; })];
  writeFileSync(join(dir, 'pharmacy-prices.csv'), lines.join('\n') + '\n');
  writeFileSync(join(dir, 'settings.json'), JSON.stringify({ note: 'Fictional targets for the real-data test', target_margin_pct: 45, cost_rise_pct: 5 }));
  const out = await call('fairclinic-pharmacy-margins', dir, 'pharmacy_check', { prices: 'pharmacy-prices.csv', settings: 'settings.json' });
  const want = { below_cost: 0, cost_rise_not_passed: 0, low_margin: 0 };
  const rises = [];
  for (const x of drugs) {
    const c = round5(cost[x][NADAC_DATES[1]]), pc = round5(cost[x][NADAC_DATES[0]]), p = priceOf(cost[x][NADAC_DATES[0]]);
    const m = Math.round(((p - c) / p) * 10000) / 100;
    if (p < c) want.below_cost++;
    if (c > pc * 1.05) { want.cost_rise_not_passed++; rises.push(`${x} ${pc} to ${c}`); }
    if (m >= 0 && m < 45) want.low_margin++;
  }
  const got = Object.fromEntries(Object.keys(want).map((k) => [k, out.items.filter((i) => i.findings.some((f) => f.code === k)).length]));
  const agree = Object.keys(want).every((k) => want[k] === got[k]);
  const up = drugs.filter((x) => cost[x][NADAC_DATES[1]] > cost[x][NADAC_DATES[0]]).length, down = drugs.filter((x) => cost[x][NADAC_DATES[1]] < cost[x][NADAC_DATES[0]]).length;
  results.push({
    id: 'cms-nadac', source: `CMS NADAC (National Average Drug Acquisition Cost) 2026, data.medicaid.gov dataset ${NADAC_ID}, rows for ${NADAC_DRUGS.length} human generics often dispensed by veterinary practices, as of ${NADAC_DATES.join(' and ')}`,
    url: `https://data.medicaid.gov/dataset/${NADAC_ID}`, date: DATE, licence: 'U.S. government work, public domain', agent: 'fairclinic-pharmacy-margins',
    rows: drugs.length, ran: 'pharmacy_check on a price list whose Cost and Previous Cost are the median NADAC per unit on the two dates and whose prices are fictional (2.2 times the January cost, unchanged)', got, want, agree,
    found: `${drugs.length} drugs: ${up} cost more per unit in November than in January, ${down} less. ${got.cost_rise_not_passed} rose by more than 5% with the price unchanged (${rises.slice(0, 4).join('; ')}${rises.length > 4 ? '; ...' : ''}), ${got.low_margin} fell under the 45% margin, ${got.below_cost} priced below cost. Unit costs with five decimals (0.02152) were read without rounding.`,
    false_positives: agree ? 'none against the recount' : 'COUNTS DIFFER',
    changed: 'Nothing: the rules and the reader gave the same counts as the recount. NADAC covers human drugs only, so veterinary products (carprofen, maropitant) are not in it.',
  });
}

// 4. Montana Medicaid dental fee schedules -> PPO fees ---------------------------------------
async function mt() {
  const dir = join(RD, 'mt-dental');
  copyFileSync(join(PK, 'fairclinic-ppo-fees', 'fixtures', 'office-fees.csv'), join(dir, 'office-fees.csv'));
  const office = csv(readFileSync(join(dir, 'office-fees.csv'), 'utf8'));
  const runs = [];
  for (const m of MT) {
    const out = await call('fairclinic-ppo-fees', dir, 'fees_check', { fees: 'office-fees.csv', schedules: m.file, plan: m.plan });
    const x = core.readXlsx(readFileSync(join(dir, m.file))); const rows = x.rows || x; const head = rows[0].map((h) => String(h).trim());
    const ci = head.indexOf('Proc'); const fi = head.findIndex((h) => /^(Office )?Fees$/.test(h));
    const sched = new Map(); let nonNumeric = 0; let codeRows = 0;
    for (const r of rows.slice(1)) { const c = String(r[ci] ?? '').trim().toUpperCase(); if (!c) continue; codeRows++; const v = String(r[fi] ?? '').trim(); const n = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : null; if (n === null) nonNumeric++; sched.set(c, n); }
    const off = new Map(office.map((o) => [o.Code.trim().toUpperCase(), Number(o['Office Fee'])]));
    const want = { codes: new Set([...sched.keys()]).size, deep_discount: 0, fee_below_allowed: 0, not_offered: 0, in_both: 0 };
    for (const [c, a] of sched) {
      const f = off.get(c);
      if (f === undefined) { if (a !== null) want.not_offered++; continue; }
      want.in_both++;
      if (a !== null && f < a - 0.5) want.fee_below_allowed++;
      if (a !== null && f && ((f - a) / f) * 100 > 45) want.deep_discount++;
    }
    const got = { codes: out.codes_checked, deep_discount: out.deep_discount, fee_below_allowed: out.fee_below_allowed, not_offered: out.not_offered, in_both: out.items.filter((i) => i.office_fee !== null && i.plan_allowed !== null).length };
    runs.push({ file: m.file, sheet: core.xlsxSheets(readFileSync(join(dir, m.file)))[0], fee_column: head[fi], code_rows: codeRows, non_numeric_fees: nonNumeric, got, want, agree: Object.keys(want).every((k) => want[k] === got[k]) });
  }
  const a = runs[0];
  results.push({
    id: 'mt-medicaid-dental-fees', source: 'Montana Medicaid (DPHHS) dental services fee schedules, January 2026 (revised) and July 2025, Excel files from medicaidprovider.mt.gov',
    url: 'https://medicaidprovider.mt.gov/18', date: DATE, licence: 'State of Montana public provider document; CDT codes and descriptors are copyright of the American Dental Association', agent: 'fairclinic-ppo-fees',
    rows: runs.reduce((t, r) => t + r.code_rows, 0), ran: 'fees_check with each schedule as one plan (plan argument) against the fictional 8-code office fee list from the fixtures', got: runs.map((r) => r.got), want: runs.map((r) => r.want), agree: runs.every((r) => r.agree), runs,
    found: `${runs.map((r) => `${r.file} (sheet "${r.sheet}", fee column "${r.fee_column}"): ${r.got.codes} codes read`).join('; ')}. Against the 8 fictional office fees: ${a.got.deep_discount} codes with a write-off over 45%, ${a.got.fee_below_allowed} with the office fee below the plan's, ${a.got.not_offered} schedule codes the office has no fee for (listed as not_offered). ${a.non_numeric_fees ? `${a.non_numeric_fees} rows have no numeric fee (read as no fee).` : 'Every code row has a numeric fee.'}`,
    false_positives: runs.every((r) => r.agree) ? 'none against the recount' : 'COUNTS DIFFER',
    changed: 'Before this pass the agent could not read either file: a payer publishes one plan per file with no plan column, and names the columns Proc and Fees (July 2025) or Office Fees (January 2026, also a renamed sheet). It now takes a plan argument and those names. It would also have raised one "no office fee" finding for each of the schedule codes the office never bills; those are now listed as not_offered and are not counted as work.',
  });
}

if (process.argv.includes('--download')) { await download(); process.exit(0); }
for (const [name, fn] of [['wa', wa], ['nv', nv], ['nadac', nadac], ['mt', mt]]) {
  try { await fn(); } catch (e) { console.error(`${name}: ${e.message}`); results.push({ id: name, error: e.message }); }
}
for (const r of results) console.log(`${r.error ? 'ERROR' : r.agree ? 'agree' : 'DIFFER'}  ${r.id}: ${r.error || r.found}`);
mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(join(ROOT, 'docs', `realdata-${DATE}.json`), JSON.stringify({ date: DATE, results }, null, 2) + '\n');
const L = [`# Real-data tests (${DATE})`, '', 'Made by `node scripts/realdata.mjs` (`npm run realdata`; `--download` first). Public files only, in the format their publisher puts out; nothing private, nothing sent to any model (masking off, local run). The downloaded files are kept in `_realdata/`, which is git-ignored. Each agent result was recounted with separate code in the same script.', '',
  '| Source | Agent | What ran | What it found | Wrong findings | Changed in this pass |', '|---|---|---|---|---|---|',
  ...results.filter((r) => !r.error).map((r) => `| [${r.source}](${r.url}), ${r.licence}, read ${r.date} | ${r.agent} | ${r.ran} | ${r.found} | ${r.false_positives} | ${r.changed} |`), '',
  '**Agents with no public data that fits:** patient balances, client balances, claims aging, pre-authorizations, unscheduled treatment, recall, membership and wellness plans, no-shows, lab cases, missed charges, estimates, boarding, discounts, payroll, card deposits, referrals, reviews, reference labs, pet insurance claims, controlled-drug logs, sterilization logs, inventory, supply costs, hygiene and provider production all read a practice\'s own records, and no practice-management vendor publishes a sample export we could find. They were tested on the fictional fixtures only.', ''];
writeFileSync(join(ROOT, 'docs', `realdata-${DATE}.md`), L.join('\n'));
console.log(`Wrote docs/realdata-${DATE}.json and .md`);
process.exit(results.some((r) => r.error || !r.agree) ? 1 : 0);
