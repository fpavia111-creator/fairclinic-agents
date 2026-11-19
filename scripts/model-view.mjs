#!/usr/bin/env node
// What reaches the AI model when an assistant calls each agent's check tool. Each check runs on its
// fictional fixtures with masking on (the default), and the result the model would receive is
// read field by field: masked fields (pseudonyms such as PT-3f2a9c1d), text fields sent in clear,
// and among those the ones that can carry a person's name (staff and providers, free text).
// It also confirms that no value in fixtures/phi-canaries.json appears in the result, and probes
// what happens to a name typed into a free-text column (review text).
// Report and draft files written on the machine are not counted: they stay there, with real names.
//
//   node scripts/model-view.mjs     print the table and write docs/model-view-<date>.json and .md
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync, cpSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { DEMO_ARGS } from './demo-args.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PK = join(ROOT, 'packages'); const DATE = '2026-11-19';
const { AgentRuntime, phiKindOf } = await import(pathToFileURL(join(PK, 'fairclinic-core', 'src', 'index.js')).href);
// The demo's published key for fictional data (src/demo.js), so pseudonyms are stable between runs.
const DEMO_PHI_KEY = createHash('sha256').update('fairclinic demo key: fictional fixtures only').digest();

// Fields in clear that hold a staff member's, provider's or business's name.
const STAFF = new Set(['provider', 'providers', 'dentist', 'vet', 'hygienist', 'employee', 'entered_by', 'approved_by', 'posted_by', 'holder', 'initials', 'staff', 'party', 'witness']);
// Free text a person typed (anything could be in it).
const FREE = new Set(['excerpt', 'note', 'reason', 'add_ons', 'memo']); // procedure descriptions come from the fee schedule, not typed per patient
const isPlain = (v) => /^-?[\d.,]+%?$/.test(v) || /^\d{4}-\d\d(-\d\d)?$/.test(v) || /^[a-z_]+$/.test(v);

async function run(manifest, prefix, dir, args, phi) {
  const root = mkdtempSync(join(tmpdir(), 'fc-mv-'));
  try {
    cpSync(dir, root, { recursive: true, filter: (p) => !/[\\/](clean|intl)$/.test(p) });
    return await new AgentRuntime(manifest, { root, stateDir: join(root, '.fairclinic-mv'), audit: false, memory: false, phi, ...(phi === 'mask' ? { phiKey: DEMO_PHI_KEY } : {}) }).call(`${prefix}_check`, { ...args, limit: 5000 });
  } finally { rmSync(root, { recursive: true, force: true }); }
}

const out = [];
for (const n of readdirSync(PK).filter((x) => /^fairclinic-(?!core$)/.test(x)).sort()) {
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  const prefix = manifest.tools[0].name.replace(/_check$/, '');
  const dir = join(PK, n, 'fixtures');
  const r = await run(manifest, prefix, dir, DEMO_ARGS[n], 'mask');
  const json = JSON.stringify(r);
  const masked = new Set(); const clear = new Set();
  for (const i of (r.result && r.result.items) || []) for (const [k, v] of Object.entries(i)) {
    if (k === 'findings' || k === 'status' || k === 'detail') continue;
    if (phiKindOf(k)) { masked.add(k); continue; }
    if (typeof v === 'string' && v.trim() && !isPlain(v.trim())) clear.add(k);
  }
  const canaryFile = join(dir, 'phi-canaries.json');
  const canaries = existsSync(canaryFile) ? JSON.parse(readFileSync(canaryFile, 'utf8')) : [];
  const list = Array.isArray(canaries) ? canaries : (canaries.values || []);
  const leaks = list.filter((c) => json.includes(String(c)));
  out.push({
    agent: n, masked: [...masked].sort(), text_in_clear: [...clear].sort(),
    names_in_clear: [...clear].filter((k) => STAFF.has(k)).sort(), free_text_in_clear: [...clear].filter((k) => FREE.has(k)).sort(),
    canaries: list.length, canary_leaks: leaks.length,
    plus: 'amounts, quantities, dates, rates, codes, record ids and finding codes in clear; the generated detail text repeats them, with registered names replaced',
  });
}

