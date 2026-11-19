// Review replies: what needs a reply, the disclosure check on reply wording, and the reply draft.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkReviews, checkReplyText, replyText } from '../src/index.js';

const rv = (over = {}) => ({ review_id: 'R1', platform: 'Example Reviews', date: '2026-11-10', rating: '5', reviewer_name: 'A Reviewer', text: 'Nice people.', replied: '', ...over });
const st = (over, settings = {}) => checkReviews([rv(over)], { settings, asOf: '2026-11-16' }).items[0];

test('an unanswered review needs a reply; low ratings come first; answered ones are replied', () => {
  assert.equal(st({}).status, 'needs_reply'); assert.equal(st({ rating: '2' }).status, 'low_rating_no_reply'); assert.equal(st({ replied: '2026-11-11' }).status, 'replied');
  assert.equal(st({ rating: '4' }, { low_rating: 4 }).status, 'low_rating_no_reply');
});

test('a review that mentions health or care details is marked', () => {
  assert.equal(st({ text: 'My dog had surgery here.' }).mentions_health, true); assert.equal(st({}).mentions_health, false);
});

test('reply wording that confirms a visit, care, records or a date is refused', () => {
  for (const t of ['Sorry about your appointment.', 'We treated your pet with care.', 'Our records show you were here.', 'See you on Monday.', 'We hope the infection clears.']) assert.equal(checkReplyText(t).ok, false, t);
});

test('general wording passes', () => {
  assert.equal(checkReplyText('Thank you for the feedback. Please call us so we can talk.').ok, true);
});

test('a reply naming a reviewer from the file is refused', () => {
  assert.equal(checkReplyText('Thanks, Pat Smith!', { names: ['Pat Smith'] }).ok, false);
});

test('the draft for a high rating thanks; for a low rating invites a call; neither repeats the review', () => {
  const hi = replyText({ review_id: 'R1', rating: 5, platform: 'X' }, { practice: 'Example Clinic' });
  const lo = replyText({ review_id: 'R2', rating: 1, platform: 'X' }, { practice: 'Example Clinic', phone: '555-0100', signer: 'Office manager' });
  assert.match(hi, /Thank you for taking the time/); assert.match(lo, /Please call us at 555-0100/);
  for (const t of [hi, lo]) assert.equal(checkReplyText(t.split('\n').slice(2, 6).join(' ')).ok, true);
});

test('the draft leaves the phone, signer and practice to confirm when not given', () => {
  assert.match(replyText({ review_id: 'R2', rating: 2 }), /\[TO CONFIRM practice phone\].*\[TO CONFIRM manager name\]/s);
});

test('the average rating covers rated reviews', () => {
  assert.equal(checkReviews([rv(), rv({ review_id: 'R2', rating: '2' }), rv({ review_id: 'R3', rating: '' })], { asOf: '2026-11-16' }).average_rating, 3.5);
});

test('the draft file is plain and the result the model sees has no reviewer name', async () => {
  const { call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const d = await call('reviews_draft_reply', { reviews: 'fixtures/reviews.csv', settings: 'fixtures/settings.json', as_of: '2026-11-16', review: 'RV4' });
  assert.equal(d.status, 'executed', d.reason);
  const text = readFileSync(d.result.file, 'utf8');
  assert.doesNotMatch(text, /Felix|Oduya|40 minutes|appointment/); assert.doesNotMatch(JSON.stringify(d), /Oduya/);
});
