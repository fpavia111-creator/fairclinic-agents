import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Sterilization Logs demo (fictional clinic and sterilizers, 2 to 13 November 2026, as of 2026-11-16)',
  args: { cycles: 'cycle-log.csv', spores: 'spore-tests.csv', settings: 'settings.json', as_of: '2026-11-16' },
  line: (i) => `${i.status.padEnd(21)} ${i.sterilizer.padEnd(12)} ${i.date}  ${i.detail}`,
});
