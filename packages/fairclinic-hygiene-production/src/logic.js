// Fairclinic Hygiene Production: hygiene production per hour, unfilled time and the share of periodontal visits.
import { fld, str, num, round2, isoDate, pct, tally } from 'fairclinic-core';

export const HOURS_FIELDS = Object.freeze({
  hygienist: fld(['Hygienist', 'Provider', 'RDH', 'Hyg'], { required: true, translate: false }),
  date: fld(['Date', 'Work Date', 'Day'], { type: 'date', required: true }),
  scheduled_hours: fld(['Scheduled Hours', 'Hours', 'Hours Worked', 'Booked Hours', 'Available Hours'], { type: 'number', required: true, translate: false }),
  open_hours: fld(['Open Hours', 'Unfilled Hours', 'Unbooked Hours', 'Open Time'], { type: 'number', translate: false }),
});
export const PROCEDURE_FIELDS = Object.freeze({
  hygienist: fld(['Hygienist', 'Provider', 'RDH', 'Hyg'], { required: true, translate: false }),
  date: fld(['Date', 'Date of Service', 'Proc Date', 'DOS'], { type: 'date', required: true }),
  code: fld(['Code', 'CDT', 'Procedure', 'Proc Code'], { required: true, translate: false }),
  qty: fld(['Qty', 'Quantity', 'Count', 'Units'], { type: 'number', translate: 'qty' }),
  fee: fld(['Fee', 'Amount', 'Production', 'Charge'], { type: 'money', required: true, translate: 'charge' }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    target_per_hour: { type: 'number', minimum: 1, maximum: 2000, description: 'Production per worked hour below this is flagged (default 150)' },
    open_time_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Unfilled hours above this percent of scheduled hours are flagged (default 15)' },
    perio_codes: { type: 'array', maxItems: 40, items: { type: 'string', pattern: '^D\\d{4}$' }, description: 'Codes counted as periodontal visits (default D4341, D4342, D4346, D4355, D4910)' },
    prophy_codes: { type: 'array', maxItems: 40, items: { type: 'string', pattern: '^D\\d{4}$' }, description: 'Codes counted as cleanings (default D1110, D1120)' },
  },
});

export const STATUSES = ['no_hours', 'below_target', 'open_time', 'ok'];

export function checkHygiene(hours, procedures, { settings = {} } = {}) {
  const target = settings.target_per_hour || 150, openMax = settings.open_time_pct || 15;
  const perio = new Set(settings.perio_codes || ['D4341', 'D4342', 'D4346', 'D4355', 'D4910']), prophy = new Set(settings.prophy_codes || ['D1110', 'D1120']);
  const hyg = new Map(); const get = (h) => hyg.get(h) || hyg.set(h, { hygienist: h, days: new Map(), production_on_hours: 0, production_no_hours: 0, perio: 0, prophy: 0, missing_days: new Set() }).get(h);
  for (const r of hours) { const h = str(r.hygienist), d = isoDate(r.date); if (!h || !d) continue; const x = get(h); const day = x.days.get(d) || { scheduled: 0, open: 0 }; day.scheduled += num(r.scheduled_hours) || 0; day.open += num(r.open_hours) || 0; x.days.set(d, day); }
  for (const r of procedures) {
    const h = str(r.hygienist), d = isoDate(r.date), c = str(r.code).toUpperCase(); if (!h || !d) continue;
    const x = get(h); const q = num(r.qty) ?? 1; const amount = q * (num(r.fee) || 0);
    if (x.days.has(d)) x.production_on_hours += amount; else { x.production_no_hours += amount; x.missing_days.add(d); }
    if (perio.has(c)) x.perio += q; else if (prophy.has(c)) x.prophy += q;
  }
  const items = [...hyg.values()].sort((a, b) => (a.hygienist < b.hygienist ? -1 : 1)).map((x) => {
    const scheduled = round2([...x.days.values()].reduce((s, d) => s + d.scheduled, 0)), open = round2([...x.days.values()].reduce((s, d) => s + d.open, 0));
    const worked = round2(scheduled - open); const perHour = worked > 0 ? round2(x.production_on_hours / worked) : null; const openPct = scheduled ? pct(open, scheduled) : null;
    const f = []; const add = (code, detail) => f.push({ code, detail });
    if (x.missing_days.size) add('no_hours', `${round2(x.production_no_hours)} of production on ${[...x.missing_days].sort().join(', ')} with no hours in the hours file; left out of the hourly figure.`);
    if (perHour !== null && perHour < target) add('below_target', `${perHour} per worked hour (${round2(x.production_on_hours)} over ${worked} hours); your target is ${target}.`);
    if (openPct !== null && openPct > openMax) add('open_time', `${open} of ${scheduled} scheduled hours were unfilled (${openPct}%); your limit is ${openMax}%.`);
    return { hygienist: x.hygienist, days: x.days.size, scheduled_hours: scheduled, open_hours: open, worked_hours: worked, production: round2(x.production_on_hours + x.production_no_hours), production_per_hour: perHour, open_pct: openPct, perio_visits: x.perio, prophy_visits: x.prophy, perio_share_pct: x.perio + x.prophy ? pct(x.perio, x.perio + x.prophy) : null, status: STATUSES.find((s) => f.some((y) => y.code === s)) || 'ok', findings: f };
  });
  const onHours = round2([...hyg.values()].reduce((s, x) => s + x.production_on_hours, 0)); const worked = round2(items.reduce((s, i) => s + i.worked_hours, 0));
  return { hygienists: items.length, production: round2(items.reduce((s, i) => s + i.production, 0)), worked_hours: worked, production_per_hour: worked ? round2(onHours / worked) : null, open_hours: round2(items.reduce((s, i) => s + i.open_hours, 0)), to_review: items.filter((i) => i.status !== 'ok').length, by_status: tally(items, 'status'), items };
}
