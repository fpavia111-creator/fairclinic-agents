import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, MONTH_ARG, REFUSE, sectionTitle } from 'fairclinic-core';
import { ENROLLMENT_FIELDS, PAYMENT_FIELDS, USAGE_FIELDS, SETTINGS_SCHEMA, STATUSES, checkWellness } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  enrollments: fileArg('Wellness plan enrollments under --root (practice system or plan platform export): client, pet, plan, monthly fee, start, status, cancel date'),
  payments: fileArg('Payment processor export under --root for the month: client or customer, date, amount, status'),
  usage: fileArg('Optional plan service use under --root: pet, date, service, quantity'),
  settings: fileArg('Settings JSON: plans (monthly fee and included services per plan year), service_prices, tolerance'),
  month: MONTH_ARG,
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkWellness(ctx.records(a.enrollments, 'enrollments'), ctx.records(a.payments, 'payments'), a.usage ? ctx.records(a.usage, 'usage') : [], { month: a.month, settings: ctx.readJson(a.settings, 'wellness_settings'), asOf: a.as_of });
const summary = (o) => `${o.month}: ${o.enrollments} enrollment(s), ${o.collected} collected. ${o.to_review} to review: ${o.by_finding.failed_not_retried || 0} failed charge(s), ${o.by_finding.missed_payment || 0} missed, ${o.by_finding.wrong_amount || 0} wrong amount, ${o.by_finding.over_used || 0} service(s) used beyond the plan, ${o.by_finding.early_cancel_balance || 0} early cancellation(s) with more used than paid.${o.unknown_plans ? ` ${o.unknown_plans} enrollment(s) on a plan not in the settings.` : ''}`;

export const manifest = clinicAgent({
  pkg, prefix: 'wellness', title: 'Fairclinic Wellness Plans',
  description: pkg.description,
  args, required: ['enrollments', 'payments', 'settings'], statuses: STATUSES,
  configSchemas: { wellness_settings: SETTINGS_SCHEMA },
  sources: { enrollments: { label: 'Wellness plan enrollments', args: ['enrollments'], fields: ENROLLMENT_FIELDS }, payments: { label: 'Processor payments', args: ['payments'], fields: PAYMENT_FIELDS }, usage: { label: 'Plan service use', args: ['usage'], fields: USAGE_FIELDS } },
  run, summary,
  check: { title: 'Check wellness plan billing and use', description: 'Every enrollment for one month: what was collected, plan use against what the plan includes, and for cancelled plans the value used against the fees due, with a status: early_cancel_balance, failed_not_retried, missed_payment, wrong_amount, over_used or ok.' },
  report: {
    title: T9('Wellness plan billing and use', 'Abrechnung und Nutzung der Vorsorgepläne', 'Facturation et usage des plans de santé', 'Facturación y uso de planes de bienestar', 'Cobrança e uso dos planos de bem-estar', 'Fatturazione e utilizzo dei piani benessere', 'ウェルネスプランの請求と利用', '健康计划收费与使用', '웰니스 플랜 청구와 이용'),
    base: 'wellness-plans',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, client_name: i.client_name, patient_name: i.patient_name, plan: i.plan, monthly_fee: i.monthly_fee, collected_in_month: i.collected_in_month, months_enrolled: i.months_enrolled, fees_due: i.fees_due, used_value: i.used_value, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'plan', 'monthly_fee', 'collected_in_month', 'fees_due', 'used_value', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'Plan contents and prices are the ones in your settings. What a client owes after cancelling depends on your plan agreement; the agent only shows the arithmetic.', 'It never charges, retries or refunds a card.', CLINIC_LIMITS.phi, CLINIC_LIMITS.advice],
  },
  refused: [{ name: 'card_charge', category: 'move_money', description: 'Never charges or retries a card.' }, REFUSE.refund(), REFUSE.message(), REFUSE.pms_write('plan enrollments')],
  prompt: {
    title: 'Check wellness plans', description: 'Walks the host model through wellness plan billing and use.',
    text: 'You are helping a veterinary practice manager with fairclinic-wellness-plans. Rules: it never charges, retries or refunds, never messages clients and never decides what a client owes under the agreement; pet and client names are pseudonyms. 1. Call wellness_check with the plan settings. Lead with early cancellations where more was used than paid, then failed and missed charges, then services used beyond the plan. 2. Call wellness_write_report.',
  },
});
