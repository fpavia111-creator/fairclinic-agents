import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, MONTH_ARG, REFUSE, sectionTitle } from 'fairclinic-core';
import { MEMBER_FIELDS, PAYMENT_FIELDS, VISIT_FIELDS, SETTINGS_SCHEMA, STATUSES, checkMemberships } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  members: fileArg('Membership roster under --root (practice system or membership platform export): member, plan, fee, monthly or annual, start, status, cancel date, renewal date'),
  payments: fileArg('Payment processor export under --root for the month: customer or member name, date, amount, status (succeeded or failed)'),
  visits: fileArg('Optional visits under --root (patient, date, code, member discount) to find plan use after a membership ended'),
  month: MONTH_ARG,
  settings: fileArg('Optional settings JSON: renewal_warn_days, tolerance'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkMemberships(ctx.records(a.members, 'members'), ctx.records(a.payments, 'payments'), a.visits ? ctx.records(a.visits, 'visits') : [], { month: a.month, settings: a.settings ? ctx.readJson(a.settings, 'membership_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.month}: ${o.members} member(s), ${o.expected_monthly} expected from monthly plans, ${o.collected} collected. ${o.to_review} to review: ${o.by_finding.missed_payment || 0} missed, ${o.by_finding.failed_not_retried || 0} failed, ${o.by_finding.wrong_amount || 0} wrong amount, ${o.by_finding.billed_after_cancel || 0} charged after cancelling, ${o.by_finding.used_after_lapse || 0} visit(s) after a membership ended, ${o.by_finding.not_in_roster || 0} charge(s) not on the roster, ${o.by_finding.renewal_due || 0} renewal(s) due.`;

export const manifest = clinicAgent({
  pkg, prefix: 'membership', title: 'Fairclinic Membership Plans',
  description: pkg.description,
  args, required: ['members', 'payments'], statuses: STATUSES,
  configSchemas: { membership_settings: SETTINGS_SCHEMA },
  sources: {
    members: { label: 'Membership roster', args: ['members'], fields: MEMBER_FIELDS },
    payments: { label: 'Processor payments', args: ['payments'], fields: PAYMENT_FIELDS },
    visits: { label: 'Visits', args: ['visits'], fields: VISIT_FIELDS },
  },
  run, summary,
  check: { title: 'Check membership billing', description: 'Every member for one month with what was collected and a status: billed_after_cancel, used_after_lapse, failed_not_retried, missed_payment, wrong_amount, annual_lapsed, not_in_roster, renewal_due or ok.' },
  report: {
    title: T9('Membership plan billing', 'Abrechnung der Mitgliedschaftspläne', 'Facturation des abonnements', 'Facturación de planes de membresía', 'Cobrança dos planos de assinatura', 'Fatturazione dei piani di abbonamento', '会員プランの請求', '会员计划收费', '멤버십 플랜 청구'),
    base: 'membership-billing',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, patient_name: i.patient_name, plan: i.plan, billing: i.billing, fee: i.fee, collected: i.collected, cancel_date: i.cancel_date, renewal_date: i.renewal_date, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'patient_name', 'plan', 'fee', 'collected', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'Members and payments are matched by name as written in both files; a name spelled differently shows as missed and not on the roster.', 'It never charges, retries or refunds a card; a person does that in the processor.', CLINIC_LIMITS.phi, CLINIC_LIMITS.baa, CLINIC_LIMITS.advice],
  },
  refused: [{ name: 'card_charge', category: 'move_money', description: 'Never charges or retries a card.' }, REFUSE.refund(), REFUSE.message(), REFUSE.pms_write('membership records')],
  prompt: {
    title: 'Check membership billing', description: 'Walks the host model through a month of membership billing.',
    text: 'You are helping a dental office manager with fairclinic-membership-plans. Rules: it never charges, retries or refunds, never messages members and never changes the roster; names are pseudonyms. 1. Call membership_check for the month. Lead with charges after cancelling (a person decides about refunds) and visits after a membership ended, then failed and missed charges, then wrong amounts and charges not on the roster. 2. Call membership_write_report.',
  },
});
