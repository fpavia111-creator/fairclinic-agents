import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, sectionTitle } from 'fairclinic-core';
import { ACCOUNT_FIELDS, SETTINGS_SCHEMA, STATUSES, checkClientBalances } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  balances: fileArg('Client accounts receivable under --root (AVImark, Cornerstone, ezyVet, Covetrus Pulse or Shepherd aged balances report): client, balance, aging buckets, deposit on account, last payment, last statement'),
  settings: fileArg('Optional settings JSON: statement_days, collections_days, small_balance'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkClientBalances(ctx.records(a.balances, 'balances'), { settings: a.settings ? ctx.readJson(a.settings, 'client_balance_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.accounts} client account(s): ${o.owed} owed, ${o.over_90} over 90 days, ${o.credits} in credits, ${o.unapplied_deposits} in unapplied deposits. ${o.to_work} to work: ${o.by_status.credit_balance || 0} credit(s), ${o.by_status.deposit_not_applied || 0} deposit(s) not applied, ${o.by_status.collections_review || 0} for collections review, ${o.by_status.no_statement || 0} with no recent statement.`;

export const manifest = clinicAgent({
  pkg, prefix: 'clientar', title: 'Fairclinic Client Balances',
  description: pkg.description,
  args, required: ['balances'], statuses: STATUSES,
  configSchemas: { client_balance_settings: SETTINGS_SCHEMA },
  sources: { balances: { label: 'Client accounts receivable', args: ['balances'], fields: ACCOUNT_FIELDS } },
  run, summary,
  check: { title: 'Work client balances', description: 'Every client account with a balance, its aging buckets, deposits and last payment and statement, with a status: credit_balance, deposit_not_applied, collections_review, no_statement, small_balance or ok.' },
  report: {
    title: T9('Client balances', 'Kundensalden', 'Soldes des clients', 'Saldos de clientes', 'Saldos de tutores', 'Saldi dei clienti', '飼い主の未収金', '客户欠款', '보호자 미수금'),
    base: 'clientar-worklist',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, client_id: i.client_id, client_name: i.client_name, balance: i.balance, aged_90_plus: i.aged_90_plus, deposit: i.deposit, last_payment: i.last_payment, last_statement: i.last_statement, reason: i.detail })),
    htmlColumns: ['status', 'client_id', 'balance', 'aged_90_plus', 'deposit', 'last_payment', 'last_statement', 'reason'],
    sections: (o) => [{ title: sectionTitle('by_bucket'), rows: Object.entries(o.buckets).map(([bucket, amount]) => ({ bucket, amount })), columns: ['bucket', 'amount'] }, { title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'Credits and deposits are listed for a person to check; the agent never refunds or applies money. Collections review means a person looks at the account; nothing is sent to an agency.', CLINIC_LIMITS.phi, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.refund(), REFUSE.message(), { name: 'collections_send', category: 'binding_send', description: 'Never sends an account to a collection agency or reports it to a credit bureau.' }, REFUSE.pms_write('client accounts')],
  prompt: {
    title: 'Work client balances', description: 'Walks the host model through veterinary client balances.',
    text: 'You are helping a veterinary practice manager with fairclinic-client-balances. Rules: it never refunds, applies deposits, sends statements or sends anyone to collections; client names are pseudonyms. 1. Call clientar_check. Lead with credits and unapplied deposits (a person decides), then collections review, then accounts with no recent statement. 2. Call clientar_write_report.',
  },
});
