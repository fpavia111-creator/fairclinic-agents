// Fairclinic Claims Aging: dental insurance claims that are still open, aged from the date they were sent.
import { fld, str, num, round2, isoDate, daysBetween, addDays, bucketOf, payerKey, rollup, tally } from 'fairclinic-core';

export const CLAIM_FIELDS = Object.freeze({
  claim_id: fld(['Claim ID', 'Claim #', 'Claim Number', 'ClaimNum', 'Claim No'], { required: true, translate: false }),
  patient_name: fld(['Patient', 'Patient Name', 'PatName']),
  payer: fld(['Carrier', 'Carrier Name', 'Insurance', 'Insurance Carrier', 'Primary Carrier', 'Payer', 'CarrierName']),
  claim_type: fld(['Claim Type', 'Type', 'Primary/Secondary', 'ClaimType', 'Coverage'], { translate: false }),
  provider: fld(['Provider', 'Treating Provider', 'Dentist', 'ProvTreat']),
  date_of_service: fld(['Date of Service', 'DOS', 'Service Date', 'Proc Date', 'DateService'], { type: 'date' }),
  date_sent: fld(['Date Sent', 'Sent Date', 'Sent', 'DateSent', 'Submitted'], { type: 'date', translate: false }),
  billed: fld(['Claim Amount', 'Claim Fee', 'Billed', 'Total Fee', 'ClaimFee', 'Amount Billed'], { type: 'money', translate: 'billed' }),
  expected: fld(['Est. Insurance', 'Estimated Insurance', 'Ins Est', 'InsPayEst', 'Expected', 'Est Ins Portion'], { type: 'money', translate: false }),
  paid: fld(['Paid', 'Ins Paid', 'InsPayAmt', 'Insurance Paid', 'Amount Paid'], { type: 'money', translate: 'paid' }),
  status: fld(['Status', 'Claim Status', 'ClaimStatus'], { translate: false }),
  last_follow_up: fld(['Last Follow Up', 'Last Followup', 'Last Contact', 'Follow Up Date', 'Tracer Date'], { type: 'date', translate: false }),
  secondary_payer: fld(['Secondary Carrier', 'Secondary Insurance', 'Sec Carrier'], { translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    follow_up_days: { type: 'integer', minimum: 7, maximum: 180, description: 'Days after sending before a claim needs a follow-up (default 30)' },
    recontact_days: { type: 'integer', minimum: 3, maximum: 90, description: 'Days after the last follow-up before the next one (default 14)' },
    unsent_days: { type: 'integer', minimum: 1, maximum: 60, description: 'Days after the visit before an unsent claim is flagged (default 3)' },
    default_filing_days: { type: 'integer', minimum: 60, maximum: 730, description: 'Timely filing limit when the payer has none listed (default 365)' },
    filing_days: { type: 'object', additionalProperties: { type: 'integer', minimum: 30, maximum: 730 }, description: 'Timely filing limit in days by payer name' },
    warn_before_days: { type: 'integer', minimum: 7, maximum: 120, description: 'Warn this many days before the filing limit (default 45)' },
  },
});

// Status words practice systems use for a claim that is finished.
const CLOSED = /^(paid|received|closed|complete|completed|finalized|finalised|r)$/i;
const SENT = /^(sent|submitted|s|pending|in process|processing|accepted)$/i;
const DENIED = /^(denied|rejected|deny)$/i;

/**
 * Age and sort open dental claims.
 * Status per claim (one, most urgent first): denied, filing_risk, unsent, duplicate, follow_up, waiting, closed.
 */
export function ageClaims(rows, { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const followDays = settings.follow_up_days || 30, recontact = settings.recontact_days || 14, unsentDays = settings.unsent_days || 3;
  const defFiling = settings.default_filing_days || 365, warn = settings.warn_before_days || 45;
  const filing = Object.fromEntries(Object.entries(settings.filing_days || {}).map(([k, v]) => [payerKey(k), v]));
  // A claim exported twice (once per procedure line) is one claim: keep the first row per claim id, summing amounts.
  const byId = new Map();
  for (const r of rows) {
    const id = str(r.claim_id); if (!id) continue;
    const prev = byId.get(id);
    if (!prev) byId.set(id, { ...r, billed: num(r.billed) || 0, expected: num(r.expected), paid: num(r.paid) || 0 });
    else { prev.billed = round2(prev.billed + (num(r.billed) || 0)); prev.expected = prev.expected === null && num(r.expected) === null ? null : round2((prev.expected || 0) + (num(r.expected) || 0)); prev.paid = round2(prev.paid + (num(r.paid) || 0)); }
  }
  const claims = [...byId.values()].sort((a, b) => (str(a.claim_id) < str(b.claim_id) ? -1 : 1));
  // Same patient, same service date, same payer and type, sent twice: the later id is the duplicate.
  const seen = new Map();
  const items = claims.map((c) => {
    const st = str(c.status);
    const sent = isoDate(c.date_sent); const dos = isoDate(c.date_of_service);
    const age = sent ? daysBetween(sent, today) : null;
    const open = !CLOSED.test(st);
    const pk = payerKey(c.payer);
    const limit = filing[pk] || defFiling;
    const fileBy = dos ? addDays(dos, limit) : null;
    const left = fileBy ? daysBetween(today, fileBy) : null;
    const findings = [];
    const dupKey = `${str(c.patient_name).toLowerCase()}|${dos}|${pk}|${str(c.claim_type).toLowerCase()}`;
    if (open && dos && str(c.patient_name)) { if (seen.has(dupKey)) findings.push({ code: 'duplicate', detail: `Same patient, date of service and carrier as claim ${seen.get(dupKey)}; check that the carrier is not billed twice.` }); else seen.set(dupKey, str(c.claim_id)); }
    if (open && DENIED.test(st)) findings.push({ code: 'denied', detail: `Marked ${st} by the carrier; it needs a corrected claim or an appeal, not a status call.` });
    if (open && !sent && dos && daysBetween(dos, today) > unsentDays) findings.push({ code: 'unsent', detail: `Created for a ${dos} visit and not sent after ${daysBetween(dos, today)} days.` });
    if (open && left !== null && left <= warn && !DENIED.test(st)) findings.push({ code: 'filing_risk', detail: left < 0 ? `The ${limit}-day filing limit for this carrier passed on ${fileBy}.` : `${left} day(s) left before the ${limit}-day filing limit (${fileBy}).` });
    const lastTouch = isoDate(c.last_follow_up);
    const sinceTouch = lastTouch ? daysBetween(lastTouch, today) : null;
    if (open && sent && SENT.test(st || 'sent') && age > followDays && (sinceTouch === null || sinceTouch > recontact)) findings.push({ code: 'follow_up', detail: `Sent ${age} days ago${lastTouch ? `, last follow-up ${sinceTouch} days ago` : ', no follow-up recorded'}.` });
    const order = ['denied', 'filing_risk', 'unsent', 'duplicate', 'follow_up'];
    const status = !open ? 'closed' : (order.find((o) => findings.some((f) => f.code === o)) || 'waiting');
    const outstanding = open ? round2((c.expected !== null && c.expected !== undefined ? c.expected : c.billed) - (c.paid || 0)) : 0;
    const next = !open || !sent || status === 'denied' ? null : findings.some((f) => f.code === 'follow_up') ? today : lastTouch && lastTouch > sent ? addDays(lastTouch, recontact) : addDays(sent, followDays);
    return { secondary_payer: str(c.secondary_payer), _paid_primary: !open && (num(c.paid) || 0) > 0, claim_id: str(c.claim_id), patient_name: str(c.patient_name), payer: str(c.payer), claim_type: str(c.claim_type) || 'primary', provider: str(c.provider), date_of_service: dos, date_sent: sent, age_days: age, bucket: open ? (sent ? bucketOf(age) : 'unsent') : 'closed', billed: round2(c.billed), expected: c.expected === null ? null : round2(c.expected), paid: round2(c.paid || 0), outstanding: Math.max(0, outstanding), file_by: open ? fileBy : null, next_follow_up: next, status, findings };
  });
  // A paid primary claim whose patient has a second carrier, and no secondary claim for the same visit in the file.
  const secondaryFor = new Set(items.filter((i) => /^s/i.test(i.claim_type)).map((i) => `${i.patient_name.toLowerCase()}|${i.date_of_service}`));
  for (const i of items) {
    if (i._paid_primary && i.secondary_payer && !/^s/i.test(i.claim_type) && !secondaryFor.has(`${i.patient_name.toLowerCase()}|${i.date_of_service}`)) {
      i.findings.push({ code: 'secondary_not_sent', detail: `The primary carrier paid ${i.paid}; no secondary claim to ${i.secondary_payer} for this visit is in the file. Send it with the primary's explanation of benefits.` });
      i.status = 'secondary_not_sent';
    }
    delete i._paid_primary;
  }
  const open = items.filter((i) => i.status !== 'closed' && i.status !== 'secondary_not_sent');
  const byBucket = {}; for (const b of ['unsent', '0-30', '31-60', '61-90', '91-120', '120+']) { const xs = open.filter((i) => i.bucket === b); byBucket[b] = { count: xs.length, amount: round2(xs.reduce((s, i) => s + i.outstanding, 0)) }; }
  const counts = tally(open, (i) => i.findings.map((f) => f.code));
  return {
    as_of: today, claims: items.length, open: open.length, outstanding: round2(open.reduce((s, i) => s + i.outstanding, 0)),
    over_60: round2(open.filter((i) => i.age_days > 60).reduce((s, i) => s + i.outstanding, 0)),
    to_follow_up: open.filter((i) => i.status === 'follow_up').length, secondary_not_sent: items.filter((i) => i.status === 'secondary_not_sent').length, denied: counts.denied || 0, filing_risk: counts.filing_risk || 0, unsent: counts.unsent || 0, duplicates: counts.duplicate || 0,
    by_bucket: byBucket, by_payer: rollup(open, 'payer', { amount: 'outstanding' }).map(({ claims: _c, ...r }) => r), by_finding: counts,
    items,
  };
}

/** Claim status inquiry for one carrier: the open claims older than the follow-up age. */
export function inquiryText(items, { payer, from, practice }) {
  const k = payerKey(payer);
  // Only claims whose follow-up is due; duplicates and denials need fixing first, not a status call.
  const rows = items.filter((i) => payerKey(i.payer) === k && i.date_sent && i.findings.some((f) => f.code === 'follow_up') && !['duplicate', 'denied', 'secondary_not_sent', 'closed'].includes(i.status));
  const total = round2(rows.reduce((s, i) => s + i.outstanding, 0));
  return { rows, total, text: [
    `# Claim status inquiry: ${rows[0] ? rows[0].payer : payer}`, '',
    '**To:** [TO CONFIRM carrier provider services address, fax or portal message]',
    `**From:** ${from || '[TO CONFIRM your name]'}, ${practice || '[TO CONFIRM practice name and billing NPI]'}`, '',
    `We have not received payment or an explanation of benefits for the ${rows.length} claim(s) below. Please tell us the status of each, or what you need from us to process it.`, '',
    '| Claim | Patient | Date of service | Date sent | Days | Amount |', '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.claim_id} | ${i.patient_name} | ${i.date_of_service || ''} | ${i.date_sent} | ${i.age_days} | ${i.outstanding} |`),
    '', `**Total outstanding:** ${total}`,
    '', 'Sent by the practice\'s billing office. Patient details are included only for the claims listed, as needed to identify them.',
  ].join('\n') };
}
