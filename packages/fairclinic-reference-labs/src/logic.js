// Fairclinic Reference Labs: tests sent to a reference lab (from the lab's invoice) against what the client was charged.
import { fld, str, num, round2, isoDate, daysBetween, tally } from 'fairclinic-core';

export const LAB_FIELDS = Object.freeze({
  accession: fld(['Accession', 'Accession #', 'Requisition', 'Order #', 'Lab Order'], { required: true, translate: false }),
  date: fld(['Date', 'Collection Date', 'Date Received', 'Service Date'], { type: 'date', required: true }),
  patient_name: fld(['Patient', 'Pet', 'Animal', 'Patient Name'], { required: true }),
  test: fld(['Test', 'Test Name', 'Description', 'Service'], { required: true, translate: false }),
  lab_cost: fld(['Lab Cost', 'Cost', 'Amount', 'Charge', 'Net'], { type: 'money', required: true, translate: 'unit_cost' }),
});
export const CHARGE_FIELDS = Object.freeze({
  patient_name: fld(['Patient', 'Pet', 'Animal', 'Patient Name', 'Animal Name'], { required: true }),
  date: fld(['Date', 'Invoice Date', 'Service Date'], { type: 'date', required: true }),
  item: fld(['Item', 'Product Name', 'Description', 'Service'], { required: true }),
  amount: fld(['Amount', 'Total', 'Line Total', 'Price'], { type: 'money', required: true }),
  client_name: fld(['Client', 'Owner']),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    test_map: { type: 'object', maxProperties: 1000, additionalProperties: { type: 'string', maxLength: 200 }, description: 'Lab test name -> your invoice item name, when they differ; every item named here is treated as a send-out' },
    min_markup: { type: 'number', minimum: 1, maximum: 10, description: 'A client charge below lab cost times this is flagged (default 2; your own pricing rule)' },
    match_days: { type: 'integer', minimum: 0, maximum: 30, description: 'Days either side of the lab date to look for the client charge (default 3)' },
  },
});

export const STATUSES = ['not_charged', 'charged_below_cost', 'low_markup', 'charged_not_sent', 'ok'];
const norm = (s) => str(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function checkSendouts(lab, charges, { settings = {} } = {}) {
  const map = new Map(Object.entries(settings.test_map || {}).map(([k, v]) => [norm(k), norm(v)]));
  const markup = settings.min_markup || 2, window = settings.match_days ?? 3;
  const itemFor = (test) => map.get(norm(test)) || norm(test);
  const pool = charges.filter((c) => str(c.patient_name) && isoDate(c.date)).map((c, i) => ({ i, pet: norm(c.patient_name), date: isoDate(c.date), item: norm(c.item), name: str(c.item), amount: num(c.amount) || 0, client_name: str(c.client_name), used: false }));
  const items = [];
  const tests = lab.filter((l) => str(l.accession) && isoDate(l.date)).sort((a, b) => (isoDate(a.date) < isoDate(b.date) ? -1 : isoDate(a.date) > isoDate(b.date) ? 1 : str(a.accession) < str(b.accession) ? -1 : 1));
  for (const l of tests) {
    const pet = norm(l.patient_name), d = isoDate(l.date), want = itemFor(l.test), cost = round2(num(l.lab_cost) || 0);
    const hit = pool.find((c) => !c.used && c.pet === pet && c.item === want && Math.abs(daysBetween(c.date, d)) <= window);
    let status = 'ok', detail;
    if (!hit) { status = 'not_charged'; detail = `${str(l.test)} for this pet on ${d} (lab cost ${cost}) has no matching client charge within ${window} day(s).`; }
    else {
      hit.used = true; const ratio = cost ? round2(hit.amount / cost) : null;
      if (hit.amount < cost) { status = 'charged_below_cost'; detail = `Charged ${hit.amount} against a lab cost of ${cost}.`; }
      else if (ratio !== null && ratio < markup) { status = 'low_markup'; detail = `Charged ${hit.amount}, ${ratio} times the lab cost of ${cost}; your rule is ${markup} times.`; }
      else detail = `Charged ${hit.amount}, ${ratio} times the lab cost.`;
    }
    items.push({ accession: str(l.accession), date: d, patient_name: str(l.patient_name), client_name: hit ? hit.client_name : '', test: str(l.test), lab_cost: cost, charged: hit ? hit.amount : null, status, detail });
  }
  const sendoutItems = new Set([...map.values()]);
  for (const c of pool.filter((x) => !x.used && sendoutItems.has(x.item))) items.push({ accession: '', date: c.date, patient_name: c.pet ? charges[c.i].patient_name : '', client_name: c.client_name, test: c.name, lab_cost: null, charged: c.amount, status: 'charged_not_sent', detail: `${c.name} charged ${c.amount} on ${c.date} with no matching test on the lab invoice; check it was sent, or that the lab billed it.` });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (a.date < b.date ? -1 : 1));
  const t = tally(items, 'status');
  return { tests: tests.length, lab_cost: round2(tests.reduce((s, l) => s + (num(l.lab_cost) || 0), 0)), charged: round2(items.reduce((s, i) => s + (i.charged || 0), 0)), cost_not_charged: round2(items.filter((i) => i.status === 'not_charged').reduce((s, i) => s + i.lab_cost, 0)), to_review: items.filter((i) => i.status !== 'ok').length, by_status: t, items };
}
