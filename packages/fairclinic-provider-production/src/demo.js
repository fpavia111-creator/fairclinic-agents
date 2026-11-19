import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Provider Production demo (fictional dental practice, July to October 2026)',
  args: { production: 'production-by-provider.csv', settings: 'settings.json' },
  line: (i) => `${i.status.padEnd(17)} ${i.provider.padEnd(16)} ${i.month}  gross ${String(i.gross_production ?? '-').padStart(8)}  collected ${String(i.collection_pct ?? '-').padStart(6)}%`,
});
