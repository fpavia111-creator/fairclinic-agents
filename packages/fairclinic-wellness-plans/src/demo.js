import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Wellness Plans demo (fictional animal hospital, plans, pets and clients, October 2026)',
  args: { enrollments: 'enrollments.csv', payments: 'payments-2026-10.csv', usage: 'plan-usage.csv', settings: 'settings.json', month: '2026-10', as_of: '2026-11-16' },
  line: (i) => `${i.status.padEnd(20)} ${i.plan.padEnd(11)} fee ${String(i.monthly_fee).padStart(4)}  used ${String(i.used_value).padStart(6)}  ${i.findings.map((f) => f.code).join(', ')}`,
});
