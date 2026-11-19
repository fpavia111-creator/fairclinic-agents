import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, sectionTitle, exportProfile } from 'fairclinic-core';
import { REMINDER_FIELDS, SETTINGS_SCHEMA, STATUSES, checkReminders } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  reminders: fileArg('Reminder list under --root (Cornerstone, AVImark, ezyVet, Covetrus Pulse or Shepherd reminder report): client, pet, species, reminder, due date, last given, reminder sent, next appointment, pet status, e-mail, phone'),
  settings: fileArg('Optional settings JSON: due_soon_days, recontact_days, inactive_lookback_days'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkReminders(ctx.records(a.reminders, 'reminders'), { settings: a.settings ? ctx.readJson(a.settings, 'reminder_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.reminders} reminder(s), ${o.active} for active pets, ${o.current_pct}% not yet due. ${o.overdue} overdue and not booked. ${o.to_contact} to act on: ${o.by_status.sent_to_inactive || 0} reminder(s) sent for pets marked deceased or inactive, ${o.by_status.overdue_no_contact || 0} overdue with no recent reminder, ${o.by_status.no_contact_info || 0} with no way to reach the client, ${o.by_status.due_soon_no_reminder || 0} due soon with no reminder.`;

export const manifest = clinicAgent({
  pkg, prefix: 'vaccines', title: 'Fairclinic Vaccine Reminders',
  description: pkg.description,
  args, required: ['reminders'], statuses: STATUSES,
  configSchemas: { reminder_settings: SETTINGS_SCHEMA },
  sources: { reminders: { label: 'Reminder list', args: ['reminders'], fields: REMINDER_FIELDS, profiles: [exportProfile('cornerstone_reminders', { client_id: 'Client ID', client_name: 'Client', patient_name: 'Patient Name', reminder: 'Reminder Description', due_date: 'Due Date', reminder_sent: 'Reminder Sent', next_appointment: 'Next Appointment', patient_status: 'Patient Status', client_email: 'Email', client_phone: 'Phone', species: 'Species', last_given: 'Last Given' })] } },
  run, summary,
  check: { title: 'Check vaccine reminders', description: 'Every reminder with a status: sent_to_inactive, overdue_no_contact, no_contact_info, due_soon_no_reminder, overdue_reminded, reminded, booked, not_due or inactive, and overdue counts by reminder. Due dates are your system\'s; nothing here sets a schedule.' },
  report: {
    title: T9('Vaccine reminder follow-up', 'Nachverfolgung der Impferinnerungen', 'Suivi des rappels de vaccins', 'Seguimiento de recordatorios de vacunas', 'Acompanhamento de lembretes de vacinas', 'Controllo dei promemoria vaccinali', 'ワクチン案内のフォロー', '疫苗提醒跟进', '예방접종 알림 후속 조치'),
    base: 'vaccines-reminders',
    rows: (o) => o.items.filter((i) => !['not_due', 'inactive', 'booked', 'reminded'].includes(i.status)).map((i) => ({ status: i.status, client_id: i.client_id, client_name: i.client_name, patient_name: i.patient_name, species: i.species, reminder: i.reminder, due_date: i.due_date, reminder_sent: i.reminder_sent, reason: i.detail })),
    htmlColumns: ['status', 'species', 'reminder', 'due_date', 'reminder_sent', 'reason'],
    sections: (o) => [{ title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'Due dates and reminder types come from your practice system. This agent does not decide which vaccines a pet needs or when; the veterinarian does.', CLINIC_LIMITS.phi, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.message(), REFUSE.pms_write('reminders or patient records'), REFUSE.clinical()],
  prompt: {
    title: 'Follow up vaccine reminders', description: 'Walks the host model through the reminder list.',
    text: 'You are helping a veterinary front desk with fairclinic-vaccine-reminders. Rules: it never sends reminders, never changes records and never says which vaccines a pet needs; pet and client names are pseudonyms. 1. Call vaccines_check. Lead with reminders sent for pets marked deceased or inactive (fix those settings first), then overdue pets with no recent reminder, then clients with no contact details, then due soon. 2. Call vaccines_write_report for the call list.',
  },
});
