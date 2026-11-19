import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Pet Insurance Claims demo (fictional animal hospital, insurers, pets and clients, as of 2026-11-16)',
  args: { claims: 'pet-claims.csv', settings: 'settings.json', as_of: '2026-11-16' },
  skip: (i) => ['paid', 'pending'].includes(i.status),
  line: (i) => `${i.status.padEnd(18)} ${i.claim_id} ${i.insurer.padEnd(22)} claimed ${String(i.claimed).padStart(7)}  ${i.detail}`,
});
