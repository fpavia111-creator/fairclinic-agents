// Beaver of Remits: each ERA claim against the payment and write-off posted in the practice system.
import { fld, str, num, round2, isoDate, tally } from 'fairclinic-core';

export const POSTING_FIELDS = Object.freeze({
  claim_id: fld(['Claim ID', 'Claim #', 'Claim Number', 'ClaimNum'], { required: true, translate: false }),
  patient_name: fld(['Patient', 'Patient Name', 'PatName']),
  payer: fld(['Carrier', 'Carrier Name', 'Insurance', 'Payer']),
  check_number: fld(['Check Number', 'Check #', 'Check/EFT', 'EFT Number', 'Reference', 'CheckNum'], { translate: false }),
  paid: fld(['Payment Posted', 'Ins Payment', 'Insurance Payment', 'Paid', 'InsPayAmt', 'Payment'], { type: 'money', translate: 'paid' }),
  writeoff: fld(['Write-off Posted', 'Write Off', 'Writeoff', 'Write-off', 'WriteOff', 'Adjustment'], { type: 'money', translate: false }),
  posted_date: fld(['Posted Date', 'Date Posted', 'Entry Date', 'DatePay'], { type: 'date', translate: 'date' }),
  posted_by: fld(['Posted By', 'User', 'Entered By', 'Operator'], { translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    tolerance: { type: 'number', minimum: 0, maximum: 5, description: 'Differences up to this amount are treated as equal (default 0.01)' },
    contractual_reasons: { type: 'array', items: { type: 'string', pattern: '^[A-Z0-9]{1,5}$' }, maxItems: 30, description: 'CO reason codes that are contractual write-offs (default 45, 253, 131)' },
  },
});

export const STATUSES = ['reversal', 'denial_written_off', 'denied', 'not_posted', 'payment_mismatch', 'writeoff_mismatch', 'not_on_era', 'ok'];
const adjOf = (c) => [...(c.adjustments || []), ...(c.lines || []).flatMap((l) => l.adjustments || [])];

/** Match ERA claims to postings: one item per ERA claim, plus postings on an ERA check that are not on it, and check totals. */
export function matchRemits(eraClaims, postings, { settings = {} } = {}) {
  const tol = settings.tolerance ?? 0.01;
  const contractual = new Set((settings.contractual_reasons || ['45', '253', '131']).map((x) => String(x).toUpperCase()));
  const byClaim = new Map();
  for (const p of postings) {
    const id = str(p.claim_id); if (!id) continue;
    const x = byClaim.get(id) || { claim_id: id, paid: 0, writeoff: 0, check_number: str(p.check_number), posted_by: new Set(), patient_name: str(p.patient_name), payer: str(p.payer) };
    x.paid = round2(x.paid + (num(p.paid) || 0)); x.writeoff = round2(x.writeoff + (num(p.writeoff) || 0));
    if (str(p.posted_by)) x.posted_by.add(str(p.posted_by));
    byClaim.set(id, x);
  }
  const eraIds = new Set(eraClaims.map((c) => str(c.claim_id)));
  const items = eraClaims.map((c) => {
    const id = str(c.claim_id); const p = byClaim.get(id);
    const adj = adjOf(c);
    const co = adj.filter((a) => a.group === 'CO');
    const isContract = (a) => contractual.has(String(a.reason).toUpperCase());
    const writeoffExpected = round2(co.filter(isContract).reduce((s, a) => s + (a.amount || 0), 0));
    const denialAdj = round2(co.filter((a) => !isContract(a)).reduce((s, a) => s + (a.amount || 0), 0));
    const pr = round2(adj.filter((a) => a.group === 'PR').reduce((s, a) => s + (a.amount || 0), 0));
    const paid = round2(num(c.paid) || 0);
    const st = str(c.status);
    const f = []; const add = (code, detail, amount = null) => f.push({ code, detail, amount });
    if (st === '22') add('reversal', `The carrier reversed ${Math.abs(paid)} on this claim. Post the reversal by hand and check whether a corrected payment follows.`, Math.abs(paid));
    const denied = st !== '22' && (st === '4' || (paid === 0 && denialAdj > 0));
    const codes = co.filter((a) => !isContract(a)).map((a) => `CO-${a.reason}`);
    if (denied && p && p.writeoff > tol) add('denial_written_off', `Denied (${codes.join(', ') || 'status 4'}) but ${p.writeoff} was posted as a write-off. A denial is not a contractual write-off; work the denial before writing it off.`, p.writeoff);
    else if (denied) add('denied', `Denied (${codes.join(', ') || 'status 4'}); nothing was paid. Work the denial (corrected claim or appeal).`, denialAdj);
    if (!p && paid > tol) add('not_posted', `${paid} was paid on ${c.check_number || 'this ERA'} and no posting for this claim is in the export.`, paid);
    if (p && st !== '22' && Math.abs(p.paid - paid) > tol) add('payment_mismatch', `Posted ${p.paid}, the ERA paid ${paid} (difference ${round2(p.paid - paid)}).`, round2(p.paid - paid));
    if (p && !denied && st !== '22' && Math.abs(p.writeoff - writeoffExpected) > tol) add('writeoff_mismatch', `Posted write-off ${p.writeoff}, the ERA's contractual adjustment is ${writeoffExpected} (difference ${round2(p.writeoff - writeoffExpected)}). The patient portion on the ERA is ${pr}.`, round2(p.writeoff - writeoffExpected));
    const status = STATUSES.find((s) => f.some((x) => x.code === s)) || 'ok';
    return { claim_id: id, patient_name: str(c.patient_name) || (p && p.patient_name) || '', payer: str(c.payer), check_number: str(c.check_number), payment_date: isoDate(c.payment_date), billed: round2(num(c.charge) || 0), era_paid: paid, writeoff_expected: writeoffExpected, patient_portion: pr, posted_paid: p ? p.paid : null, posted_writeoff: p ? p.writeoff : null, posted_by: p ? [...p.posted_by].sort().join(', ') : '', status, findings: f };
  });
  const eraChecks = new Map();
  for (const c of eraClaims) { const k = str(c.check_number); if (!k) continue; const x = eraChecks.get(k) || { check_number: k, payer: str(c.payer), era_amount: 0, posted_amount: 0, claims: 0 }; x.era_amount = round2(x.era_amount + (num(c.paid) || 0)); x.claims++; eraChecks.set(k, x); }
  for (const p of byClaim.values()) {
    if (eraIds.has(p.claim_id) || !eraChecks.has(p.check_number)) continue;
    items.push({ claim_id: p.claim_id, patient_name: p.patient_name, payer: p.payer, check_number: p.check_number, payment_date: null, billed: null, era_paid: null, writeoff_expected: null, patient_portion: null, posted_paid: p.paid, posted_writeoff: p.writeoff, posted_by: [...p.posted_by].sort().join(', '), status: 'not_on_era', findings: [{ code: 'not_on_era', detail: `Posted ${p.paid} against ${p.check_number}, but this claim is not on that ERA. It may belong to another claim or another payment.`, amount: p.paid }] });
  }
  for (const p of byClaim.values()) { const x = eraChecks.get(p.check_number); if (x) x.posted_amount = round2(x.posted_amount + p.paid); }
  const checks = [...eraChecks.values()].map((x) => ({ ...x, difference: round2(x.posted_amount - x.era_amount), status: Math.abs(x.posted_amount - x.era_amount) > tol ? 'check_total_differs' : 'ties' })).sort((a, b) => (a.check_number < b.check_number ? -1 : 1));
  items.sort((a, b) => (a.claim_id < b.claim_id ? -1 : a.claim_id > b.claim_id ? 1 : 0));
  const by = tally(items, 'status');
  return {
    era_claims: eraClaims.length, era_paid: round2(checks.reduce((s, c) => s + c.era_amount, 0)), posted_paid: round2(checks.reduce((s, c) => s + c.posted_amount, 0)),
    not_posted: by.not_posted || 0, unposted_amount: round2(items.filter((i) => i.status === 'not_posted').reduce((s, i) => s + i.era_paid, 0)),
    mismatches: (by.payment_mismatch || 0) + (by.writeoff_mismatch || 0), denials_written_off: by.denial_written_off || 0, denied: by.denied || 0, reversals: by.reversal || 0, not_on_era: by.not_on_era || 0,
    checks_not_tying: checks.filter((c) => c.status !== 'ties').length, patient_portion: round2(items.reduce((s, i) => s + (i.patient_portion || 0), 0)),
    by_status: by, checks, items,
  };
}
