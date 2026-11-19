// Fairclinic Review Replies: online reviews that need a reply, reply drafts that never confirm the reviewer is a
// patient or client, and a check of any proposed reply for wording that would disclose care or a relationship.
import { fld, str, num, isoDate, daysBetween, tally } from 'fairclinic-core';

export const REVIEW_FIELDS = Object.freeze({
  review_id: fld(['Review ID', 'Review', 'ID', 'Review #'], { required: true, translate: false }),
  platform: fld(['Platform', 'Site', 'Source'], { translate: false }),
  date: fld(['Date', 'Review Date', 'Posted', 'Created'], { type: 'date', required: true }),
  rating: fld(['Rating', 'Stars', 'Score'], { type: 'number', required: true, translate: false }),
  reviewer_name: fld(['Reviewer', 'Reviewer Name', 'Author', 'Name']),
  text: fld(['Text', 'Review Text', 'Comment', 'Review Body'], { translate: false }),
  replied: fld(['Replied', 'Reply Date', 'Response Date', 'Owner Reply'], { translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    low_rating: { type: 'number', minimum: 1, maximum: 5, description: 'Ratings at or below this are replied to first (default 3)' },
    practice_name: { type: 'string', maxLength: 120, description: 'Practice name for reply drafts' },
  },
});

export const STATUSES = ['low_rating_no_reply', 'needs_reply', 'replied'];
const HEALTH = /\b(dog|cat|puppy|kitten|pet|tooth|teeth|cleaning|crown|filling|root canal|implant|extraction|surgery|x-?rays?|vaccin\w*|diagnos\w*|treatment|medication|prescription|pain|infection|sick|died|euthan\w*)\b/i;
// Wording in a reply that would confirm a relationship or care, or repeat health details.
const DISCLOSE = [
  [/\b(your|the) (dog|cat|pet|puppy|kitten|visit|appointment|treatment|procedure|surgery|cleaning|exam|records?|chart|x-?rays?|medication|prescription|bill|invoice|account)\b/i, 'refers to the reviewer\'s own visit, pet, records or bill, which confirms they are a patient or client'],
  [/\bwe (saw|treated|examined|cleaned|extracted|prescribed|billed|charged)\b/i, 'says what the practice did for the reviewer'],
  [/\b(diagnos\w*|condition|infection|disease|tumou?r|allerg\w*|dental (work|cleaning))\b/i, 'mentions a health condition or procedure'],
  [/\b(our records|in our system|your file|according to our notes)\b/i, 'refers to the practice\'s records about the reviewer'],
  [/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\b/i, 'mentions a date, which can tie the reviewer to a visit'],
];

export function checkReviews(rows, { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10); const low = settings.low_rating || 3;
  const items = rows.filter((r) => str(r.review_id) && isoDate(r.date)).map((r) => {
    const rating = num(r.rating); const rep = str(r.replied); const replied = !!rep && !/^(n|no|false|0)$/i.test(rep);
    const text = str(r.text); const health = HEALTH.test(text);
    const status = replied ? 'replied' : rating !== null && rating <= low ? 'low_rating_no_reply' : 'needs_reply';
    const notes = [];
    if (health) notes.push('The review mentions health or care details; the reply must not confirm or add to them.');
    if (!replied) notes.push(`Posted ${daysBetween(isoDate(r.date), today)} day(s) ago with no reply.`);
    return { review_id: str(r.review_id), platform: str(r.platform), date: isoDate(r.date), rating, reviewer_name: str(r.reviewer_name), excerpt: text.length > 280 ? `${text.slice(0, 277)}...` : text, mentions_health: health, status, detail: notes.join(' ') };
  });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (a.rating ?? 9) - (b.rating ?? 9) || (a.date < b.date ? -1 : 1));
  const rated = items.filter((i) => i.rating !== null);
  return { as_of: today, reviews: items.length, average_rating: rated.length ? Math.round((rated.reduce((s, i) => s + i.rating, 0) / rated.length) * 100) / 100 : null, to_reply: items.filter((i) => i.status !== 'replied').length, mention_health: items.filter((i) => i.mentions_health).length, by_status: tally(items, 'status'), items };
}

/** Check a proposed reply for wording that would disclose a relationship, care, records or dates. */
export function checkReplyText(reply, { names = [] } = {}) {
  const t = str(reply); const issues = [];
  for (const [re, why] of DISCLOSE) { const m = re.exec(t); if (m) issues.push({ found: m[0], why }); }
  for (const n of names.filter((x) => str(x).length >= 3)) if (t.toLowerCase().includes(str(n).toLowerCase())) issues.push({ found: '(a name from the reviews file)', why: 'names a reviewer or a patient' });
  return { ok: issues.length === 0, issues };
}

/** A reply that thanks or invites contact and confirms nothing. */
export function replyText(item, { practice, phone, signer } = {}) {
  const p = practice || '[TO CONFIRM practice name]';
  const body = item.rating !== null && item.rating >= 4
    ? `Thank you for taking the time to share this. We pass kind words on to the whole team at ${p}.`
    : `Thank you for the feedback. We take every comment seriously and would like to talk with you directly. Please call us at ${phone || '[TO CONFIRM practice phone]'} and ask for ${signer || '[TO CONFIRM manager name]'}.`;
  return [`# Reply to review ${item.review_id} (${item.platform || 'review site'}, ${item.rating ?? '?'} stars)`, '', '**To:** public reply on the review site', '', body, '', `${signer || '[TO CONFIRM signer name]'}, ${p}`, '', '_This reply does not confirm that the reviewer is a patient or client and repeats no details from the review._'].join('\n');
}
