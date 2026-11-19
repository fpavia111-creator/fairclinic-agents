import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Boarding and Grooming demo (fictional animal hospital, pets and clients, November 2026)',
  args: { reservations: 'reservations.csv', invoices: 'shepherd-invoice-items.csv', settings: 'settings.json' },
  skip: (i) => ['ok', 'cancelled'].includes(i.status),
  line: (i) => `${i.status.padEnd(19)} ${i.reservation_id} ${i.service.padEnd(16)} stayed ${i.expected_units} invoiced ${i.invoiced_units}  missed ${i.missed_value}`,
});
