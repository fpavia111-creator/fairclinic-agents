import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Patient Balances demo (fictional dental practice and accounts, as of 2026-11-16)',
  args: { balances: 'ar-by-guarantor.csv', settings: 'settings.json', as_of: '2026-11-16' },
  line: (i) => `${i.status.padEnd(18)} balance ${String(i.balance).padStart(8)}  patient ${String(i.patient_portion).padStart(8)}  ${i.detail}`,
});
