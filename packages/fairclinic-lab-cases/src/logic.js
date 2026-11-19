// Fairclinic Lab Cases: the lab case log against seat appointments, billing and lab invoices.
import { fld, str, num, round2, isoDate, daysBetween, tally } from 'fairclinic-core';

export const CASE_FIELDS = Object.freeze({
  case_id: fld(['Case', 'Case #', 'Case ID', 'Lab Case', 'Rx #'], { required: true, translate: false }),
  patient_name: fld(['Patient', 'Patient Name']),
  lab: fld(['Lab', 'Laboratory', 'Lab Name'], { translate: 'vendor' }),
  case_type: fld(['Type', 'Case Type', 'Restoration', 'Description'], { translate: 'type' }),
  sent_date: fld(['Sent', 'Date Sent', 'Sent Date'], { type: 'date', translate: false }),
  due_date: fld(['Due', 'Due Date', 'Due Back'], { type: 'date', translate: 'due_date' }),
  returned_date: fld(['Returned', 'Date Returned', 'Received', 'Received Date'], { type: 'date', translate: false }),
  seat_date: fld(['Seat Appointment', 'Seat Date', 'Appointment', 'Seat Appt'], { type: 'date', translate: false }),
  seated_date: fld(['Seated', 'Date Seated', 'Delivered'], { type: 'date', translate: false }),
  billed: fld(['Billed', 'Procedure Billed', 'Claim Sent', 'Charged'], { translate: false }),
});
export const INVOICE_FIELDS = Object.freeze({
  invoice_number: fld(['Invoice', 'Invoice #', 'Invoice Number', 'Inv #'], { required: true, translate: 'invoice' }),
  lab: fld(['Lab', 'Laboratory', 'Vendor', 'Lab Name'], { translate: 'vendor' }),
  case_id: fld(['Case', 'Case #', 'Case ID', 'Pan #', 'Rx #'], { translate: false }),
  date: fld(['Date', 'Invoice Date']),
  amount: fld(['Amount', 'Total', 'Charge', 'Invoice Amount'], { type: 'money', required: true }),
  remake: fld(['Remake', 'Is Remake', 'Redo'], { translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    seat_buffer_days: { type: 'integer', minimum: 0, maximum: 14, description: 'A case not back this many days before its seat appointment is urgent (default 2)' },
    invoice_wait_days: { type: 'integer', minimum: 7, maximum: 120, description: 'A returned case with no invoice after this many days is listed (default 30)' },
  },
});

export const STATUSES = ['not_back_for_seat', 'overdue_from_lab', 'seated_not_billed', 'remake_charged', 'duplicate_invoice', 'invoice_no_case', 'case_not_returned', 'no_invoice', 'late_return', 'ok'];
const yes = (v) => /^(y|yes|true|1|x|billed|sent)$/i.test(str(v));

export function checkLabs(cases, invoices = [], { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const buffer = settings.seat_buffer_days ?? 2, wait = settings.invoice_wait_days || 30;
  const byCase = new Map(); for (const v of invoices) { const c = str(v.case_id); if (c) (byCase.get(c) || byCase.set(c, []).get(c)).push(v); }
  const known = new Map(cases.filter((c) => str(c.case_id)).map((c) => [str(c.case_id), c]));
  const items = [...known.values()].map((c) => {
    const id = str(c.case_id); const due = isoDate(c.due_date), back = isoDate(c.returned_date), seat = isoDate(c.seat_date), seated = isoDate(c.seated_date);
    const f = []; const add = (code, detail) => f.push({ code, detail });
    if (!back && seat && daysBetween(today, seat) <= buffer) add('not_back_for_seat', `Not back from the lab and the seat appointment is ${seat < today ? `past (${seat})` : `in ${daysBetween(today, seat)} day(s) (${seat})`}. Call the lab or move the appointment.`);
    if (!back && due && due < today) add('overdue_from_lab', `Due back ${due}, ${daysBetween(due, today)} day(s) ago.`);
    if (seated && !yes(c.billed)) add('seated_not_billed', `Seated ${seated} and not marked billed: check the procedure was posted and the claim sent.`);
    if (invoices.length && back && !(byCase.get(id) || []).length && daysBetween(back, today) > wait) add('no_invoice', `Returned ${back} and no invoice for this case in the file after ${daysBetween(back, today)} days (it may be on a monthly statement).`);
    if (back && due && back > due) add('late_return', `Returned ${back}, ${daysBetween(due, back)} day(s) after it was due.`);
    return { kind: 'case', case_id: id, invoice_number: '', patient_name: str(c.patient_name), lab: str(c.lab), case_type: str(c.case_type), due_date: due, returned_date: back, seat_date: seat, amount: round2((byCase.get(id) || []).reduce((s, v) => s + (num(v.amount) || 0), 0)), status: STATUSES.find((s) => f.some((x) => x.code === s)) || 'ok', findings: f };
  });
  const seen = new Map(); const seenCase = new Map();
  const sorted = invoices.map((v, i) => ({ v, k: `${str(v.lab)}|${str(v.invoice_number)}|${str(v.case_id)}|${num(v.amount)}|${i}` })).sort((a, b) => (a.k < b.k ? -1 : 1)).map((x) => x.v);
  for (const v of sorted) {
    const inv = str(v.invoice_number); const cid = str(v.case_id); const amt = round2(num(v.amount) || 0);
    const f = []; const add = (code, detail) => f.push({ code, detail });
    const k = `${str(v.lab).toLowerCase()}|${inv}`;
    if (seen.has(k)) add('duplicate_invoice', `Invoice ${inv} from ${str(v.lab)} appears more than once.`); else seen.set(k, true);
    if (cid && !yes(v.remake)) { if (seenCase.has(cid) && !f.length) add('duplicate_invoice', `Case ${cid} is also on invoice ${seenCase.get(cid)}.`); else if (!seenCase.has(cid)) seenCase.set(cid, inv); }
    if (yes(v.remake) && amt > 0) add('remake_charged', `Remake of case ${cid || '(none)'} charged ${amt}; many labs remake at no charge, so ask for a credit if yours does.`);
    if (cid && !known.has(cid)) add('invoice_no_case', `Case ${cid} is not in the case log.`);
    else if (!cid) add('invoice_no_case', 'The invoice line names no case.');
    else if (!isoDate(known.get(cid).returned_date)) add('case_not_returned', `Invoiced for case ${cid}, which the log shows as not back from the lab.`);
    if (f.length) items.push({ kind: 'invoice', case_id: cid, invoice_number: inv, patient_name: known.has(cid) ? str(known.get(cid).patient_name) : '', lab: str(v.lab), case_type: '', due_date: null, returned_date: null, seat_date: null, amount: amt, status: STATUSES.find((s) => f.some((x) => x.code === s)), findings: f });
  }
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (a.case_id < b.case_id ? -1 : a.case_id > b.case_id ? 1 : a.invoice_number < b.invoice_number ? -1 : 1));
  const t = tally(items, 'status');
  const money = (code) => round2(items.filter((i) => i.kind === 'invoice' && i.findings.some((f) => f.code === code)).reduce((s, i) => s + i.amount, 0));
  return { as_of: today, cases: known.size, invoices: invoices.length, invoiced: round2(invoices.reduce((s, v) => s + (num(v.amount) || 0), 0)), to_work: items.filter((i) => i.status !== 'ok' && i.status !== 'late_return').length, remakes_charged: money('remake_charged'), duplicates: money('duplicate_invoice'), not_in_log: money('invoice_no_case'), by_status: t, items };
}
