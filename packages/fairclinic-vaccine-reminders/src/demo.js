import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Vaccine Reminders demo (fictional animal hospital, pets and clients, as of 2026-11-16)',
  args: { reminders: 'reminders.csv', settings: 'settings.json', as_of: '2026-11-16' },
  skip: (i) => ['not_due', 'inactive', 'booked', 'reminded'].includes(i.status),
  line: (i) => `${i.status.padEnd(21)} ${i.species.padEnd(7)} ${i.reminder.padEnd(16)} ${i.detail}`,
});
