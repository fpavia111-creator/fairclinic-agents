import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, sectionTitle, findItem } from 'fairclinic-core';
import { PREAUTH_FIELDS, SETTINGS_SCHEMA, STATUSES, checkPreauths } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  preauths: fileArg('Pre-authorization or pre-treatment estimate list under --root (Dentrix, Eaglesoft, Open Dental, Curve or Denticon export): id, patient, carrier, code, amounts, sent, status, approval end date, scheduled and completed dates'),
  settings: fileArg('Optional settings JSON: response_days, expiry_warn_days, unsent_days, reduced_pct'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkPreauths(ctx.records(a.preauths, 'preauths'), { settings: a.settings ? ctx.readJson(a.settings, 'preauth_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.preauths} pre-authorization(s), ${o.needs_action} need a person: ${o.expired} expired (${o.expired_value}), ${o.expiring} expiring, ${o.no_response} with no answer, ${o.denied} denied, ${o.not_sent} not sent, ${o.reduced} reduced. Approved and at risk: ${o.approved_at_risk}.`;

export const manifest = clinicAgent({
  pkg, prefix: 'preauth', title: 'Fairclinic Pre-authorizations',
  description: pkg.description,
  args, required: ['preauths'], statuses: STATUSES,
  configSchemas: { preauth_settings: SETTINGS_SCHEMA },
  sources: { preauths: { label: 'Pre-authorizations and pre-treatment estimates', args: ['preauths'], fields: PREAUTH_FIELDS } },
  run, summary,
  check: { title: 'Check pre-authorizations', description: 'Every pre-authorization with a status: done_after_expiry, expired, scheduled_after_expiry, denied, expiring, no_response, approved_unscheduled, not_sent, reduced, pending or ok, with the reason and the approved amount at risk.' },
  reads: [{
    name: 'preauth_explain', title: 'Explain one pre-authorization', description: 'One pre-authorization with its dates, amounts and each finding in plain words.',
    properties: { ...args, preauth: { type: 'string', description: 'Pre-authorization id from preauth_check' } }, required: ['preauths', 'preauth'],
    run: (a, ctx) => { const o = run(a, ctx); const i = findItem(o.items, 'preauth_id', a.preauth, ctx, { label: 'pre-authorization' }); return { summary: `${i.preauth_id} (${i.payer}, ${i.code}): ${i.status}. ${i.findings.map((f) => f.detail).join(' ') || 'Nothing to do.'}`, preauth: i }; },
  }],
  report: {
    title: T9('Pre-authorizations to work', 'Offene Vorabgenehmigungen', 'Accords préalables à traiter', 'Autorizaciones previas por gestionar', 'Autorizações prévias a tratar', 'Autorizzazioni preventive da gestire', '対応が必要な事前承認', '待处理的预授权', '처리할 사전 승인'),
    base: 'preauth-worklist',
    rows: (o) => o.items.filter((i) => !['ok', 'pending'].includes(i.status)).map((i) => ({ status: i.status, preauth_id: i.preauth_id, patient_name: i.patient_name, payer: i.payer, provider: i.provider, code: i.code, approved_amount: i.approved_amount, valid_until: i.valid_until, scheduled_date: i.scheduled_date, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'preauth_id', 'payer', 'code', 'approved_amount', 'valid_until', 'scheduled_date', 'reasons'],
    sections: (o) => [
      { title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] },
      { title: sectionTitle('by_payer'), rows: o.by_payer, columns: ['payer', 'count', 'amount'] },
    ],
    limits: [CLINIC_LIMITS.files, 'An approval end date comes from your export; when it is blank, no expiry is checked. A pre-authorization is an estimate, not a promise of payment.', CLINIC_LIMITS.phi, CLINIC_LIMITS.baa, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.insurer_submit('a dental carrier'), REFUSE.pms_write('appointments or treatment plans'), REFUSE.clinical()],
  prompt: {
    title: 'Work pre-authorizations', description: 'Walks the host model through the pre-authorization list.',
    text: 'You are helping a dental treatment coordinator with fairclinic-preauthorizations. Rules: it never sends anything to a carrier, never books or moves appointments and never says what treatment a patient should have; patient names are pseudonyms. 1. Call preauth_check. Lead with work done or scheduled after an approval ran out, then expiring approvals, then requests with no answer. 2. Use preauth_explain when asked. 3. Call preauth_write_report for the coordinator\'s list.',
  },
});
