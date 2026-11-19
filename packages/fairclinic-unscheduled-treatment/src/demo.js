import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Unscheduled Treatment demo (fictional dental practice and patients, as of 2026-11-16)',
  args: { plans: 'treatment-plans.csv', settings: 'settings.json', as_of: '2026-11-16' },
  skip: (i) => ['scheduled', 'done', 'declined'].includes(i.status),
  line: (i) => `${i.status.padEnd(21)} accepted ${String(i.unscheduled_accepted).padStart(7)}  proposed ${String(i.unscheduled_proposed).padStart(7)}  benefits left ${i.remaining_benefit ?? '-'}`,
});
