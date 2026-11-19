// Fairclinic Client Balances: veterinary client accounts receivable, with the next step for each account.
import { fld, str, num, round2, isoDate, daysBetween, tally } from 'fairclinic-core';

export const ACCOUNT_FIELDS = Object.freeze({
  client_id: fld(['Client ID', 'Account', 'Client #', 'Account #'], { required: true, translate: false }),
  client_name: fld(['Client', 'Client Name', 'Owner', 'Name']),
  balance: fld(['Balance', 'Total Balance', 'Account Balance', 'Amount Due'], { type: 'money', required: true, translate: 'balance' }),
  aged_0_30: fld(['Current', '0-30', '0 - 30'], { type: 'money', translate: false }),
  aged_31_60: fld(['31-60', '31 - 60', '30 Days'], { type: 'money', translate: false }),
  aged_61_90: fld(['61-90', '61 - 90', '60 Days'], { type: 'money', translate: false }),
  aged_90_plus: fld(['90+', 'Over 90', '90 Days', '91+'], { type: 'money', translate: false }),
  deposit: fld(['Deposit', 'Deposits', 'Unapplied Deposit', 'Prepayment', 'On Account'], { type: 'money', translate: false }),
  last_payment: fld(['Last Payment', 'Last Payment Date', 'Last Paid'], { type: 'date', translate: false }),
  last_statement: fld(['Last Statement', 'Last Statement Date', 'Statement Sent', 'Last Reminder'], { type: 'date', translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    statement_days: { type: 'integer', minimum: 7, maximum: 120, description: 'A balance with no statement in this many days is flagged (default 30)' },
    collections_days: { type: 'integer', minimum: 30, maximum: 365, description: 'Money over 90 days with no payment in this many days goes to collections review (default 60)' },
    small_balance: { type: 'number', minimum: 0, maximum: 100, description: 'Balances below this are left for your small-balance policy (default 5)' },
  },
});

export const STATUSES = ['credit_balance', 'deposit_not_applied', 'collections_review', 'no_statement', 'small_balance', 'ok'];

export function checkClientBalances(rows, { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const stmtDays = settings.statement_days || 30, collDays = settings.collections_days || 60, small = settings.small_balance ?? 5;
  const items = rows.filter((r) => str(r.client_id) && num(r.balance) !== null && num(r.balance) !== 0).map((r) => {
    const bal = round2(num(r.balance)); const dep = round2(num(r.deposit) || 0); const over90 = round2(num(r.aged_90_plus) || 0);
    const pay = isoDate(r.last_payment), stmt = isoDate(r.last_statement); const sincePay = pay ? daysBetween(pay, today) : null, sinceStmt = stmt ? daysBetween(stmt, today) : null;
    let status, detail;
    if (bal < 0) { status = 'credit_balance'; detail = `A credit of ${-bal} on the account. A person checks it and decides whether it is refunded or kept on account.`; }
    else if (dep > 0) { status = 'deposit_not_applied'; detail = `${bal} owed while a deposit of ${dep} sits on the account unapplied. Check whether the deposit should be applied.`; }
    else if (over90 > 0 && (sincePay === null || sincePay > collDays)) { status = 'collections_review'; detail = `${over90} over 90 days and ${sincePay === null ? 'no payment recorded' : `no payment for ${sincePay} days`}; ready for a review by a person.`; }
    else if (bal < small) { status = 'small_balance'; detail = `${bal} is below your small-balance amount of ${small}.`; }
    else if (sinceStmt === null || sinceStmt > stmtDays) { status = 'no_statement'; detail = `${bal} owed and ${sinceStmt === null ? 'no statement recorded' : `no statement for ${sinceStmt} days`}.`; }
    else { status = 'ok'; detail = `Statement sent ${stmt}.`; }
    return { client_id: str(r.client_id), client_name: str(r.client_name), balance: bal, aged_0_30: round2(num(r.aged_0_30) || 0), aged_31_60: round2(num(r.aged_31_60) || 0), aged_61_90: round2(num(r.aged_61_90) || 0), aged_90_plus: over90, deposit: dep, last_payment: pay, last_statement: stmt, status, detail };
  });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || b.balance - a.balance || (a.client_id < b.client_id ? -1 : 1));
  const s = (k, f = () => true) => round2(items.filter(f).reduce((x, i) => x + i[k], 0));
  return { as_of: today, accounts: items.length, total: s('balance'), owed: s('balance', (i) => i.balance > 0), credits: round2(-s('balance', (i) => i.balance < 0)), unapplied_deposits: s('deposit'), over_90: s('aged_90_plus'), to_work: items.filter((i) => !['ok', 'small_balance'].includes(i.status)).length, buckets: { '0-30': s('aged_0_30'), '31-60': s('aged_31_60'), '61-90': s('aged_61_90'), '90+': s('aged_90_plus') }, by_status: tally(items, 'status'), items };
}
