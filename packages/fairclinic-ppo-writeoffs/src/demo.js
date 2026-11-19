import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic PPO Write-offs demo (fictional dental practice, staff and patients, November 2026)',
  args: { adjustments: 'adjustments.csv', production: 'production-by-carrier.csv', settings: 'settings.json' },
  line: (i) => `${i.status.padEnd(15)} ${i.date}  ${i.type.padEnd(20)} ${String(i.amount).padStart(7)}  ${i.entered_by}`,
});
