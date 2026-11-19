// Fairclinic Card Deposits: card processor batches against bank deposits and the practice system's card totals.
import { fld, str, num, round2, isoDate, daysBetween, pct, tally } from 'fairclinic-core';

export const BATCH_FIELDS = Object.freeze({
  batch_id: fld(['Batch', 'Batch ID', 'Batch #', 'Settlement ID', 'Payout ID'], { required: true, translate: false }),
  batch_date: fld(['Batch Date', 'Date', 'Settlement Date', 'Close Date'], { type: 'date', required: true, translate: 'date' }),
  gross: fld(['Gross', 'Sales', 'Gross Amount', 'Total Sales'], { type: 'money', required: true, translate: false }),
  fees: fld(['Fees', 'Fee', 'Processing Fees', 'Discount Fees'], { type: 'money', translate: false }),
  refunds: fld(['Refunds', 'Returns', 'Refund Amount'], { type: 'money', translate: false }),
  chargebacks: fld(['Chargebacks', 'Disputes', 'Chargeback Amount'], { type: 'money', translate: false }),
  net: fld(['Net', 'Net Deposit', 'Net Amount', 'Payout Amount'], { type: 'money', translate: false }),
});
export const DEPOSIT_FIELDS = Object.freeze({
  date: fld(['Date', 'Posting Date', 'Transaction Date', 'Value Date'], { type: 'date', required: true }),
  amount: fld(['Amount', 'Credit', 'Deposit', 'Deposits'], { type: 'money', required: true }),
  description: fld(['Description', 'Memo', 'Reference', 'Details'], { translate: 'description' }),
});
export const PMS_FIELDS = Object.freeze({
  date: fld(['Date', 'Day', 'Business Date'], { type: 'date', required: true }),
  card_total: fld(['Card Payments', 'Card Total', 'Credit Card', 'Cards', 'Card'], { type: 'money', required: true, translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    deposit_days: { type: 'integer', minimum: 0, maximum: 15, description: 'Days after the batch date to look for the deposit (default 5)' },
    tolerance: { type: 'number', minimum: 0, maximum: 10, description: 'Differences up to this are equal (default 0.01)' },
    fee_pct: { type: 'number', minimum: 0.1, maximum: 20, description: 'Fees above this percent of gross are flagged (default 3.5)' },
  },
});

export const STATUSES = ['no_deposit', 'amount_differs', 'chargeback', 'pms_differs', 'fees_high', 'deposit_unmatched', 'ok'];

export function checkDeposits(batches, deposits, pms = [], { settings = {} } = {}) {
  const days = settings.deposit_days ?? 5, tol = settings.tolerance ?? 0.01, feeMax = settings.fee_pct || 3.5;
  const bank = deposits.filter((d) => isoDate(d.date) && num(d.amount) > 0).map((d, i) => ({ i, date: isoDate(d.date), amount: round2(num(d.amount)), description: str(d.description), used: false })).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.amount - b.amount));
  const pmsBy = new Map(); for (const p of pms) { const d = isoDate(p.date); if (d) pmsBy.set(d, round2((pmsBy.get(d) || 0) + (num(p.card_total) || 0))); }
  const rows = batches.filter((b) => str(b.batch_id) && isoDate(b.batch_date)).sort((a, b) => (isoDate(a.batch_date) < isoDate(b.batch_date) ? -1 : 1));
  const items = rows.map((b) => {
    const id = str(b.batch_id), d = isoDate(b.batch_date); const gross = round2(num(b.gross) || 0), fees = round2(num(b.fees) || 0), refunds = round2(num(b.refunds) || 0), cb = round2(num(b.chargebacks) || 0);
    const net = num(b.net) !== null ? round2(num(b.net)) : round2(gross - fees - refunds - cb);
    const f = []; const add = (code, detail) => f.push({ code, detail });
    let dep = bank.find((x) => !x.used && id && x.description.toUpperCase().includes(id.toUpperCase()));
    if (!dep) dep = bank.find((x) => !x.used && Math.abs(x.amount - net) <= tol && daysBetween(d, x.date) >= 0 && daysBetween(d, x.date) <= days);
    if (dep) { dep.used = true; if (Math.abs(dep.amount - net) > tol) add('amount_differs', `Deposited ${dep.amount} on ${dep.date}; the batch net is ${net} (difference ${round2(dep.amount - net)}).`); }
    else add('no_deposit', `No bank deposit of ${net} within ${days} day(s) of ${d}.`);
    if (cb > 0) add('chargeback', `A chargeback of ${cb} came out of this batch. Someone responds to the dispute in the processor's portal before its deadline.`);
    if (pmsBy.has(d) && Math.abs(pmsBy.get(d) - gross) > tol) add('pms_differs', `The practice system shows ${pmsBy.get(d)} in card payments on ${d}; the batch gross is ${gross} (difference ${round2(gross - pmsBy.get(d))}).`);
    const fp = gross ? pct(fees, gross) : null; if (fp !== null && fp > feeMax) add('fees_high', `Fees were ${fp}% of gross (${fees} of ${gross}); your flag is ${feeMax}%.`);
    return { kind: 'batch', batch_id: id, date: d, gross, fees, refunds, chargebacks: cb, net, deposited: dep ? dep.amount : null, deposit_date: dep ? dep.date : null, fee_pct: fp, status: STATUSES.find((s) => f.some((x) => x.code === s)) || 'ok', findings: f };
  });
  const first = rows.length ? isoDate(rows[0].batch_date) : null;
  for (const x of bank.filter((y) => !y.used && /merch|card|settle|payout|deposit|bankcard|stripe|square|batch/i.test(y.description) && (!first || y.date >= first))) items.push({ kind: 'deposit', batch_id: '', date: x.date, gross: null, fees: null, refunds: null, chargebacks: null, net: null, deposited: x.amount, deposit_date: x.date, fee_pct: null, status: 'deposit_unmatched', findings: [{ code: 'deposit_unmatched', detail: `A card deposit of ${x.amount} on ${x.date} matches no batch in the file.` }] });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (a.date < b.date ? -1 : 1));
  const s = (k) => round2(items.filter((i) => i.kind === 'batch').reduce((t, i) => t + (i[k] || 0), 0));
  return { batches: rows.length, gross: s('gross'), fees: s('fees'), net: s('net'), deposited: s('deposited'), chargebacks: s('chargebacks'), fee_pct: s('gross') ? pct(s('fees'), s('gross')) : null, to_review: items.filter((i) => i.status !== 'ok').length, by_status: tally(items, 'status'), by_finding: tally(items, (i) => i.findings.map((f) => f.code)), items };
}
