import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Pharmacy Margins demo (fictional animal hospital price list)',
  args: { prices: 'pharmacy-prices.csv', sales: 'sales-month.csv', settings: 'settings.json' },
  line: (i) => `${i.status.padEnd(21)} ${i.item.padEnd(34)} cost ${String(i.cost).padStart(6)}  price ${String(i.price).padStart(6)}  margin ${i.margin_pct}%`,
});
