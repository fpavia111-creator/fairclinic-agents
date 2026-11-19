import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Recall Gaps demo (fictional dental practice and patients, as of 2026-11-16)',
  args: { recall: 'recall.csv', visits: 'hygiene-visits.csv', settings: 'settings.json', as_of: '2026-11-16' },
  skip: (i) => ['scheduled', 'not_due', 'inactive'].includes(i.status),
  line: (i) => `${i.status.padEnd(19)} ${i.recall_type.padEnd(18)} due ${i.due_date}  ${i.detail}`,
});
