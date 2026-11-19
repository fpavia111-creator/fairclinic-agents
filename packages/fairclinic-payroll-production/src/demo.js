import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Payroll Production demo (fictional clinic and staff, October 2026)',
  args: { payroll: 'payroll-register.csv', revenue: 'collections-by-period.csv', settings: 'settings.json' },
  line: (i) => `${i.status.padEnd(17)} ${i.period_start} ${(i.employee || '(period)').padEnd(16)} hours ${String(i.hours).padStart(6)}  pay ${String(i.gross_pay).padStart(9)}  ${i.payroll_pct === null ? '' : `${i.payroll_pct}% of collections`}`,
});
