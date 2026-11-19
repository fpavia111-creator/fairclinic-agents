import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Missed Charges demo (fictional animal hospital, pets and clients, 12 and 13 November 2026)',
  args: { treatments: 'treatment-sheet.csv', invoices: 'ezyvet-invoice-lines.csv', prices: 'price-list.csv' },
  line: (i) => `${i.status.padEnd(22)} ${i.visit_id.padEnd(6)} ${i.item.padEnd(26)} recorded ${i.recorded_qty} invoiced ${i.invoiced_qty}  missed ${i.missed_value}`,
});
