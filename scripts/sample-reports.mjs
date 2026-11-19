#!/usr/bin/env node
// Writes sample-reports/: the HTML and CSV that selected agents write from their own fictional fixtures,
// using each agent's "write-report" eval case, plus an index page. English only.
//   node scripts/sample-reports.mjs [agent ...]
import { readFileSync, writeFileSync, mkdirSync, cpSync, mkdtempSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PK = join(ROOT, 'packages'); const OUT = join(ROOT, 'sample-reports');
const { AgentRuntime, escapeHtml, htmlPage } = await import(pathToFileURL(join(PK, 'fairclinic-core', 'src', 'index.js')).href);
const DEFAULT = ['fairclinic-claims-aging', 'fairclinic-era-posting', 'fairclinic-unscheduled-treatment', 'fairclinic-recall-gaps', 'fairclinic-sterilization-logs', 'fairclinic-missed-charges', 'fairclinic-controlled-drugs', 'fairclinic-vaccine-reminders', 'fairclinic-pet-insurance-claims', 'fairclinic-card-deposits'];
const agents = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;
mkdirSync(OUT, { recursive: true });
const rows = [];
for (const n of agents) {
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  const cases = JSON.parse(readFileSync(join(PK, n, 'evals', 'cases.json'), 'utf8')).cases;
  const c = cases.find((x) => x.id === 'write-report'); if (!c) { console.error(`${n}: no write-report case`); continue; }
  const root = mkdtempSync(join(tmpdir(), `${n}-sample-`)); cpSync(join(PK, n, 'fixtures'), join(root, 'fixtures'), { recursive: true });
  const rt = new AgentRuntime(manifest, { root, stateDir: join(root, '.fairclinic'), audit: false });
  const r = await rt.call(c.tool, { ...c.args, out_dir: 'out' });
  if (r.status !== 'executed') { console.error(`${n}: ${r.status} ${r.reason}`); continue; }
  const short = n.replace(/^fairclinic-/, '');
  for (const f of r.result.files) { const ext = f.endsWith('.html') ? 'html' : 'csv'; cpSync(join(root, f), join(OUT, `${short}.${ext}`)); }
  rows.push({ n, short, summary: r.result.summary.replace(/ Files: .*$/, '') });
  console.log(`${n}: written`);
}
const body = [
  '<h1>Fairclinic sample reports</h1>',
  '<p class="mut">Written by the agents from their own fictional fixtures (no real practice, patient, pet, client, payer or insurer). Report files keep names for the team; only results sent to the AI model are masked.</p>',
  '<table><thead><tr><th>Agent</th><th>What it found</th><th>Files</th></tr></thead><tbody>',
  ...rows.map((x) => `<tr><td>${escapeHtml(x.n)}</td><td>${escapeHtml(x.summary)}</td><td><a href="${x.short}.html">HTML</a> · <a href="${x.short}.csv">CSV</a></td></tr>`),
  '</tbody></table>',
].join('\n');
writeFileSync(join(OUT, 'index.html'), htmlPage({ title: 'Fairclinic sample reports', bodyHtml: body, footer: 'Fictional data. Nothing was sent, filed or paid.', lang: 'en' }));
console.log(`${rows.length} sample report(s) in sample-reports/`);
