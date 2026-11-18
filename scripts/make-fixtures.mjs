#!/usr/bin/env node
// Writes every agent's fictional fixtures (X12 files, CSV exports, configs) from the
// shared fictional practice in fixture-world.mjs, so the fixtures stay consistent
// and can be regenerated. Each section plants the issues its agent's evals expect.
//
//   node scripts/make-fixtures.mjs            all agents
//   node scripts/make-fixtures.mjs yarrow     only agents whose name starts with this
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as W from './fixture-world.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { buildX12 } = await import(pathToFileURL(join(ROOT, 'packages/fairclinic-core/src/hc-x12.js')).href);
const only = process.argv[2] || '';
const sections = {};
export const section = (name, fn) => { sections[name] = fn; };
const writer = (agent) => {
  const dir = join(ROOT, 'packages', agent, 'fixtures');
  return (rel, text) => { const f = join(dir, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, typeof text === 'string' ? text : JSON.stringify(text, null, 2) + '\n'); };
};
const readme = (agent, title, lines, patients) => {
  const w = writer(agent);
  w('README.md', `# ${title} fixtures\n\nEverything here is fictional: the practice (${W.PRACTICE.name}), the payers (${W.PAYERS.map((p) => p.name).join(', ')}), the patients, member ids and claim numbers. NPIs are made-up numbers that pass the check digit; any match with a real provider is a coincidence. Regenerate with \`npm run fixtures\` from the repository root.\n\n${lines.map((l) => `- ${l}`).join('\n')}\n`);
  w('phi-canaries.json', { note: 'Fictional patient identifiers used in these fixtures. The shared tests check that no eval result returns any of them to the model.', values: W.canaries(patients) });
};
export const ctx = { W, buildX12, writer, readme };

for (const f of ['fixtures-a.mjs', 'fixtures-b.mjs', 'fixtures-c.mjs']) if (existsSync(join(ROOT, 'scripts', f))) (await import(pathToFileURL(join(ROOT, 'scripts', f)).href)).default(section, ctx);

let n = 0;
for (const [name, fn] of Object.entries(sections)) {
  if (only && !name.startsWith(only)) continue;
  if (!existsSync(join(ROOT, 'packages', name))) { console.error(`skip ${name}: no package`); continue; }
  fn(); n++;
}
console.log(`wrote fixtures for ${n} agent(s)`);
