// Fairclinic Patient Balances: guarantor balances aged, with what to do next for each account.
import { fld, str, num, round2, isoDate, daysBetween, tally } from 'fairclinic-core';

export const BALANCE_FIELDS = Object.freeze({
  account_number: fld(['Account', 'Account #', 'Guarantor ID', 'Acct #', 'Account Number', 'Guar #'], { required: true, translate: false }),
  guarantor: fld(['Guarantor', 'Guarantor Name', 'Responsible Party', 'Patient', 'Name']),
  balance: fld(['Balance', 'Total Balance', 'Account Balance', 'BalTotal'], { type: 'money', required: true, translate: 'balance' }),
  aged_0_30: fld(['0-30', 'Current', '0 - 30', 'Bal_0_30'], { type: 'money', translate: false }),
  aged_31_60: fld(['31-60', '31 - 60', 'Bal_31_60'], { type: 'money', translate: false }),
  aged_61_90: fld(['61-90', '61 - 90', 'Bal_61_90'], { type: 'money', translate: false }),
  aged_90_plus: fld(['90+', 'Over 90', '91+', 'BalOver90', '90 Plus'], { type: 'money', translate: false }),
  insurance_pending: fld(['Ins Pending', 'Insurance Pending', 'Ins Est', 'InsEst', 'Est. Insurance'], { type: 'money', translate: false }),
  last_payment: fld(['Last Payment', 'Last Payment Date', 'Last Pmt', 'DateLastPay'], { type: 'date', translate: false }),
  last_statement: fld(['Last Statement', 'Last Statement Date', 'Statement Sent', 'DateLastStatement'], { type: 'date', translate: false }),
  payment_plan: fld(['Payment Plan', 'On Plan', 'Plan', 'HasPayPlan'], { translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    statement_days: { type: 'integer', minimum: 7, maximum: 90, description: 'An account owing more than the small balance with no statement in this many days is flagged (default 35)' },
    small_balance: { type: 'number', minimum: 0, maximum: 100, description: 'Patient portions below this are left for your small-balance policy (default 5)' },
    collections_days: { type: 'integer', minimum: 30, maximum: 365, description: 'An account with money over 90 days and no payment in this many days goes to collections review (default 60)' },
    plan_days: { type: 'integer', minimum: 15, maximum: 120, description: 'A payment plan with no payment in this many days is flagged (default 45)' },
  },
});

export const STATUSES = ['credit_balance', 'plan_missed', 'collections_review', 'no_statement', 'insurance_pending', 'small_balance', 'payment_plan', 'ok'];
const yes = (v) => /^(y|yes|true|1|x|on plan|active)$/i.test(str(v));

export function checkBalances(rows, { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const stmtDays = settings.statement_days || 35, small = settings.small_balance ?? 5, collDays = settings.collections_days || 60, planDays = settings.plan_days || 45;
  const items = rows.filter((r) => str(r.account_number) && num(r.balance) !== null && num(r.balance) !== 0).map((r) => {
    const bal = round2(num(r.balance)); const ins = round2(num(r.insurance_pending) || 0); const portion = round2(Math.max(0, bal - ins));
    const over90 = round2(num(r.aged_90_plus) || 0); const pay = isoDate(r.last_payment); const stmt = isoDate(r.last_statement); const plan = yes(r.payment_plan);
    const sincePay = pay ? daysBetween(pay, today) : null; const sinceStmt = stmt ? daysBetween(stmt, today) : null;
    let status, detail;
    if (bal < 0) { status = 'credit_balance'; detail = `A credit of ${-bal}: the account may be owed money back. A person checks it and decides about a refund.`; }
    else if (plan && (sincePay === null || sincePay > planDays)) { status = 'plan_missed'; detail = `On a payment plan with ${sincePay === null ? 'no payment recorded' : `no payment for ${sincePay} days`}.`; }
    else if (plan) { status = 'payment_plan'; detail = `On a payment plan; last payment ${pay}.`; }
    else if (over90 > 0 && (sincePay === null || sincePay > collDays)) { status = 'collections_review'; detail = `${over90} over 90 days and ${sincePay === null ? 'no payment recorded' : `no payment for ${sincePay} days`}; ready for a collections review by a person.`; }
    else if (portion > 0 && portion < small) { status = 'small_balance'; detail = `Patient portion ${portion} is below your small-balance amount of ${small}.`; }
    else if (portion >= small && (sinceStmt === null || sinceStmt > stmtDays)) { status = 'no_statement'; detail = `Patient portion ${portion} and ${sinceStmt === null ? 'no statement recorded' : `no statement for ${sinceStmt} days`}.`; }
    else if (portion === 0 && ins > 0) { status = 'insurance_pending'; detail = `The balance is waiting on ${ins} of insurance; nothing to bill the patient yet.`; }
    else { status = 'ok'; detail = `Statement sent ${stmt || 'recently'}.`; }
    return { account_number: str(r.account_number), guarantor: str(r.guarantor), balance: bal, patient_portion: portion, insurance_pending: ins, aged_0_30: round2(num(r.aged_0_30) || 0), aged_31_60: round2(num(r.aged_31_60) || 0), aged_61_90: round2(num(r.aged_61_90) || 0), aged_90_plus: over90, last_payment: pay, last_statement: stmt, payment_plan: plan, status, detail };
  });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || b.balance - a.balance || (a.account_number < b.account_number ? -1 : 1));
  const s = (k, f = () => true) => round2(items.filter(f).reduce((x, i) => x + i[k], 0));
  const t = tally(items, 'status');
  return {
    as_of: today, accounts: items.length, total: s('balance'), patient_portion: s('patient_portion'), insurance_pending: s('insurance_pending', (i) => i.balance > 0),
    credits: round2(-s('balance', (i) => i.balance < 0)), over_90: s('aged_90_plus'), to_work: items.filter((i) => !['ok', 'payment_plan', 'insurance_pending', 'small_balance'].includes(i.status)).length,
    buckets: { '0-30': s('aged_0_30'), '31-60': s('aged_31_60'), '61-90': s('aged_61_90'), '90+': s('aged_90_plus') },
    by_status: t, items,
  };
}

/** A plain balance reminder for one account. It states figures and asks the person to call; it threatens nothing. */
export function letterText(i, { practice, phone, from } = {}) {
  return [
    `# Balance reminder: account ${i.account_number}`, '',
    `**To:** ${i.guarantor || '[TO CONFIRM account holder]'}, [TO CONFIRM mailing address or e-mail on file]`,
    `**From:** ${from || '[TO CONFIRM your name]'}, ${practice || '[TO CONFIRM practice name]'}`, '',
    `Dear ${i.guarantor || 'account holder'},`, '',
    `Our records show a balance of ${i.patient_portion} that is yours to pay on account ${i.account_number}${i.insurance_pending ? ` (a further ${i.insurance_pending} is waiting on insurance)` : ''}.${i.last_statement ? ` Our last statement was sent on ${i.last_statement}.` : ''}`, '',
    `If you have already paid, thank you, and please ignore this letter. If you have a question about the balance or would like to set up a payment plan, please call us at ${phone || '[TO CONFIRM practice phone]'}.`, '',
    'Kind regards,', '', `${practice || '[TO CONFIRM practice name]'}`,
  ].join('\n');
}
