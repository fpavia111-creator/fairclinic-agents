import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Staff Discounts demo (fictional animal hospital, staff and clients, November 2026)',
  args: { discounts: 'discounts.csv', settings: 'settings.json' },
  line: (i) => `${i.status.padEnd(25)} ${i.invoice_number} ${i.discount_type.padEnd(20)} ${String(i.amount).padStart(7)}  by ${i.entered_by}, approved ${i.approved_by || '-'}`,
});
