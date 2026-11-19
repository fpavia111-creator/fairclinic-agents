import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Controlled Drugs demo (fictional animal hospital, drugs, pets and staff, November 2026)',
  args: { log: 'controlled-log.csv', counts: 'counts.csv', settings: 'settings.json' },
  line: (i) => `${i.status.padEnd(17)} ${i.drug.padEnd(28)} ${i.date || ''}  ${i.detail}`,
});
