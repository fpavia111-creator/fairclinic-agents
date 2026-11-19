import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic No-shows demo (fictional practice and patients, 2 to 13 November 2026)',
  args: { appointments: 'appointments.csv', settings: 'settings.json' },
  line: (i) => `${i.status.padEnd(25)} ${i.appointment_id.padEnd(4)} ${i.provider.padEnd(16)} ${i.date}  ${i.outcome}`,
});
