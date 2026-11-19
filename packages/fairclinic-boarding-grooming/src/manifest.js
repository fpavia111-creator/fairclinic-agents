import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, sectionTitle, exportProfile } from 'fairclinic-core';
import { RESERVATION_FIELDS, INVOICE_FIELDS, SETTINGS_SCHEMA, STATUSES, checkBoarding } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  reservations: fileArg('Boarding, daycare and grooming reservations under --root (practice system or boarding software export): reservation, client, pet, service, check in, check out, add-ons, status'),
  invoices: fileArg('Invoice lines under --root (Shepherd, ezyVet, AVImark, Cornerstone or Covetrus Pulse invoice item export) with the reservation on each line'),
  settings: fileArg('Optional settings JSON: prices (list price per item or service) to value what was not invoiced'),
};
const run = (a, ctx) => checkBoarding(ctx.records(a.reservations, 'reservations'), ctx.records(a.invoices, 'invoices'), { settings: a.settings ? ctx.readJson(a.settings, 'boarding_settings') : {} });
const summary = (o) => `${o.reservations} reservation(s), ${o.cancelled} cancelled. ${o.to_review} to review: ${o.by_finding.not_invoiced || 0} with no invoice, ${o.by_finding.nights_short || 0} with fewer nights or days invoiced than stayed, ${o.by_finding.addon_not_invoiced || 0} add-on(s) not invoiced. About ${o.missed_value} not charged at list price.`;

export const manifest = clinicAgent({
  pkg, prefix: 'boarding', title: 'Fairclinic Boarding and Grooming',
  description: pkg.description,
  args, required: ['reservations', 'invoices'], statuses: STATUSES,
  configSchemas: { boarding_settings: SETTINGS_SCHEMA },
  sources: { reservations: { label: 'Reservations', args: ['reservations'], fields: RESERVATION_FIELDS }, invoices: { label: 'Invoice lines', args: ['invoices'], fields: INVOICE_FIELDS, profiles: [exportProfile('shepherd_invoices', { invoice_number: 'Invoice Number', reservation_id: 'Reservation', patient_name: 'Patient', item: 'Item', qty: 'Qty', amount: 'Amount' })] } },
  run, summary,
  check: { title: 'Check boarding and grooming invoices', description: 'Every reservation with the nights or days stayed against the units invoiced and every add-on against the invoice, with a status: not_invoiced, nights_short, addon_not_invoiced, ok or cancelled, valued at your list prices.' },
  report: {
    title: T9('Boarding and grooming invoices', 'Rechnungen für Pension und Pflege', 'Factures de pension et de toilettage', 'Facturas de hospedaje y peluquería', 'Faturas de hospedagem e banho e tosa', 'Fatture di pensione e toelettatura', 'ペットホテルとトリミングの請求', '寄养与美容账单', '호텔링과 미용 청구'),
    base: 'boarding-invoices',
    rows: (o) => o.items.filter((i) => !['ok', 'cancelled'].includes(i.status)).map((i) => ({ status: i.status, reservation_id: i.reservation_id, client_name: i.client_name, patient_name: i.patient_name, service: i.service, check_in: i.check_in, check_out: i.check_out, expected_units: i.expected_units, invoiced_units: i.invoiced_units, missed_value: i.missed_value, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'reservation_id', 'service', 'check_in', 'check_out', 'expected_units', 'invoiced_units', 'missed_value', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'Boarding is counted in nights (check out minus check in) and daycare in days; if you charge boarding by day, read the units that way. Values use the prices in your settings.', CLINIC_LIMITS.phi, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.pms_write('invoices or reservations'), { name: 'client_charge', category: 'move_money', description: 'Never charges a client or a card.' }],
  prompt: {
    title: 'Check boarding and grooming', description: 'Walks the host model through boarding and grooming invoices.',
    text: 'You are helping a veterinary or boarding front desk with fairclinic-boarding-grooming. Rules: it never changes an invoice or charges a client; pet and client names are pseudonyms. 1. Call boarding_check with your price list. Lead with stays that have no invoice, then nights short, then add-ons. 2. Call boarding_write_report.',
  },
});
