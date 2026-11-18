import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Beaver of Remits demo (fictional dental practice, carriers and patients)',
  args: { era: 'era-2026-11.835', posted: 'posted-payments.csv', settings: 'settings.json' },
  line: (i) => `${i.status.padEnd(19)} ${i.claim_id.padEnd(6)} ${i.check_number.padEnd(9)} ERA ${String(i.era_paid ?? '-').padStart(7)}  posted ${String(i.posted_paid ?? '-').padStart(7)}`,
});
