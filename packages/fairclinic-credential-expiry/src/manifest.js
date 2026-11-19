import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, sectionTitle, exportProfile } from 'fairclinic-core';
import { CREDENTIAL_FIELDS, SETTINGS_SCHEMA, STATUSES, checkCredentials } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  credentials: fileArg('Credential list under --root (a spreadsheet or HR/credentialing export): holder, role, credential (state licence, DEA registration, state controlled substance permit, malpractice insurance, radiation registration), number, issuer, expiry, renewal submitted, CE required and done'),
  settings: fileArg('Optional settings JSON: warn_days, ce_warn_days'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkCredentials(ctx.records(a.credentials, 'credentials'), { settings: a.settings ? ctx.readJson(a.settings, 'credential_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.credentials} credential(s) for ${o.holders} holder(s); next expiry ${o.next_expiry || 'none'}. ${o.to_act} to act on: ${o.by_status.not_active ? `${o.by_status.not_active} not active at the board, ` : ''}${o.by_status.expired || 0} expired, ${o.by_status.expiring || 0} expiring with no renewal submitted, ${o.by_status.missing_expiry || 0} with no expiry date, ${o.by_status.ce_short || 0} short of CE hours; ${o.by_status.renewal_submitted || 0} renewal(s) waiting.`;

export const manifest = clinicAgent({
  pkg, prefix: 'credentials', title: 'Fairclinic Credential Expiry',
  description: pkg.description,
  args, required: ['credentials'], statuses: STATUSES,
  configSchemas: { credential_settings: SETTINGS_SCHEMA },
  sources: { credentials: { label: 'Credentials', args: ['credentials'], fields: CREDENTIAL_FIELDS, profiles: [exportProfile('wa_doh_credentials', { holder: 'lastname', holder_first: 'firstname', credential: 'credentialtype', credential_number: 'credentialnumber', expires: 'expirationdate', board_status: 'status' })] } },
  run, summary,
  check: { title: 'Check credential expiries', description: 'Every licence, registration, permit and policy with days to expiry, renewal and CE hours, and a status: not_active (the status column of a licensing board file says expired, revoked, suspended and the like), expired, expiring, missing_expiry, ce_short, renewal_submitted or ok. Numbers show their last four characters only.' },
  report: {
    title: T9('Credential expiries', 'Ablaufende Zulassungen und Nachweise', 'Échéances des titres et autorisations', 'Vencimientos de licencias y credenciales', 'Vencimentos de licenças e registros', 'Scadenze di abilitazioni e registrazioni', '資格・登録の期限', '执照与资质到期', '자격·면허 만료'),
    base: 'credentials-expiry',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, holder: i.holder, role: i.role, credential: i.credential, number: i.number, issuer: i.issuer, expires: i.expires, days_left: i.days_left, renewal_submitted: i.renewal_submitted, ce_required: i.ce_required, ce_done: i.ce_done, board_status: i.board_status, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'holder', 'credential', 'expires', 'days_left', 'renewal_submitted', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_credential'), rows: o.by_credential, columns: ['credential', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'Expiry dates and CE requirements are the ones in your list. Boards, the DEA and insurers set the real rules; check each renewal notice.', 'It never files a renewal or contacts a board, the DEA or an insurer.', CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.file_report('a licensing board, the DEA or an insurer'), REFUSE.pay(), REFUSE.message()],
  prompt: {
    title: 'Check credential expiries', description: 'Walks the host model through credential expiries.',
    text: 'You are helping a clinic manager with fairclinic-credential-expiry. Rules: it never files a renewal, never pays a fee and never contacts a board, the DEA or an insurer. 1. Call credentials_check. Lead with anything expired, then expiring with no renewal submitted (DEA registrations and licences first), then missing expiry dates and CE hours. 2. Call credentials_write_report for the person who files renewals.',
  },
});
