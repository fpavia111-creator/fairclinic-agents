import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, sectionTitle } from 'fairclinic-core';
import { BATCH_FIELDS, DEPOSIT_FIELDS, PMS_FIELDS, SETTINGS_SCHEMA, STATUSES, checkDeposits } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  batches: fileArg('Card processor batches or payouts under --root (processor settlement export): batch, date, gross, fees, refunds, chargebacks, net'),
  deposits: fileArg('Bank statement lines under --root (CSV or Excel export): date, amount, description'),
  pms: fileArg('Optional card payments by day from the practice system under --root: date, card total'),
  settings: fileArg('Optional settings JSON: deposit_days, tolerance, fee_pct'),
};
const run = (a, ctx) => checkDeposits(ctx.records(a.batches, 'batches'), ctx.records(a.deposits, 'deposits'), a.pms ? ctx.records(a.pms, 'pms') : [], { settings: a.settings ? ctx.readJson(a.settings, 'deposit_settings') : {} });
const summary = (o) => `${o.batches} batch(es): gross ${o.gross}, fees ${o.fees} (${o.fee_pct}%), net ${o.net}, deposited ${o.deposited}. ${o.to_review} to review: ${o.by_finding.no_deposit || 0} with no deposit, ${o.by_finding.amount_differs || 0} deposited at a different amount, ${o.by_finding.chargeback || 0} chargeback(s) (${o.chargebacks}), ${o.by_finding.pms_differs || 0} day(s) where the practice system differs, ${o.by_finding.fees_high || 0} with high fees, ${o.by_finding.deposit_unmatched || 0} deposit(s) matching no batch.`;

export const manifest = clinicAgent({
  pkg, prefix: 'deposits', title: 'Fairclinic Card Deposits',
  description: pkg.description,
  args, required: ['batches', 'deposits'], statuses: STATUSES,
  configSchemas: { deposit_settings: SETTINGS_SCHEMA },
  sources: { batches: { label: 'Processor batches', args: ['batches'], fields: BATCH_FIELDS }, deposits: { label: 'Bank deposits', args: ['deposits'], fields: DEPOSIT_FIELDS }, pms: { label: 'Practice system card totals', args: ['pms'], fields: PMS_FIELDS } },
  run, summary,
  check: { title: 'Match card batches to deposits', description: 'Every processor batch matched to a bank deposit (by batch id in the description, else by net amount within a few days), checked against the practice system\'s card total for the day, with a status: no_deposit, amount_differs, chargeback, pms_differs, fees_high, deposit_unmatched or ok.' },
  report: {
    title: T9('Card batches and deposits', 'Kartenabrechnungen und Bankeingänge', 'Remises de cartes et dépôts', 'Lotes de tarjeta y depósitos', 'Lotes de cartão e depósitos', 'Lotti di carte e accrediti', 'カード精算と入金', '刷卡批次与入账', '카드 정산과 입금'),
    base: 'deposits-match',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, kind: i.kind, batch_id: i.batch_id, date: i.date, gross: i.gross, fees: i.fees, chargebacks: i.chargebacks, net: i.net, deposited: i.deposited, deposit_date: i.deposit_date, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'batch_id', 'date', 'gross', 'net', 'deposited', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'Deposits are matched by batch id in the bank description, else by the net amount within the deposit days; two batches with the same net on nearby days can swap.', CLINIC_LIMITS.arithmetic, CLINIC_LIMITS.advice],
  },
  refused: [{ name: 'dispute_respond', category: 'binding_send', description: 'Never responds to a chargeback or dispute; a person does in the processor portal.' }, REFUSE.refund(), { name: 'ledger_post', category: 'binding_send', description: 'Never posts to the books or the bank.' }],
  prompt: {
    title: 'Match card deposits', description: 'Walks the host model through card batches and deposits.',
    text: 'You are helping a clinic office manager with fairclinic-card-deposits. Rules: it never responds to disputes, never refunds and never posts anything. 1. Call deposits_check with the practice system card totals if you have them. Lead with batches that never arrived and deposits at a different amount, then chargebacks (they have deadlines), then days where the practice system differs, then fees. 2. Call deposits_write_report.',
  },
});
