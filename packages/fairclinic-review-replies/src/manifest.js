import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, sectionTitle, findItem } from 'fairclinic-core';
import { REVIEW_FIELDS, SETTINGS_SCHEMA, STATUSES, checkReviews, checkReplyText, replyText } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  reviews: fileArg('Online reviews under --root (export from your review platform or a spreadsheet): review id, platform, date, rating, reviewer, text, replied'),
  settings: fileArg('Optional settings JSON: low_rating, practice_name'),
  as_of: AS_OF_ARG,
};
const settingsOf = (a, ctx) => (a.settings ? ctx.readJson(a.settings, 'review_settings') : {});
const run = (a, ctx) => checkReviews(ctx.records(a.reviews, 'reviews'), { settings: settingsOf(a, ctx), asOf: a.as_of });
const summary = (o) => `${o.reviews} review(s), average ${o.average_rating}. ${o.to_reply} without a reply (${o.by_status.low_rating_no_reply || 0} low-rated). ${o.mention_health} mention health or care details: replies must stay general.`;

export const manifest = clinicAgent({
  pkg, prefix: 'reviews', title: 'Fairclinic Review Replies',
  description: pkg.description,
  args, required: ['reviews'], statuses: STATUSES,
  configSchemas: { review_settings: SETTINGS_SCHEMA },
  sources: { reviews: { label: 'Online reviews', args: ['reviews'], fields: REVIEW_FIELDS } },
  run, summary,
  check: { title: 'Find reviews to reply to', description: 'Every review with its rating, a short excerpt and a status: low_rating_no_reply, needs_reply or replied, and whether it mentions health or care details.' },
  reads: [{
    name: 'reviews_check_reply', title: 'Check a proposed reply', description: 'Check reply wording for anything that would confirm the reviewer is a patient or client, mention care, records or bills, give dates, or name a reviewer or patient from the file. Returns each problem with the words found.',
    properties: { reviews: args.reviews, reply: { type: 'string', maxLength: 4000, description: 'The reply text you plan to post' } }, required: ['reviews', 'reply'],
    run: (a, ctx) => { const rows = ctx.records(a.reviews, 'reviews'); const r = checkReplyText(a.reply, { names: rows.map((x) => x.reviewer_name) }); return { summary: r.ok ? 'No disclosure problems found in this wording. A person still reads it before posting.' : `${r.issues.length} problem(s): ${r.issues.map((i) => `"${i.found}" ${i.why}`).join('; ')}.`, ...r }; },
  }],
  report: {
    title: T9('Reviews to reply to', 'Zu beantwortende Bewertungen', 'Avis à traiter', 'Reseñas por responder', 'Avaliações a responder', 'Recensioni a cui rispondere', '返信が必要なレビュー', '待回复的评价', '답글이 필요한 리뷰'),
    base: 'reviews-to-reply',
    rows: (o) => o.items.filter((i) => i.status !== 'replied').map((i) => ({ status: i.status, review_id: i.review_id, platform: i.platform, date: i.date, rating: i.rating, reviewer_name: i.reviewer_name, mentions_health: i.mentions_health ? 'yes' : '', excerpt: i.excerpt, note: i.detail })),
    htmlColumns: ['status', 'review_id', 'platform', 'date', 'rating', 'mentions_health', 'note'],
    sections: (o) => [{ title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'The reply check looks for common wording that discloses a relationship or care; it cannot catch everything. A person reads every reply before it is posted. Not legal or privacy advice.', CLINIC_LIMITS.phi],
  },
  drafts: {
    noun: 'reply', verb: 'post', category: 'binding_send',
    title: 'Draft a reply to one review',
    description: 'Write drafts/reply-<hash>.md: a short public reply that thanks the reviewer or invites them to call, and never confirms they are a patient or client or repeats anything from the review. Marked DRAFT; one named person posts it after reviews_request_post.',
    required: ['reviews', 'review'],
    args: { ...args, review: { type: 'string', description: 'Review id from reviews_check' }, practice: { type: 'string', description: 'Practice name' }, phone: { type: 'string', description: 'Practice phone number' }, signer: { type: 'string', description: 'Name and role of the person signing' } },
    build: (a, ctx) => {
      const o = run(a, ctx); const i = findItem(o.items, 'review_id', a.review, ctx, { label: 'review' });
      const s = settingsOf(a, ctx);
      const text = replyText(i, { practice: a.practice || s.practice_name, phone: a.phone, signer: a.signer });
      const check = checkReplyText(text.split('\n').slice(2, 6).join(' '));
      if (!check.ok) throw new Error(`the draft wording failed its own disclosure check: ${check.issues.map((x) => x.found).join(', ')}`);
      return { id: i.review_id, text };
    },
  },
  refused: [{ name: 'review_post', category: 'binding_send', description: 'Never posts, edits or deletes a review reply on any platform.' }, REFUSE.message(), { name: 'review_flag', category: 'binding_send', description: 'Never reports, flags or asks a platform to remove a review.' }],
  prompt: {
    title: 'Reply to reviews', description: 'Walks the host model through review replies.',
    text: 'You are helping a clinic manager with fairclinic-review-replies. Rules: a reply never confirms that the reviewer is a patient or client, never mentions a pet, visit, treatment, bill or date, and never names anyone; it never argues. The agent never posts. 1. Call reviews_check. Lead with low-rated reviews with no reply. 2. Offer reviews_draft_reply for one review; if the manager writes their own wording, run reviews_check_reply on it first. 3. reviews_request_post waits for one named person, who posts it on the platform.',
  },
});
