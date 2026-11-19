// Fairclinic Credential Expiry: licences, DEA registrations, permits and insurance that expire, and CE hours short of what renewal needs.
import { fld, str, num, isoDate, daysBetween, maskValue, tally } from 'fairclinic-core';

export const CREDENTIAL_FIELDS = Object.freeze({
  holder: fld(['Holder', 'Person', 'Provider', 'Name', 'Staff', 'Entity', 'Last Name', 'Surname'], { required: true, translate: false }),
  holder_first: fld(['First Name', 'Given Name'], { translate: false }),
  role: fld(['Role', 'Position', 'Title'], { translate: 'role' }),
  credential: fld(['Credential', 'Type', 'License Type', 'Credential Type', 'Document', 'Item'], { required: true, translate: false }),
  credential_number: fld(['Number', 'License #', 'Registration #', 'Policy #', 'Credential Number'], { translate: false }),
  issuer: fld(['Issuer', 'Board', 'Agency', 'State', 'Carrier'], { translate: 'issuer' }),
  expires: fld(['Expires', 'Expiration Date', 'Expiry', 'Valid Until', 'Renewal Date'], { type: 'date', translate: 'expires' }),
  renewal_submitted: fld(['Renewal Submitted', 'Renewal Sent', 'Applied'], { type: 'date', translate: false }),
  ce_required: fld(['CE Required', 'CE Hours Required', 'Required Hours'], { type: 'number', translate: false }),
  ce_done: fld(['CE Done', 'CE Hours', 'CE Completed', 'Hours Completed'], { type: 'number', translate: false }),
  // The status a licensing board shows (public credential files carry one); a practice list may not.
  board_status: fld(['Status', 'License Status', 'Credential Status', 'Board Status'], { translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    warn_days: { type: 'integer', minimum: 7, maximum: 365, description: 'Credentials expiring within this many days are listed (default 90)' },
    ce_warn_days: { type: 'integer', minimum: 30, maximum: 730, description: 'CE hours are checked when renewal is within this many days (default 180)' },
  },
});

export const STATUSES = ['not_active', 'expired', 'expiring', 'missing_expiry', 'ce_short', 'renewal_submitted', 'ok'];

const NOT_ACTIVE = /^(expired|closed|revoked|suspended|summary suspension|surrender(ed)?|voluntary surrender|terminated|denied|inactive|lapsed|retired|superseded|cancell?ed)$/i;

export function checkCredentials(rows, { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const warn = settings.warn_days || 90, ceWarn = settings.ce_warn_days || 180;
  const items = rows.filter((r) => str(r.holder) && str(r.credential)).map((r) => {
    const holder = [str(r.holder_first), str(r.holder)].filter(Boolean).join(' '); const board = str(r.board_status);
    const exp = isoDate(r.expires); const left = exp ? daysBetween(today, exp) : null; const sub = isoDate(r.renewal_submitted);
    const req = num(r.ce_required), done = num(r.ce_done);
    const f = []; const add = (code, detail) => f.push({ code, detail });
    // Found on the Washington State public credential file (19 Nov 2026): the board's status and the expiry date can disagree.
    if (NOT_ACTIVE.test(board)) add('not_active', `The board lists this credential as ${board}${exp ? ` (expiry date ${exp})` : ''}. Check the board's record before anyone works under it.`);
    else if (!exp) add('missing_expiry', 'No expiry date on file; add it from the certificate.');
    else if (left < 0) add('expired', `Expired on ${exp}, ${-left} day(s) ago.${/^active/i.test(board) ? ` The board still lists it as ${board}: the date in the file may not be updated yet; check the board's record.` : ''}`);
    else if (left <= warn) { if (sub && sub <= today) add('renewal_submitted', `Expires ${exp} (${left} days); renewal submitted ${sub}, waiting for the new certificate.`); else add('expiring', `Expires in ${left} day(s) (${exp}) and no renewal is recorded as submitted.`); }
    if (req !== null && left !== null && left >= 0 && left <= ceWarn && (done || 0) < req) add('ce_short', `${done || 0} of ${req} CE hours recorded with renewal in ${left} days.`);
    const status = STATUSES.find((s) => f.some((x) => x.code === s)) || 'ok';
    return { holder, role: str(r.role), credential: str(r.credential), number: str(r.credential_number) ? maskValue(str(r.credential_number), 4) : '', issuer: str(r.issuer), expires: exp, days_left: left, renewal_submitted: sub, ce_required: req, ce_done: done, board_status: board, status, findings: f };
  });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (a.days_left ?? 1e9) - (b.days_left ?? 1e9) || (a.holder < b.holder ? -1 : 1));
  const t = tally(items, 'status');
  return { as_of: today, credentials: items.length, holders: new Set(items.map((i) => i.holder)).size, to_act: items.filter((i) => !['ok', 'renewal_submitted'].includes(i.status)).length, next_expiry: items.filter((i) => i.days_left !== null && i.days_left >= 0).sort((a, b) => a.days_left - b.days_left).map((i) => i.expires)[0] || null, by_status: t, by_credential: Object.entries(tally(items, 'credential')).map(([credential, count]) => ({ credential, count })), items };
}
