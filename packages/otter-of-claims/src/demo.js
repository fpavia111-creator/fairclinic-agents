import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairclinic-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  process.stdout.write(`Otter of Claims demo (fictional dental practice and patients, as of 2026-11-16) in ${rt.root}\n`);
  const f = { claims: 'claims-outstanding.csv', settings: 'settings.json', as_of: '2026-11-16' };
  const r = await rt.call('otter_check', f);
  printStep('Age the open claims', r);
  for (const i of r.result.items.filter((x) => x.status !== 'closed' && x.status !== 'waiting')) process.stdout.write(`    ${i.status.padEnd(18)} ${i.claim_id.padEnd(8)} ${String(i.age_days ?? '-').padStart(4)} days  ${String(i.outstanding).padStart(8)}  ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Write the list for the billing team', await rt.call('otter_write_report', f));
  printStep('Agent tries to send a claim itself', await rt.call('claim_submit', {}));
}
