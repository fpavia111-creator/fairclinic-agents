import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Referral Tracking demo (fictional practices and patients, as of 2026-11-16)',
  args: { outgoing: 'referrals-out.csv', incoming: 'referrals-in.csv', settings: 'settings.json', as_of: '2026-11-16' },
  skip: (i) => ['ok', 'waiting'].includes(i.status),
  line: (i) => `${i.status.padEnd(19)} ${i.direction.padEnd(4)} ${i.date}  ${i.party.padEnd(26)} ${i.detail}`,
});
