import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Client Balances demo (fictional animal hospital and clients, as of 2026-11-16)',
  args: { balances: 'client-ar.csv', settings: 'settings.json', as_of: '2026-11-16' },
  line: (i) => `${i.status.padEnd(20)} ${i.client_id} balance ${String(i.balance).padStart(8)}  ${i.detail}`,
});
