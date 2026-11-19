// Fairclinic PPO Write-offs: adjustments and write-offs by plan and by person, with the ones a manager should look at.
import { fld, str, num, round2, isoDate, payerKey, tally, pct } from 'fairclinic-core';

export const ADJUSTMENT_FIELDS = Object.freeze({
  date: fld(['Date', 'Adjustment Date', 'Entry Date', 'AdjDate'], { type: 'date', required: true }),
  patient_name: fld(['Patient', 'Patient Name', 'PatName']),
  type: fld(['Adjustment Type', 'Type', 'Adj Type', 'Description'], { required: true, translate: 'type' }),
  carrier: fld(['Carrier', 'Insurance', 'Primary Carrier', 'Carrier Name', 'Plan'], { translate: 'payer' }),
  amount: fld(['Amount', 'Adjustment Amount', 'Adj Amount', 'AdjAmt'], { type: 'money', required: true }),
  entered_by: fld(['Entered By', 'User', 'Operator', 'Staff', 'Posted By'], { translate: false }),
  note: fld(['Note', 'Reason', 'Comment', 'Memo'], { translate: 'memo' }),
});
export const PRODUCTION_FIELDS = Object.freeze({
  carrier: fld(['Carrier', 'Insurance', 'Plan', 'Payer'], { required: true, translate: 'payer' }),
  production: fld(['Production', 'Gross Production', 'Charges', 'Billed'], { type: 'money', required: true, translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    in_network: { type: 'array', maxItems: 100, items: { type: 'string', maxLength: 120 }, description: 'PPO plans you are in network with; a contractual write-off for any other carrier is flagged' },
    large_amount: { type: 'number', minimum: 1, maximum: 100000, description: 'A discretionary adjustment at or above this amount is flagged (default 500)' },
  },
});

export const STATUSES = ['duplicate', 'out_of_network', 'no_carrier', 'no_reason', 'large', 'ok'];
const PPO = /ppo|contract|insurance\s*write|ins\.?\s*w\/?o|in[- ]network|fee schedule/i;

export function checkWriteoffs(rows, production = [], { settings = {} } = {}) {
  const net = new Set((settings.in_network || []).map(payerKey));
  const large = settings.large_amount || 500;
  const seen = new Map();
  const ordered = rows.map((r, i) => ({ r, i, k: `${isoDate(r.date)}|${str(r.patient_name)}|${str(r.type)}|${num(r.amount)}|${str(r.entered_by)}|${str(r.note)}` })).sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
  const items = [];
  for (const { r } of ordered) {
    if (!isoDate(r.date) && num(r.amount) === null) continue;
    const amount = round2(Math.abs(num(r.amount) || 0)); const type = str(r.type); const carrier = str(r.carrier); const ppo = PPO.test(type);
    const f = []; const add = (code, detail) => f.push({ code, detail });
    const dk = `${str(r.patient_name).toLowerCase()}|${isoDate(r.date)}|${type.toLowerCase()}|${amount}`;
    if (seen.has(dk)) add('duplicate', `Same patient, date, type and amount as another adjustment entered by ${seen.get(dk) || 'someone'}.`); else seen.set(dk, str(r.entered_by));
    if (ppo && carrier && net.size && !net.has(payerKey(carrier))) add('out_of_network', `A contractual write-off for ${carrier}, which is not on your in-network list; out-of-network fees are not normally written down to a PPO fee.`);
    if (ppo && !carrier) add('no_carrier', 'A contractual write-off on a patient with no carrier on the line.');
    if (!ppo && !str(r.note)) add('no_reason', `A ${type || 'discretionary'} adjustment with no reason written.`);
    if (!ppo && amount >= large) add('large', `${amount} is at or above your ${large} review amount.`);
    items.push({ date: isoDate(r.date), patient_name: str(r.patient_name), type, kind: ppo ? 'contractual' : 'discretionary', carrier, amount, entered_by: str(r.entered_by), note: str(r.note), status: STATUSES.find((s) => f.some((x) => x.code === s)) || 'ok', findings: f });
  }
  items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.patient_name < b.patient_name ? -1 : 1));
  const prod = new Map(); for (const p of production) { const k = payerKey(p.carrier); if (k) prod.set(k, round2((prod.get(k) || 0) + (num(p.production) || 0))); }
  const carriers = new Map();
  for (const i of items.filter((x) => x.kind === 'contractual')) { const k = payerKey(i.carrier) || '(none)'; const x = carriers.get(k) || { carrier: i.carrier || '(none)', writeoffs: 0, count: 0 }; x.writeoffs = round2(x.writeoffs + i.amount); x.count++; carriers.set(k, x); }
  const by_carrier = [...carriers.entries()].map(([k, x]) => ({ ...x, production: prod.get(k) ?? null, writeoff_pct: prod.get(k) ? pct(x.writeoffs, prod.get(k)) : null })).sort((a, b) => b.writeoffs - a.writeoffs);
  const staff = new Map();
  for (const i of items.filter((x) => x.kind === 'discretionary')) { const k = i.entered_by || '(not recorded)'; const x = staff.get(k) || { entered_by: k, count: 0, amount: 0, without_reason: 0 }; x.count++; x.amount = round2(x.amount + i.amount); if (!i.note) x.without_reason++; staff.set(k, x); }
  const discretionary = round2(items.filter((i) => i.kind === 'discretionary').reduce((s, i) => s + i.amount, 0));
  const by_staff = [...staff.values()].map((x) => ({ ...x, share_pct: pct(x.amount, discretionary) })).sort((a, b) => b.amount - a.amount);
  const t = tally(items, 'status');
  return {
    adjustments: items.length, total: round2(items.reduce((s, i) => s + i.amount, 0)), contractual: round2(items.filter((i) => i.kind === 'contractual').reduce((s, i) => s + i.amount, 0)), discretionary,
    needs_review: items.filter((i) => i.status !== 'ok').length, duplicates: t.duplicate || 0, out_of_network: t.out_of_network || 0, no_carrier: t.no_carrier || 0, no_reason: t.no_reason || 0, large: items.filter((i) => i.findings.some((f) => f.code === 'large')).length,
    by_status: t, by_carrier, by_staff, items,
  };
}
