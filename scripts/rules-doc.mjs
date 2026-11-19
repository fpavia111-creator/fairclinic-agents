#!/usr/bin/env node
// Every rule a practice can change, per agent: the settings each check reads, with the default and
// where it lives, plus the few built-in lists that come from an outside standard. Answers Kurt's
// "who maintains rules and thresholds" question with a table that is regenerated, not written by hand.
//
//   node scripts/rules-doc.mjs     write docs/rules-<date>.md and .json
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PK = join(ROOT, 'packages'); const DATE = '2026-11-19';
const rows = [];
for (const n of readdirSync(PK).filter((x) => /^fairclinic-(?!core$)/.test(x)).sort()) {
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  for (const [schema, s] of Object.entries(manifest.configSchemas || {})) {
    for (const [k, p] of Object.entries(s.properties || {})) {
      if (k === 'note') continue;
      const d = /\(default ([^)]+)\)/.exec(p.description || '');
      rows.push({ agent: n, setting: k, schema, what: (p.description || '').replace(/\s*\(default [^)]+\)/, ''), default: d ? d[1] : (p.type === 'object' || p.type === 'array' ? 'none (you list them)' : 'none') });
    }
  }
}
// Built-in lists taken from an outside standard: changing them needs a new release.
const BUILT_IN = [
  ['fairclinic-era-posting, fairclinic-core (hc-x12.js)', 'X12 835 claim status 4 read as denied and 22 as a reversal (any other status as processed); a claim paid 0 with a non-contractual CO adjustment read as denied; PLB entries read as provider-level adjustments', 'ASC X12 835 5010 (005010X221A1) code values, as recalled; the 835 layout was tested on the Nevada Medicaid sample on 19 Nov 2026', 'written 18 Nov 2026'],
  ['fairclinic-era-posting', 'Contractual reason codes 45, 253 and 131 (a setting: contractual_reasons)', 'X12 Claim Adjustment Reason Codes, as recalled; not checked against the published list', 'written 18 Nov 2026'],
  ['fairclinic-credential-expiry', 'Board status words read as not active (expired, closed, revoked, suspended, surrender, terminated, denied, inactive, retired, superseded, cancelled)', 'The status values in the Washington State Department of Health credential file, read 19 Nov 2026', '19 Nov 2026'],
  ['fairclinic-claims-aging, fairclinic-pet-insurance-claims, fairclinic-preauthorizations, and others', 'Status words in practice exports (Sent, Unsent, Denied, Approved, Cancelled, No-show ...) and Open Dental claim status letters', 'Written from knowledge of the exports; not checked against vendor documentation', 'written 18 Nov 2026'],
];
mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(join(ROOT, 'docs', `rules-${DATE}.json`), JSON.stringify({ date: DATE, settings: rows, built_in: BUILT_IN.map(([where, what, source, date]) => ({ where, what, source, date })) }, null, 2) + '\n');
const agents = new Set(rows.map((r) => r.agent));
const L = [`# Rules, thresholds and who maintains them (${DATE})`, '', 'Made by `node scripts/rules-doc.mjs`.', '',
  `**${rows.length} settings across ${agents.size} agents.** Every threshold (days, percentages, targets, fees, plan contents, price lists, carrier filing limits) is a setting in a JSON file the practice passes as the \`settings\` argument. The defaults below are starting points chosen by the author on 18 Nov 2026; none is a regulation, a payer's contract or a standard of care, and nobody from a dental or veterinary practice has reviewed them yet. The schema refuses a misspelt key or a value out of range, so a typo cannot silently fall back to a default. A practice updates a rule by editing its settings file; a column layout that changed is fixed in \`fairclinic-sources.json\` without a release (see each README, "Exports it reads").`, '',
  '**Rules that come from an outside standard** (a new release is needed when the standard changes):', '',
  '| Where | Rule | Source | Date |', '|---|---|---|---|', ...BUILT_IN.map((b) => `| ${b.join(' | ')} |`), '',
  'There are no dated regulatory rules (filing deadlines set by law, DEA schedules, CDT code validity) inside the checks: carrier filing limits, CE hours and controlled-drug witness rules are entered by the practice from its own contracts, board and protocol.', '',
  '| Agent | Setting | What it does | Default |', '|---|---|---|---|',
  ...rows.map((r) => `| ${r.agent} | \`${r.setting}\` | ${r.what.replace(/\|/g, '/')} | ${r.default} |`), ''];
writeFileSync(join(ROOT, 'docs', `rules-${DATE}.md`), L.join('\n'));
console.log(`Wrote docs/rules-${DATE}.md: ${rows.length} settings across ${agents.size} agents`);
