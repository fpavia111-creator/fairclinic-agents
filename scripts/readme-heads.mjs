#!/usr/bin/env node
// Writes the hand-editable top of an agent README (title, what it does, what it never
// does, quick start, limits) when the package has no README yet. The generated middle
// part comes from scripts/readme-sections.mjs. Existing READMEs are left alone.
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PK = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages');
const UP = { era: 'ERA', ppo: 'PPO', writeoffs: 'Write-offs' };
export const titleOf = (n) => n.split('-').map((w) => UP[w] || w[0].toUpperCase() + w.slice(1)).join(' ');

for (const n of readdirSync(PK).filter((x) => x.startsWith('fairclinic-') && x !== 'fairclinic-core').sort()) {
  const f = join(PK, n, 'README.md'); if (existsSync(f)) continue;
  const { manifest: m } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  const refused = m.tools.filter((t) => (m.policy.rules.find((r) => r.tool === t.name) || {}).decision === 'block').map((t) => t.description.replace(/^Listed so agents can see it is refused\.\s*/, ''));
  const never = refused.length ? `\n\n**${refused.join(' ')}**` : '';
  const txt = `# ${titleOf(n)} (\`${n}\`)

${m.description}${never}

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [\`fairclinic-core\`](../fairclinic-core)

\`\`\`bash
npx -y ${n} demo
npx -y ${n} mcp --root ./clinic-exports
\`\`\`

## Limits

- It checks only what is in the files and settings you load. Thresholds and fee schedules are as current as what you give it; the defaults are starting points, not anyone's policy or a standard of care.
- It is not clinical, legal, tax, coding or compliance advice, and it never decides whether a rule is met. A person reviews every result before anything is billed, sent, filed, refunded or corrected; the agent does none of those.
- Export layouts named in "Columns it reads" were written from knowledge of each system and not tested against a live account; \`inspect\` shows how a file was read.
- Masking keeps names and contact details away from the model; it does not replace your privacy program. Dental files are protected health information: a business associate agreement is signed before any file is held.
`;
  writeFileSync(f, txt); console.log(`${n}: README head written`);
}
