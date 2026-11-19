import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Supply Costs demo (fictional practice and suppliers, August to October 2026)',
  args: { invoices: 'supply-invoices.csv', production: 'production-by-month.csv', settings: 'settings.json' },
  line: (i) => `${i.status.padEnd(15)} ${i.month}  ${i.kind === 'month' ? `supplies ${i.supplies} (${i.supply_pct}%)` : `${i.supplier}: ${i.item} ${i.amount}`}`,
});
