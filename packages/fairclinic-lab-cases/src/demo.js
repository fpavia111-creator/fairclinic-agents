import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Lab Cases demo (fictional dental practice, labs and patients, as of 2026-11-16)',
  args: { cases: 'lab-cases.csv', invoices: 'lab-invoices.csv', settings: 'settings.json', as_of: '2026-11-16' },
  line: (i) => `${i.status.padEnd(18)} ${i.case_id.padEnd(5)} ${i.invoice_number.padEnd(9)} ${i.lab.padEnd(22)} ${i.findings[0] ? i.findings[0].detail : ''}`,
});
