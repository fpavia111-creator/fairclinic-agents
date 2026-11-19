import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Hygiene Production demo (fictional dental practice and hygienists, 2 to 6 November 2026)',
  args: { hours: 'hygiene-hours.csv', procedures: 'hygiene-procedures.csv', settings: 'settings.json' },
  line: (i) => `${i.status.padEnd(13)} ${i.hygienist.padEnd(11)} ${String(i.production_per_hour).padStart(7)} per hour  open ${i.open_pct}%  perio ${i.perio_share_pct}%`,
});
