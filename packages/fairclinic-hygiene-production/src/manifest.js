import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, sectionTitle } from 'fairclinic-core';
import { HOURS_FIELDS, PROCEDURE_FIELDS, SETTINGS_SCHEMA, STATUSES, checkHygiene } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  hours: fileArg('Hygiene schedule hours under --root (schedule or timeclock export): hygienist, date, scheduled hours, open (unfilled) hours'),
  procedures: fileArg('Hygiene procedures under --root (practice-management production by provider and code): hygienist, date, code, quantity, fee'),
  settings: fileArg('Optional settings JSON: target_per_hour, open_time_pct, perio_codes, prophy_codes'),
};
const run = (a, ctx) => checkHygiene(ctx.records(a.hours, 'hours'), ctx.records(a.procedures, 'procedures'), { settings: a.settings ? ctx.readJson(a.settings, 'hygiene_settings') : {} });
const summary = (o) => `${o.hygienists} hygienist(s): ${o.production} produced, ${o.production_per_hour} per worked hour over ${o.worked_hours} hours, ${o.open_hours} hours unfilled. ${o.to_review} to review: ${o.by_status.no_hours || 0} with production on days missing from the hours file, ${o.by_status.below_target || 0} below the hourly target, ${o.by_status.open_time || 0} with too much open time.`;

export const manifest = clinicAgent({
  pkg, prefix: 'hygiene', title: 'Fairclinic Hygiene Production',
  description: pkg.description,
  args, required: ['hours', 'procedures'], statuses: STATUSES,
  configSchemas: { hygiene_settings: SETTINGS_SCHEMA },
  sources: { hours: { label: 'Hygiene hours', args: ['hours'], fields: HOURS_FIELDS }, procedures: { label: 'Hygiene procedures', args: ['procedures'], fields: PROCEDURE_FIELDS } },
  run, summary,
  check: { title: 'Review hygiene production', description: 'Per hygienist: days, scheduled, open and worked hours, production, production per worked hour, open time percent and the share of periodontal visits among cleanings, with a status: no_hours, below_target, open_time or ok.' },
  report: {
    title: T9('Hygiene production per hour', 'Prophylaxe-Umsatz pro Stunde', 'Production d’hygiène par heure', 'Producción de higiene por hora', 'Produção de higiene por hora', 'Produzione di igiene per ora', '歯科衛生士の時間当たり売上', '洁牙每小时产值', '치위생 시간당 매출'),
    base: 'hygiene-production',
    rows: (o) => o.items.map((i) => ({ status: i.status, hygienist: i.hygienist, days: i.days, scheduled_hours: i.scheduled_hours, open_hours: i.open_hours, worked_hours: i.worked_hours, production: i.production, production_per_hour: i.production_per_hour, open_pct: i.open_pct, perio_share_pct: i.perio_share_pct, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'hygienist', 'worked_hours', 'production', 'production_per_hour', 'open_pct', 'perio_share_pct', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'The periodontal share is a count of codes, not a view on whether any patient needed periodontal care; that is the clinician\'s decision.', CLINIC_LIMITS.rules, 'Not a pay calculation or a judgment of anyone\'s clinical work.', CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.pms_write('the schedule'), { name: 'payroll_change', category: 'binding_send', description: 'Never changes pay or hours.' }, REFUSE.clinical()],
  prompt: {
    title: 'Review hygiene production', description: 'Walks the host model through hygiene production.',
    text: 'You are helping a dental office manager with fairclinic-hygiene-production. Rules: it changes nothing, is not a pay calculation, and the periodontal share is a code count, never a view on patient care. 1. Call hygiene_check. Lead with production on days missing from the hours file (the hourly figure is incomplete), then hourly production below target and open time. 2. Call hygiene_write_report.',
  },
});
