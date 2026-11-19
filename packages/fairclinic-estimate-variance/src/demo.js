import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Estimate Variance demo (fictional animal hospital, pets and clients, as of 2026-11-16)',
  args: { estimates: 'estimates.csv', invoices: 'invoices.csv', settings: 'settings.json', as_of: '2026-11-16' },
  skip: (i) => ['ok', 'open'].includes(i.status),
  line: (i) => `${i.status.padEnd(25)} ${i.estimate_id}  ${i.low}-${i.high}  invoiced ${i.invoiced ?? '-'}`,
});
