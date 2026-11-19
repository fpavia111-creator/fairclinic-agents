import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Card Deposits demo (fictional clinic, processor and bank, November 2026)',
  args: { batches: 'processor-batches.csv', deposits: 'bank-lines.csv', pms: 'pms-card-totals.csv', settings: 'settings.json' },
  line: (i) => `${i.status.padEnd(17)} ${String(i.batch_id || '-').padEnd(5)} ${i.date}  net ${String(i.net ?? '-').padStart(8)}  deposited ${i.deposited ?? '-'}`,
});
