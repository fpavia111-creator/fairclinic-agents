// Fairclinic Controlled Drugs: the controlled drug log's arithmetic and entries, and its balance against the physical count.
// It reports what the log shows; it never decides whether a rule is met and never files anything.
import { fld, str, num, isoDate, tally } from 'fairclinic-core';

export const LOG_FIELDS = Object.freeze({
  date: fld(['Date', 'Entry Date', 'Date Used'], { type: 'date', required: true }),
  drug: fld(['Drug', 'Drug Name', 'Item', 'Product', 'Medication'], { required: true }),
  schedule: fld(['Schedule', 'DEA Schedule', 'Class', 'CII-CV'], { translate: false }),
  entry_type: fld(['Type', 'Entry Type', 'Transaction', 'Action'], { required: true, translate: 'type' }),
  quantity: fld(['Quantity', 'Qty', 'Amount', 'Volume', 'Units'], { type: 'number', required: true, translate: 'qty' }),
  running_balance: fld(['Running Balance', 'Balance', 'Balance On Hand', 'On Hand'], { type: 'number', translate: false }),
  patient_name: fld(['Patient', 'Pet', 'Animal', 'Patient Name']),
  client_name: fld(['Client', 'Owner', 'Client Name']),
  initials: fld(['Initials', 'Staff', 'By', 'User'], { translate: false }),
  witness: fld(['Witness', 'Witnessed By', 'Second Signature'], { translate: false }),
});
export const COUNT_FIELDS = Object.freeze({
  drug: fld(['Drug', 'Drug Name', 'Item', 'Product', 'Medication', 'Item Name'], { required: true }),
  counted: fld(['Counted', 'Count', 'Physical Count', 'Quantity On Hand', 'On Hand'], { type: 'number', required: true, translate: false }),
  count_date: fld(['Count Date', 'Date', 'Counted On'], { type: 'date', translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    tolerance: { type: 'number', minimum: 0, maximum: 5, description: 'Differences up to this are equal (default 0.001)' },
    waste_needs_witness: { type: 'boolean', description: 'List waste entries with no witness (default true; your own protocol)' },
  },
});

export const STATUSES = ['count_mismatch', 'balance_math', 'waste_no_witness', 'no_patient', 'missing_initials', 'no_count', 'ok'];
const r3 = (n) => Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;
const kind = (t) => { const s = str(t).toLowerCase(); if (/open|begin|start|carry/.test(s)) return 'opening'; if (/receiv|purchas|order in|restock/.test(s)) return 'received'; if (/wast|discard|destroy/.test(s)) return 'wasted'; if (/adjust|correct/.test(s)) return 'adjustment'; if (/return/.test(s)) return 'returned'; return 'used'; };

export function checkDrugs(log, counts = [], { settings = {} } = {}) {
  const tol = settings.tolerance ?? 0.001, needWitness = settings.waste_needs_witness !== false;
  const drugs = [...new Set(log.map((l) => str(l.drug)).filter(Boolean))].sort();
  const countOf = new Map(counts.filter((c) => str(c.drug)).map((c) => [str(c.drug).toLowerCase(), { counted: num(c.counted), date: isoDate(c.count_date) }]));
  const items = []; const byDrug = [];
  for (const d of drugs) {
    const rows = log.map((l, i) => ({ l, i })).filter(({ l }) => str(l.drug) === d && isoDate(l.date)).sort((a, b) => (isoDate(a.l.date) < isoDate(b.l.date) ? -1 : isoDate(a.l.date) > isoDate(b.l.date) ? 1 : a.i - b.i)).map(({ l }) => l);
    let recorded = null; let truth = null; let mathErrors = 0;
    for (const l of rows) {
      const k = kind(l.entry_type); const q = Math.abs(num(l.quantity) || 0); const bal = num(l.running_balance);
      const f = []; const add = (code, detail) => f.push({ code, detail });
      if (k === 'opening') { truth = q || bal || 0; recorded = bal ?? truth; }
      else {
        const sign = k === 'received' || k === 'returned' ? 1 : k === 'adjustment' ? Math.sign(num(l.quantity) || 0) : -1;
        const delta = k === 'adjustment' ? num(l.quantity) || 0 : sign * q;
        if (truth === null) { truth = bal !== null ? r3(bal - delta) : 0; recorded = truth; }
        truth = r3(truth + delta); const expected = r3((recorded ?? 0) + delta);
        if (bal !== null && Math.abs(bal - expected) > tol) { add('balance_math', `Balance written as ${bal}; ${recorded} ${delta < 0 ? '-' : '+'} ${Math.abs(delta)} is ${expected} (off by ${r3(bal - expected)}).`); mathErrors++; }
        recorded = bal ?? expected;
        if (k === 'wasted' && needWitness && !str(l.witness)) add('waste_no_witness', `Waste of ${q} on ${isoDate(l.date)} with no witness recorded.`);
        if (k === 'used' && !str(l.patient_name)) add('no_patient', `${q} ${str(l.entry_type).toLowerCase() || 'used'} on ${isoDate(l.date)} with no patient recorded.`);
      }
      if (!str(l.initials)) add('missing_initials', `Entry on ${isoDate(l.date)} has no initials.`);
      if (f.length) items.push({ kind: 'entry', drug: d, schedule: str(l.schedule), date: isoDate(l.date), entry_type: str(l.entry_type), quantity: num(l.quantity), running_balance: num(l.running_balance), patient_name: str(l.patient_name), initials: str(l.initials), status: STATUSES.find((s) => f.some((x) => x.code === s)), detail: f.map((x) => x.detail).join(' ') });
    }
    const c = countOf.get(d.toLowerCase());
    let status = 'ok', detail = 'The count matches the balance worked out from the log.';
    if (!c || c.counted === null) { status = 'no_count'; detail = 'No physical count for this drug in the count file.'; }
    else if (Math.abs(c.counted - truth) > tol) { status = 'count_mismatch'; detail = `Counted ${c.counted}${c.date ? ` on ${c.date}` : ''}; the log's entries add up to ${truth} (${c.counted < truth ? 'short' : 'over'} by ${r3(Math.abs(c.counted - truth))})${mathErrors ? `. The written balance (${recorded}) hides it because of ${mathErrors} arithmetic error(s).` : '.'}`; }
    const schedule = str((rows.find((x) => str(x.schedule)) || {}).schedule);
    byDrug.push({ drug: d, schedule, entries: rows.length, log_balance: truth, written_balance: recorded, counted: c ? c.counted : null, difference: c && c.counted !== null ? r3(c.counted - truth) : null, status });
    items.push({ kind: 'drug', drug: d, schedule, date: c ? c.date : null, entry_type: '', quantity: null, running_balance: recorded, patient_name: '', initials: '', status, detail });
  }
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (a.drug < b.drug ? -1 : a.drug > b.drug ? 1 : String(a.date) < String(b.date) ? -1 : 1));
  const t = tally(items, 'status');
  return { drugs: drugs.length, entries: log.length, to_review: items.filter((i) => i.status !== 'ok').length, count_mismatches: t.count_mismatch || 0, by_status: t, by_drug: byDrug, items };
}
