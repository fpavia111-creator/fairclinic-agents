import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Pre-authorizations demo (fictional dental practice, carriers and patients, as of 2026-11-16)',
  args: { preauths: 'preauths.csv', settings: 'settings.json', as_of: '2026-11-16' },
  skip: (i) => i.status === 'ok' || i.status === 'pending',
  line: (i) => `${i.status.padEnd(22)} ${i.preauth_id.padEnd(5)} ${i.code.padEnd(6)} ${String(i.approved_amount ?? '-').padStart(7)}  ${i.findings.map((f) => f.code).join(', ')}`,
});
