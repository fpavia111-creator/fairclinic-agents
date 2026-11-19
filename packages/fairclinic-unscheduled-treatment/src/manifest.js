import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, sectionTitle, findItem, exportProfile } from 'fairclinic-core';
import { PLAN_FIELDS, SETTINGS_SCHEMA, STATUSES, checkTreatment, letterText } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  plans: fileArg('Treatment plan lines under --root (Dentrix, Eaglesoft, Open Dental, Curve or Denticon treatment plan report): patient, code, fee, status, date planned, scheduled date, remaining benefits'),
  settings: fileArg('Optional settings JSON: stale_days, benefits_warn_days, min_value'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkTreatment(ctx.records(a.plans, 'plans'), { settings: a.settings ? ctx.readJson(a.settings, 'treatment_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.patients} patient(s), ${o.to_call} to contact: ${o.unscheduled_accepted} accepted and ${o.unscheduled_proposed} proposed treatment not scheduled; ${o.benefits_expiring} patient(s) with ${o.benefits_remaining} of benefits ending soon; ${o.stale} plan(s) old enough for the dentist to review.`;

export const manifest = clinicAgent({
  pkg, prefix: 'treatment', title: 'Fairclinic Unscheduled Treatment',
  description: pkg.description,
  args, required: ['plans'], statuses: STATUSES,
  configSchemas: { treatment_settings: SETTINGS_SCHEMA },
  sources: { plans: { label: 'Treatment plan lines', args: ['plans'], fields: PLAN_FIELDS, profiles: [exportProfile('eaglesoft_treatment_plans', { patient_name: 'Patient', status: 'Plan Status', date_planned: 'Date Planned', fee: 'Treatment Fee', code: 'Code', est_insurance: 'Est. Insurance', scheduled_date: 'Appt Date', remaining_benefit: 'Remaining Benefits' })] } },
  run, summary,
  check: { title: 'Find unscheduled treatment', description: 'Every patient with treatment planned and not booked: accepted and proposed amounts, remaining benefits and benefit year end, the oldest plan date, and a status: benefits_expiring, accepted_unscheduled, proposed_unscheduled, stale, declined, scheduled or done.' },
  reads: [{
    name: 'treatment_explain', title: 'Explain one patient', description: 'One patient\'s plan lines with their status and the findings in plain words.',
    properties: { ...args, patient: { type: 'string', description: 'Patient as returned by treatment_check (a pseudonym is fine)' } }, required: ['plans', 'patient'],
    run: (a, ctx) => { const o = run(a, ctx); const i = findItem(o.items, 'patient_name', a.patient, ctx, { kind: 'name', label: 'patient' }); return { summary: `${i.patient_name}: ${i.status}. ${i.findings.map((f) => f.detail).join(' ') || 'Nothing unscheduled.'}`, patient: i }; },
  }],
  report: {
    title: T9('Unscheduled treatment', 'Nicht terminierte Behandlungen', 'Traitements non planifiés', 'Tratamientos sin programar', 'Tratamentos não agendados', 'Trattamenti non programmati', '未予約の治療計画', '未预约的治疗', '예약되지 않은 치료'),
    base: 'treatment-unscheduled',
    rows: (o) => o.items.filter((i) => ['benefits_expiring', 'accepted_unscheduled', 'proposed_unscheduled', 'stale'].includes(i.status)).map((i) => ({ status: i.status, patient_name: i.patient_name, providers: i.providers, unscheduled_accepted: i.unscheduled_accepted, unscheduled_proposed: i.unscheduled_proposed, stale_value: i.stale_value, remaining_benefit: i.remaining_benefit, benefit_year_end: i.benefit_year_end, oldest_planned: i.oldest_planned, codes: i.lines.filter((l) => ['accepted', 'proposed', 'stale'].includes(l.kind)).map((l) => l.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'patient_name', 'unscheduled_accepted', 'unscheduled_proposed', 'remaining_benefit', 'benefit_year_end', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'Remaining benefits are what your export shows; the plan decides what it pays. The benefit year ends on 31 December unless the file says otherwise.', 'A plan older than the stale setting is set aside: the dentist decides whether it still stands.', CLINIC_LIMITS.phi, CLINIC_LIMITS.baa, CLINIC_LIMITS.advice],
  },
  drafts: {
    noun: 'patient_letter', verb: 'send', category: 'binding_send',
    title: 'Draft a letter to one patient about unscheduled treatment',
    description: 'Write drafts/patient_letter-<hash>.md: a plain letter listing the patient\'s accepted and proposed treatment that is not booked, with fees, insurance estimates and remaining benefits. It never says what care the patient needs. Marked DRAFT; one named person sends it after treatment_request_send.',
    required: ['plans', 'patient'],
    args: { ...args, patient: { type: 'string', description: 'Patient as returned by treatment_check (a pseudonym is fine)' }, practice: { type: 'string', description: 'Practice name' }, phone: { type: 'string', description: 'Practice phone number' }, from: { type: 'string', description: 'Your name' } },
    build: (a, ctx) => {
      const o = run(a, ctx); const i = findItem(o.items, 'patient_name', a.patient, ctx, { kind: 'name', label: 'patient' });
      const d = letterText(i, a);
      if (!d.total) throw new Error(`patient ${a.patient} has no accepted or proposed treatment that is unscheduled`);
      return { id: i.patient_name, text: d.text, amount: d.total };
    },
  },
  refused: [REFUSE.message(), REFUSE.pms_write('appointments or treatment plans'), REFUSE.clinical()],
  prompt: {
    title: 'Follow up unscheduled treatment', description: 'Walks the host model through unscheduled treatment with this agent.',
    text: 'You are helping a dental treatment coordinator with fairclinic-unscheduled-treatment. Rules: it never books appointments, never sends letters and never says what care a patient needs; patient names are pseudonyms. 1. Call treatment_check. Lead with patients whose benefits end soon, then accepted treatment, then proposed. Leave stale plans for the dentist. 2. Call treatment_write_report for the call list. 3. Offer treatment_draft_patient_letter for one patient; treatment_request_send waits for one named person.',
  },
});
