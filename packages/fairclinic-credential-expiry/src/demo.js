import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Credential Expiry demo (fictional practice, people and credentials, as of 2026-11-16)',
  args: { credentials: 'credentials.csv', settings: 'settings.json', as_of: '2026-11-16' },
  line: (i) => `${i.status.padEnd(17)} ${i.holder.padEnd(18)} ${i.credential.padEnd(34)} ${i.expires || '-'}`,
});