// Probe: a name typed into review text. The reviewer's own name is registered (masked column) and is
// replaced inside the text; a name that is in no masked column of the files read reaches the model as typed.
const rv = await import(pathToFileURL(join(PK, 'fairclinic-review-replies', 'src', 'index.js')).href);
const probeRoot = mkdtempSync(join(tmpdir(), 'fc-mv-probe-'));
writeFileSync(join(probeRoot, 'reviews.csv'), 'Review ID,Platform,Date,Rating,Reviewer,Text,Replied\nRV1,Example Reviews,2026-11-14,2,Juniper Vance,"Juniper Vance here: Dr. Ada Stranger rushed my dog Waffles.",\n');
const probe = await new AgentRuntime(rv.manifest, { root: probeRoot, stateDir: join(probeRoot, '.s'), audit: false, memory: false, phiKey: DEMO_PHI_KEY }).call('reviews_check', { reviews: 'reviews.csv' });
rmSync(probeRoot, { recursive: true, force: true });
const pj = JSON.stringify(probe);
const probeResult = { reviewer_name_in_text_masked: !pj.includes('Juniper Vance'), unknown_name_in_text_reaches_model: pj.includes('Ada Stranger'), pet_name_in_text_reaches_model: pj.includes('Waffles') };

for (const o of out) console.log(`${o.agent}\n  masked: ${o.masked.join(', ') || '-'}\n  text in clear: ${o.text_in_clear.join(', ') || '-'}\n  canaries: ${o.canaries}, leaks ${o.canary_leaks}`);
console.log('probe:', JSON.stringify(probeResult));
const leaks = out.reduce((t, o) => t + o.canary_leaks, 0);
mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(join(ROOT, 'docs', `model-view-${DATE}.json`), JSON.stringify({ date: DATE, agents: out, canary_leaks: leaks, free_text_probe: probeResult }, null, 2) + '\n');
const L = [`# What reaches the AI model (${DATE})`, '',
  'Made by `node scripts/model-view.mjs` (`npm run model-view`): each check is run on its fictional fixtures with masking on (the default) and the result the assistant\'s model receives is read field by field.', '',
  '**Masked** (replaced before the result leaves the agent): patient, pet, client, owner, guarantor and reviewer names (`PT-` pseudonyms), account and client numbers (`ACCT-`), member and subscriber ids (`MBR-`), chart and pet ids (`MRN-`), birth dates, street addresses, phone numbers and e-mail addresses. The same value always gives the same pseudonym, so the model can still group by it; the report and draft files on your machine keep the real values. Credential numbers show their last four characters only.', '',
  '**Sent in clear:** amounts, quantities, dates (including service dates), rates, procedure and drug names, CDT codes, claim, invoice, case and appointment numbers, carrier, insurer, lab and supplier names, finding codes, and the text columns listed per agent below. Staff and provider names (dentists, hygienists, technicians, the person who entered or approved an adjustment) are sent in clear: the worklists name who did what. Free-text columns (review text, adjustment notes, discount reasons) are sent as typed.', '',
  `**Free text, checked on ${DATE}:** a review whose text says "Juniper Vance here: Dr. Ada Stranger rushed my dog Waffles", written by the reviewer Juniper Vance, reached the model with the reviewer's name ${probeResult.reviewer_name_in_text_masked ? 'replaced by a pseudonym' : 'IN CLEAR'} (it is in a masked column of the same file), and with "Ada Stranger" ${probeResult.unknown_name_in_text_reaches_model ? 'as typed' : 'removed'} and the pet name "Waffles" ${probeResult.pet_name_in_text_reaches_model ? 'as typed' : 'removed'} (they are in no masked column). Masking works on known column names and the values registered from them; it is not de-identification.`, '',
  `**Canary check:** every agent with patient, pet or client data lists its fictional names in \`fixtures/phi-canaries.json\`; ${leaks} of ${out.reduce((t, o) => t + o.canaries, 0)} values reached any result.`, '',
  'The result goes to whatever model the user\'s assistant uses. Dental files are protected health information: use a model provider covered by a business associate agreement, or a local model. No compliance claim is made.', '',
  '| Agent | Masked fields | Text fields sent in clear | Staff or provider names among them | Free text among them | Canaries (leaks) |', '|---|---|---|---|---|---|',
  ...out.map((o) => `| ${o.agent} | ${o.masked.join(', ') || '-'} | ${o.text_in_clear.join(', ') || '-'} | ${o.names_in_clear.join(', ') || '-'} | ${o.free_text_in_clear.join(', ') || '-'} | ${o.canaries} (${o.canary_leaks}) |`), ''];
writeFileSync(join(ROOT, 'docs', `model-view-${DATE}.md`), L.join('\n'));
console.log(`Wrote docs/model-view-${DATE}.json and .md (${leaks} canary leak(s))`);
process.exit(leaks ? 1 : 0);
