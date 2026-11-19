// Fairclinic Pet Insurance Claims: claims the clinic submitted (or helped the client submit) and where each one stands.
import { fld, str, num, round2, isoDate, daysBetween, tally, rollup } from 'fairclinic-core';

export const CLAIM_FIELDS = Object.freeze({
  claim_id: fld(['Claim', 'Claim #', 'Claim ID', 'Claim Number', 'Reference'], { required: true, translate: false }),
  client_name: fld(['Client', 'Owner', 'Policyholder', 'Client Name']),
  patient_name: fld(['Patient', 'Pet', 'Animal', 'Patient Name']),
  insurer: fld(['Insurer', 'Insurance', 'Pet Insurer', 'Carrier', 'Provider'], { required: true, translate: 'payer' }),
  invoice_number: fld(['Invoice', 'Invoice #', 'Invoice Number'], { translate: 'invoice' }),
  claimed: fld(['Claimed', 'Claim Amount', 'Amount Claimed', 'Invoice Total'], { type: 'money', required: true, translate: false }),
  created: fld(['Created', 'Date Created', 'Invoice Date'], { type: 'date', translate: false }),
  submitted: fld(['Submitted', 'Date Submitted', 'Sent'], { type: 'date', translate: false }),
  status: fld(['Status', 'Claim Status'], { required: true, translate: false }),
  paid: fld(['Paid', 'Paid Amount', 'Reimbursed', 'Amount Paid'], { type: 'money', translate: 'paid' }),
  paid_date: fld(['Paid Date', 'Date Paid', 'Payment Date'], { type: 'date', translate: false }),
  direct_pay: fld(['Direct Pay', 'Paid To Clinic', 'Vet Direct Pay', 'Assigned'], { translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    response_days: { type: 'integer', minimum: 1, maximum: 120, description: 'A submitted claim with no decision after this many days is chased (default 21)' },
    draft_days: { type: 'integer', minimum: 1, maximum: 60, description: 'A claim drafted and not submitted after this many days is flagged (default 5)' },
  },
});

export const STATUSES = ['info_requested', 'direct_pay_balance', 'not_submitted', 'no_response', 'denied', 'pending', 'paid'];
const isPaid = (s) => /^(paid|closed|reimbursed|settled|complete)$/i.test(s), isDenied = (s) => /^(denied|declined|rejected|not covered)$/i.test(s);
const isInfo = (s) => /info|records requested|more information|pending documents/i.test(s), isDraft = (s) => /^(draft|not submitted|unsent|created|new)$/i.test(s);
const yes = (v) => /^(y|yes|true|1|clinic)$/i.test(str(v));

export function checkPetClaims(rows, { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const respond = settings.response_days || 21, draftDays = settings.draft_days || 5;
  const items = rows.filter((r) => str(r.claim_id)).map((r) => {
    const st = str(r.status); const claimed = round2(num(r.claimed) || 0); const paid = num(r.paid); const sub = isoDate(r.submitted); const direct = yes(r.direct_pay);
    let status, detail;
    if (isInfo(st)) { status = 'info_requested'; detail = `${str(r.insurer)} asked for more information${sub ? ` on a claim submitted ${sub}` : ''}. Send the records they asked for.`; }
    else if (isPaid(st) && direct && paid !== null && paid < claimed) { status = 'direct_pay_balance'; detail = `Paid ${paid} directly to the clinic against ${claimed} claimed; ${round2(claimed - paid)} is left on the client's account. A person decides how to bill it.`; }
    else if (isPaid(st)) { status = 'paid'; detail = `Paid ${paid ?? ''}${isoDate(r.paid_date) ? ` on ${isoDate(r.paid_date)}` : ''}.`; }
    else if (isDenied(st)) { status = 'denied'; detail = `Denied by ${str(r.insurer)}. The client hears from the insurer; the clinic may be asked for records for an appeal.`; }
    else if (isDraft(st) || !sub) { const c = isoDate(r.created); const d = c ? daysBetween(c, today) : null; status = d !== null && d > draftDays ? 'not_submitted' : 'pending'; detail = status === 'not_submitted' ? `Drafted ${d} days ago and not submitted.` : 'Drafted, not yet submitted.'; }
    else { const d = daysBetween(sub, today); status = d > respond ? 'no_response' : 'pending'; detail = status === 'no_response' ? `Submitted ${d} days ago with no decision${direct ? '; the clinic is waiting for a direct payment' : ''}.` : `Submitted ${d} day(s) ago.`; }
    return { claim_id: str(r.claim_id), client_name: str(r.client_name), patient_name: str(r.patient_name), insurer: str(r.insurer), invoice_number: str(r.invoice_number), claimed, paid, submitted: sub, direct_pay: direct, status, detail };
  });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (String(a.submitted) < String(b.submitted) ? -1 : 1));
  const open = items.filter((i) => !['paid', 'denied', 'direct_pay_balance'].includes(i.status));
  return { as_of: today, claims: items.length, open: open.length, open_claimed: round2(open.reduce((s, i) => s + i.claimed, 0)), direct_pay_open: round2(open.filter((i) => i.direct_pay).reduce((s, i) => s + i.claimed, 0)), client_balances: round2(items.filter((i) => i.status === 'direct_pay_balance').reduce((s, i) => s + (i.claimed - (i.paid || 0)), 0)), to_review: items.filter((i) => !['paid', 'pending'].includes(i.status)).length, by_status: tally(items, 'status'), by_insurer: rollup(open, 'insurer', { amount: 'claimed' }).map(({ claims: _c, ...x }) => x), items };
}
