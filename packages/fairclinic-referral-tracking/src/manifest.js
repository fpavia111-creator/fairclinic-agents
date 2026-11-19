import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, sectionTitle } from 'fairclinic-core';
import { OUT_FIELDS, IN_FIELDS, SETTINGS_SCHEMA, STATUSES, checkReferrals } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  outgoing: fileArg('Referrals sent out under --root (practice system referral report or a spreadsheet): date, patient, referred to, specialty, report received'),
  incoming: fileArg('Optional referrals received under --root: date, new patient, source, source type, first visit, production, thank-you sent'),
  settings: fileArg('Optional settings JSON: report_days, first_visit_days'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkReferrals(ctx.records(a.outgoing, 'outgoing'), a.incoming ? ctx.records(a.incoming, 'incoming') : [], { settings: a.settings ? ctx.readJson(a.settings, 'referral_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.referrals_out} referral(s) sent, ${o.referrals_in} received. ${o.to_follow_up} to follow up: ${o.by_status.no_report || 0} with no report back, ${o.by_status.no_first_visit || 0} referred in and never seen, ${o.by_status.thank_you_not_sent || 0} referring doctor(s) not thanked.`;

export const manifest = clinicAgent({
  pkg, prefix: 'referrals', title: 'Fairclinic Referral Tracking',
  description: pkg.description,
  args, required: ['outgoing'], statuses: STATUSES,
  configSchemas: { referral_settings: SETTINGS_SCHEMA },
  sources: { outgoing: { label: 'Referrals sent', args: ['outgoing'], fields: OUT_FIELDS }, incoming: { label: 'Referrals received', args: ['incoming'], fields: IN_FIELDS } },
  run, summary,
  check: { title: 'Track referrals', description: 'Every referral out (report back or not) and in (seen, thanked), with a status: no_report, no_first_visit, thank_you_not_sent, waiting or ok; new patients and production by source; reports back by specialist.' },
  report: {
    title: T9('Referral follow-up', 'Nachverfolgung von Überweisungen', 'Suivi des adressages', 'Seguimiento de derivaciones', 'Acompanhamento de encaminhamentos', 'Controllo degli invii', '紹介のフォロー', '转诊跟进', '의뢰 후속 조치'),
    base: 'referrals-follow-up',
    rows: (o) => o.items.filter((i) => !['ok', 'waiting'].includes(i.status)).map((i) => ({ status: i.status, direction: i.direction, date: i.date, patient_name: i.patient_name, party: i.party, specialty: i.specialty, first_visit: i.first_visit, reason: i.detail })),
    htmlColumns: ['status', 'direction', 'date', 'party', 'reason'],
    sections: (o) => [{ title: sectionTitle('by_source'), rows: o.by_source, columns: ['source', 'referrals', 'seen', 'production'] }],
    limits: [CLINIC_LIMITS.files, 'Referral reasons and clinical details are not read; only dates, names of practices and whether a report came back.', CLINIC_LIMITS.phi, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.message(), { name: 'records_send', category: 'binding_send', description: 'Never sends records or letters to another practice.' }, REFUSE.clinical()],
  prompt: {
    title: 'Track referrals', description: 'Walks the host model through referral follow-up.',
    text: 'You are helping a clinic front office with fairclinic-referral-tracking. Rules: it never sends letters or records and never reads clinical details; patient names are pseudonyms. 1. Call referrals_check (with referrals received if you have them). Lead with referrals out with no report back, then referrals in never seen, then referring doctors not thanked. 2. Call referrals_write_report.',
  },
});
