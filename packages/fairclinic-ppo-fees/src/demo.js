import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic PPO Fees demo (fictional practice fee schedule and PPO plans)',
  args: { fees: 'office-fees.csv', schedules: 'ppo-schedules.csv', paid: 'allowed-paid.csv', settings: 'settings.json' },
  line: (i) => `${i.status.padEnd(20)} ${i.plan.padEnd(21)} ${i.code}  fee ${String(i.office_fee ?? '-').padStart(7)}  plan ${String(i.plan_allowed ?? '-').padStart(6)}`,
});
