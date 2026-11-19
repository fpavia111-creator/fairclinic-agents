import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, sectionTitle } from 'fairclinic-core';
import { APPOINTMENT_FIELDS, SETTINGS_SCHEMA, STATUSES, checkNoShows } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  appointments: fileArg('Appointments under --root (Dentrix, Eaglesoft, Open Dental, Curve, Denticon, AVImark, Cornerstone, ezyVet, Covetrus Pulse or Shepherd appointment export): appointment, patient, provider, date, type, status, cancelled on, rebooked, fee charged, scheduled value'),
  settings: fileArg('Optional settings JSON: late_cancel_days, no_show_fee (your own policy)'),
};
const run = (a, ctx) => checkNoShows(ctx.records(a.appointments, 'appointments'), { settings: a.settings ? ctx.readJson(a.settings, 'noshow_settings') : {} });
const summary = (o) => `${o.appointments} appointment(s): ${o.no_shows} no-show(s) (${o.no_show_pct}%), ${o.late_cancels} late cancellation(s) (${o.late_cancel_pct}%), ${o.unfilled_value} of scheduled value lost to them. ${o.to_review} to follow up: ${o.by_finding.no_show_not_rebooked || 0} no-show(s) and ${o.by_finding.late_cancel_not_rebooked || 0} late cancellation(s) not rebooked, ${o.by_finding.repeat_no_show || 0} repeat no-show(s), ${o.by_finding.fee_not_charged || 0} no-show fee(s) not charged.`;

export const manifest = clinicAgent({
  pkg, prefix: 'noshows', title: 'Fairclinic No-shows',
  description: pkg.description,
  args, required: ['appointments'], statuses: STATUSES,
  configSchemas: { noshow_settings: SETTINGS_SCHEMA },
  sources: { appointments: { label: 'Appointments', args: ['appointments'], fields: APPOINTMENT_FIELDS } },
  run, summary,
  check: { title: 'Follow up no-shows and late cancellations', description: 'Every appointment as kept, cancelled, late cancellation or no-show, with a status: repeat_no_show, no_show_not_rebooked, late_cancel_not_rebooked, fee_not_charged or ok; no-show and late-cancellation rates by provider and the scheduled value lost.' },
  report: {
    title: T9('No-shows and late cancellations', 'Nicht erschienene Patienten und kurzfristige Absagen', 'Absences et annulations tardives', 'Inasistencias y cancelaciones tardías', 'Faltas e cancelamentos tardios', 'Assenze e disdette tardive', '無断キャンセルと直前キャンセル', '爽约与临时取消', '노쇼와 당일 취소'),
    base: 'noshows-follow-up',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, appointment_id: i.appointment_id, patient_name: i.patient_name, provider: i.provider, date: i.date, appointment_type: i.appointment_type, outcome: i.outcome, rebooked: i.rebooked, scheduled_value: i.scheduled_value, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'appointment_id', 'provider', 'date', 'appointment_type', 'outcome', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_provider'), rows: o.by_provider, columns: ['provider', 'appointments', 'no_shows', 'late_cancels', 'no_show_pct'] }],
    limits: [CLINIC_LIMITS.files, 'The late-cancellation window and the fee are your own policy. Charging or waiving a fee is a person\'s decision; the agent charges nothing.', CLINIC_LIMITS.phi, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.message(), REFUSE.pms_write('the schedule'), { name: 'client_charge', category: 'move_money', description: 'Never charges a no-show or cancellation fee.' }],
  prompt: {
    title: 'Follow up no-shows', description: 'Walks the host model through no-shows and late cancellations.',
    text: 'You are helping a clinic front desk with fairclinic-no-shows. Rules: it never books, messages or charges anyone; patient names are pseudonyms. 1. Call noshows_check with your policy settings. Lead with repeat no-shows and no-shows not rebooked, then late cancellations not rebooked, then fees for a person to decide. 2. Call noshows_write_report for the call list.',
  },
});
