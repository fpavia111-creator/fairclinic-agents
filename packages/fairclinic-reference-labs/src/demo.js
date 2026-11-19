import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Reference Labs demo (fictional animal hospital, reference lab, pets and clients, November 2026)',
  args: { lab: 'lab-invoice.csv', charges: 'client-charges.csv', settings: 'settings.json' },
  line: (i) => `${i.status.padEnd(19)} ${i.accession.padEnd(7)} ${i.test.padEnd(26)} cost ${String(i.lab_cost ?? '-').padStart(6)}  charged ${i.charged ?? '-'}`,
});
