import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, sectionTitle, findItem } from 'fairclinic-core';
import { BALANCE_FIELDS, SETTINGS_SCHEMA, STATUSES, checkBalances, letterText } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  balances: fileArg('Accounts receivable by guarantor under --root (Dentrix, Eaglesoft, Open Dental, Curve or Denticon aging report): account, guarantor, balance, aging buckets, insurance pending, last payment, last statement, payment plan'),
  settings: fileArg('Optional settings JSON: statement_days, small_balance, collections_days, plan_days'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkBalances(ctx.records(a.balances, 'balances'), { settings: a.settings ? ctx.readJson(a.settings, 'balance_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.accounts} account(s), ${o.total} owed (${o.patient_portion} patient portion, ${o.insurance_pending} waiting on insurance), ${o.over_90} over 90 days, ${o.credits} in credits. ${o.to_work} to work: ${o.by_status.credit_balance || 0} credit(s), ${o.by_status.plan_missed || 0} missed plan payment(s), ${o.by_status.collections_review || 0} for collections review, ${o.by_status.no_statement || 0} without a recent statement.`;

export const manifest = clinicAgent({
  pkg, prefix: 'balances', title: 'Fairclinic Patient Balances',
  description: pkg.description,
  args, required: ['balances'], statuses: STATUSES,
  configSchemas: { balance_settings: SETTINGS_SCHEMA },
  sources: { balances: { label: 'Accounts receivable by guarantor', args: ['balances'], fields: BALANCE_FIELDS } },
  run, summary,
  check: { title: 'Work patient balances', description: 'Every account with a balance: patient portion, insurance pending, aging buckets, last payment and statement, and a status: credit_balance, plan_missed, collections_review, no_statement, insurance_pending, small_balance, payment_plan or ok.' },
  reads: [{
    name: 'balances_explain', title: 'Explain one account', description: 'One account with its figures and the reason for its status.',
    properties: { ...args, account: { type: 'string', description: 'Account as returned by balances_check (a pseudonym is fine)' } }, required: ['balances', 'account'],
    run: (a, ctx) => { const o = run(a, ctx); const i = findItem(o.items, 'account_number', a.account, ctx, { kind: 'account', label: 'account' }); return { summary: `${i.account_number}: ${i.status}. ${i.detail}`, account: i }; },
  }],
  report: {
    title: T9('Patient balances', 'Patientensalden', 'Soldes des patients', 'Saldos de pacientes', 'Saldos de pacientes', 'Saldi dei pazienti', '患者未収金', '患者欠款', '환자 미수금'),
    base: 'balances-worklist',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, account_number: i.account_number, guarantor: i.guarantor, balance: i.balance, patient_portion: i.patient_portion, insurance_pending: i.insurance_pending, aged_90_plus: i.aged_90_plus, last_payment: i.last_payment, last_statement: i.last_statement, reason: i.detail })),
    htmlColumns: ['status', 'account_number', 'balance', 'patient_portion', 'aged_90_plus', 'last_payment', 'last_statement', 'reason'],
    sections: (o) => [
      { title: sectionTitle('by_bucket'), rows: Object.entries(o.buckets).map(([bucket, amount]) => ({ bucket, amount })), columns: ['bucket', 'amount'] },
      { title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] },
    ],
    limits: [CLINIC_LIMITS.files, 'Credit balances are listed for a person to check; this agent never refunds. Collections review means a person looks at the account; it sends nothing to an agency.', CLINIC_LIMITS.phi, CLINIC_LIMITS.baa, CLINIC_LIMITS.advice],
  },
  drafts: {
    noun: 'balance_letter', verb: 'send', category: 'binding_send',
    title: 'Draft a balance reminder for one account',
    description: 'Write drafts/balance_letter-<hash>.md: a plain reminder of the patient portion with the last statement date and a number to call. It threatens nothing. Marked DRAFT; one named person sends it after balances_request_send.',
    required: ['balances', 'account'],
    args: { ...args, account: { type: 'string', description: 'Account as returned by balances_check (a pseudonym is fine)' }, practice: { type: 'string', description: 'Practice name' }, phone: { type: 'string', description: 'Practice phone number' }, from: { type: 'string', description: 'Your name' } },
    build: (a, ctx) => {
      const o = run(a, ctx); const i = findItem(o.items, 'account_number', a.account, ctx, { kind: 'account', label: 'account' });
      if (!(i.patient_portion > 0) || ['credit_balance', 'insurance_pending', 'small_balance'].includes(i.status)) throw new Error(`account ${a.account} has no patient portion to remind about (${i.status})`);
      return { id: i.account_number, text: letterText(i, a), amount: i.patient_portion };
    },
  },
  refused: [REFUSE.refund(), REFUSE.message(), { name: 'collections_send', category: 'binding_send', description: 'Never sends an account to a collection agency or reports it to a credit bureau.' }, REFUSE.pms_write('balances or statements')],
  prompt: {
    title: 'Work patient balances', description: 'Walks the host model through patient balances.',
    text: 'You are helping a dental billing coordinator with fairclinic-patient-balances. Rules: it never refunds, never sends letters, never sends anyone to collections and never changes balances; names and account numbers are pseudonyms. 1. Call balances_check. Lead with credit balances (a person decides about refunds), missed plan payments and collections review, then accounts with no recent statement. 2. Call balances_write_report. 3. Offer balances_draft_balance_letter for one account; balances_request_send waits for one named person.',
  },
});
