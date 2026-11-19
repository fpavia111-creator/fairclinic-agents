import { fileURLToPath } from 'node:url';
import { clinicDemo } from 'fairclinic-core';

export const demo = (manifest) => clinicDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  intro: 'Fairclinic Review Replies demo (fictional clinic and reviews, as of 2026-11-16)',
  args: { reviews: 'reviews.csv', settings: 'settings.json', as_of: '2026-11-16' },
  skip: (i) => i.status === 'replied',
  line: (i) => `${i.status.padEnd(20)} ${i.review_id} ${i.rating} stars${i.mentions_health ? '  mentions health details' : ''}`,
});
