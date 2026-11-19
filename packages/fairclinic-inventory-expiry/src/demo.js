import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Inventory Expiry demo (fictional animal hospital stock, as of 2026-11-16)',
  args: { stock: 'stock-on-hand.csv', counts: 'count-sheet.csv', settings: 'settings.json', as_of: '2026-11-16' },
  line: (i) => `${i.status.padEnd(15)} ${i.item.padEnd(26)} ${i.lot.padEnd(7)} ${i.detail}`,
});
