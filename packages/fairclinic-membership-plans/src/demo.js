import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Membership Plans demo (fictional dental practice and members, October 2026, as of 2026-11-16)',
  args: { members: 'members.csv', payments: 'payments-2026-10.csv', visits: 'visits.csv', month: '2026-10', as_of: '2026-11-16' },
  line: (i) => `${i.status.padEnd(20)} ${String(i.plan || '-').padEnd(13)} fee ${String(i.fee ?? '-').padStart(6)}  collected ${String(i.collected).padStart(6)}`,
});
