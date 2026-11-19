import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, sectionTitle, findItem, exportProfile } from 'fairclinic-core';
import { RECALL_FIELDS, VISIT_FIELDS, SETTINGS_SCHEMA, STATUSES, checkRecall } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  recall: fileArg('Recall list under --root (Dentrix, Eaglesoft, Open Dental, Curve or Denticon recall export): patient, recall type, due date, next appointment, hygienist, last contact, status'),
  visits: fileArg('Optional hygiene visits under --root: patient, visit date, hygienist and the next appointment booked at that visit, for reappointment rates'),
  settings: fileArg('Optional settings JSON: due_soon_days, recontact_days, lapsed_months, reappointment_target'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkRecall(ctx.records(a.recall, 'recall'), a.visits ? ctx.records(a.visits, 'visits') : [], { settings: a.settings ? ctx.readJson(a.settings, 'recall_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.patients} recall patient(s), ${o.booked_pct}% booked; ${o.to_contact} to contact: ${o.overdue} overdue, ${o.missed_appointments} missed visit(s), ${o.due_soon} due soon, ${o.lapsed} lapsed; ${o.contacted} contacted recently.${o.reappointment_pct === null ? '' : ` Reappointment at hygiene visits: ${o.reappointment_pct}% (${o.hygienists_below_target} hygienist(s) below target).`}`;

export const manifest = clinicAgent({
  pkg, prefix: 'recall', title: 'Fairclinic Recall Gaps',
  description: pkg.description,
  args, required: ['recall'], statuses: STATUSES,
  configSchemas: { recall_settings: SETTINGS_SCHEMA },
  sources: {
    recall: { label: 'Recall list', args: ['recall'], fields: RECALL_FIELDS, profiles: [exportProfile('curve_recall', { patient_name: 'Patient', recall_type: 'Recall Type', due_date: 'Recall Due', next_appointment: 'Next Appointment', hygienist: 'Hygienist', last_contact: 'Last Contact' })] },
    visits: { label: 'Hygiene visits', args: ['visits'], fields: VISIT_FIELDS },
  },
  run, summary,
  check: { title: 'Find recall gaps', description: 'Every recall patient with a status: missed_appointment, overdue, lapsed, due_soon, contacted, scheduled, not_due or inactive, days overdue and the reason; with visits, the share of hygiene visits that left with the next visit booked, per hygienist.' },
  reads: [{
    name: 'recall_hygienists', title: 'Reappointment by hygienist', description: 'Per hygienist: hygiene visits, how many left with the next visit booked, the rate and whether it is below the target in your settings.',
    properties: args, required: ['recall', 'visits'],
    run: (a, ctx) => { const o = run(a, ctx); return { summary: o.hygienists.map((h) => `${h.hygienist}: ${h.reappointed}/${h.visits} rebooked (${h.rate_pct}%)${h.status === 'ok' ? '' : ', below target'}`).join('; ') || 'No visits in the file.', hygienists: o.hygienists, reappointment_pct: o.reappointment_pct }; },
  }, {
    name: 'recall_explain', title: 'Explain one patient', description: 'One recall patient with dates and the reason for the status.',
    properties: { ...args, patient: { type: 'string', description: 'Patient as returned by recall_check (a pseudonym is fine)' } }, required: ['recall', 'patient'],
    run: (a, ctx) => { const o = run(a, ctx); const i = findItem(o.items, 'patient_name', a.patient, ctx, { kind: 'name', label: 'patient' }); return { summary: `${i.patient_name} (${i.recall_type}): ${i.status}. ${i.detail}`, patient: i }; },
  }],
  report: {
    title: T9('Recall gaps', 'Recall-Lücken', 'Rappels en retard', 'Pacientes de revisión pendientes', 'Retornos em atraso', 'Richiami in ritardo', 'リコール未予約', '复诊召回缺口', '리콜 누락'),
    base: 'recall-gaps',
    rows: (o) => o.items.filter((i) => ['missed_appointment', 'overdue', 'lapsed', 'due_soon'].includes(i.status)).map((i) => ({ status: i.status, patient_name: i.patient_name, recall_type: i.recall_type, hygienist: i.hygienist, due_date: i.due_date, days_overdue: i.days_overdue, next_appointment: i.next_appointment, last_contact: i.last_contact, reason: i.detail })),
    htmlColumns: ['status', 'patient_name', 'recall_type', 'due_date', 'days_overdue', 'last_contact', 'reason'],
    sections: (o) => [
      { title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] },
      { title: sectionTitle('by_hygienist'), rows: o.hygienists, columns: ['hygienist', 'visits', 'reappointed', 'rate_pct', 'status'] },
    ],
    limits: [CLINIC_LIMITS.files, 'Due dates and recall types are the ones in your export; this agent does not set recall intervals.', CLINIC_LIMITS.phi, CLINIC_LIMITS.baa, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.message(), REFUSE.pms_write('appointments or recall settings'), REFUSE.clinical()],
  prompt: {
    title: 'Fill recall gaps', description: 'Walks the host model through the recall list.',
    text: 'You are helping a dental front desk with fairclinic-recall-gaps. Rules: it never books appointments, never sends reminders and never changes recall intervals; patient names are pseudonyms. 1. Call recall_check (with visits if you have them). Lead with missed visits and overdue patients not contacted recently, then due soon, then lapsed. 2. Use recall_hygienists for rebooking rates. 3. Call recall_write_report for the call list.',
  },
});
