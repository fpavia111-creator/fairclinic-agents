#!/usr/bin/env node
// One-off rename of an agent package from its themed name to fairclinic-<what it does> (18 Nov 2026).
//   node scripts/rename-agent.mjs <old-name> <new-name> <old-prefix> <new-prefix> "<Old Title>" "<New Title>"
// Moves the folder and bin, replaces names, titles, tool prefixes and output folders in every text
// file of the package, removes the README (regenerate it) and notes the rename in the CHANGELOG.
import { readdirSync, readFileSync, writeFileSync, statSync, renameSync, existsSync, rmSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PK = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages');
const [oldName, newName, oldP, newP, oldTitle, newTitle] = process.argv.slice(2);
if (!newTitle) { console.error('usage: rename-agent.mjs <old> <new> <old-prefix> <new-prefix> "<Old Title>" "<New Title>"'); process.exit(2); }
const from = join(PK, oldName), to = join(PK, newName);
if (!existsSync(from)) { console.error(`${oldName} not found`); process.exit(1); }
renameSync(from, to);
if (existsSync(join(to, 'bin', `${oldName}.js`))) renameSync(join(to, 'bin', `${oldName}.js`), join(to, 'bin', `${newName}.js`));
for (const d of ['fairclinic-out', '.fairclinic']) rmSync(join(to, d), { recursive: true, force: true });
const OldCap = oldP[0].toUpperCase() + oldP.slice(1);
const pairs = [
  [oldName, newName], [oldTitle, newTitle],
  [`fairclinic-out/${oldP}`, `fairclinic-out/${newP}`], [`${oldP}_`, `${newP}_`], [`'${oldP}'`, `'${newP}'`],
  [`${oldP}-`, `${newP}-`], [OldCap, newTitle], [oldP, newP],
];
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (n === 'node_modules' ? [] : walk(p)) : [p]; });
for (const f of walk(to)) {
  if (!/\.(js|mjs|cjs|json|md|csv|txt|835)$/i.test(f)) continue;
  let s = readFileSync(f, 'utf8'); const before = s;
  for (const [a, b] of pairs) s = s.split(a).join(b);
  if (s !== before) writeFileSync(f, s);
}
rmSync(join(to, 'README.md'), { force: true });
appendFileSync(join(to, 'CHANGELOG.md'), `- Renamed from \`${oldName}\` to \`${newName}\` (named after what it does); tool prefix \`${oldP}_\` is now \`${newP}_\`.\n`);
console.log(`${oldName} -> ${newName}`);
