// Fairclinic Staff Discounts: discounts and write-offs on invoices, by the person who gave them and who approved them.
import { fld, str, num, round2, isoDate, pct, tally } from 'fairclinic-core';

export const DISCOUNT_FIELDS = Object.freeze({
  date: fld(['Date', 'Invoice Date', 'Discount Date'], { type: 'date', required: true }),
  invoice_number: fld(['Invoice', 'Invoice #', 'Invoice Number'], { translate: 'invoice' }),
  client_name: fld(['Client', 'Owner', 'Client Name', 'Account Name']),
  discount_type: fld(['Type', 'Discount Type', 'Discount', 'Adjustment Type'], { required: true, translate: 'type' }),
  amount: fld(['Amount', 'Discount Amount', 'Write-off', 'Adjustment'], { type: 'money', required: true }),
  invoice_total: fld(['Invoice Total', 'Total Before Discount', 'Gross', 'Invoice Amount'], { type: 'money', translate: false }),
  entered_by: fld(['Entered By', 'Staff', 'User', 'Operator'], { translate: false }),
  approved_by: fld(['Approved By', 'Approver', 'Authorized By'], { translate: false }),
  reason: fld(['Reason', 'Note', 'Comment', 'Memo'], { translate: 'memo' }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    approval_over: { type: 'number', minimum: 0, maximum: 100000, description: 'Discounts above this amount need a second person to approve (default 50; your own policy)' },
    max_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Discounts above this percent of the invoice are flagged (default 50)' },
    staff_accounts: { type: 'array', maxItems: 500, items: { type: 'string', maxLength: 120 }, description: 'Client accounts that belong to staff, for staff-discount checks' },
  },
});

export const STATUSES = ['self_approved', 'no_approver', 'staff_discount_non_staff', 'high_pct', 'no_reason', 'ok'];
const STAFF = /staff|employee|team member/i;
const key = (s) => str(s).toLowerCase().replace(/\s+/g, ' ');

export function checkDiscounts(rows, { settings = {} } = {}) {
  const over = settings.approval_over ?? 50, maxPct = settings.max_pct || 50; const staff = new Set((settings.staff_accounts || []).map(key));
  const items = rows.filter((r) => isoDate(r.date) && num(r.amount) !== null).map((r) => {
    const amount = round2(Math.abs(num(r.amount))); const total = num(r.invoice_total); const by = str(r.entered_by), ok = str(r.approved_by); const type = str(r.discount_type);
    const share = total ? pct(amount, total) : null;
    const f = []; const add = (code, detail) => f.push({ code, detail });
    if (amount > over && ok && key(ok) === key(by)) add('self_approved', `${amount} given and approved by the same person (${by}); your policy asks for a second person above ${over}.`);
    else if (amount > over && !ok) add('no_approver', `${amount} with no approver recorded; your policy asks for one above ${over}.`);
    if (STAFF.test(type) && !staff.has(key(r.client_name))) add('staff_discount_non_staff', `A ${type} on an account that is not on your staff account list.`);
    if (share !== null && share > maxPct) add('high_pct', `${share}% of the invoice (${amount} of ${total}).`);
    if (!str(r.reason) && !STAFF.test(type)) add('no_reason', 'No reason written.');
    return { date: isoDate(r.date), invoice_number: str(r.invoice_number), client_name: str(r.client_name), discount_type: type, amount, invoice_total: total, share_pct: share, entered_by: by, approved_by: ok, reason: str(r.reason), status: STATUSES.find((s) => f.some((x) => x.code === s)) || 'ok', findings: f };
  });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || b.amount - a.amount || (a.invoice_number < b.invoice_number ? -1 : 1));
  const total = round2(items.reduce((s, i) => s + i.amount, 0));
  const people = new Map(); for (const i of items) { const k = i.entered_by || '(not recorded)'; const x = people.get(k) || { entered_by: k, count: 0, amount: 0, flagged: 0 }; x.count++; x.amount = round2(x.amount + i.amount); if (i.status !== 'ok') x.flagged++; people.set(k, x); }
  const by_staff = [...people.values()].map((x) => ({ ...x, share_pct: pct(x.amount, total) })).sort((a, b) => b.amount - a.amount);
  return { discounts: items.length, total, to_review: items.filter((i) => i.status !== 'ok').length, by_status: tally(items, 'status'), by_finding: tally(items, (i) => i.findings.map((f) => f.code)), by_staff, by_type: Object.entries(tally(items, 'discount_type')).map(([discount_type, count]) => ({ discount_type, count, amount: round2(items.filter((i) => i.discount_type === discount_type).reduce((s, i) => s + i.amount, 0)) })), items };
}
