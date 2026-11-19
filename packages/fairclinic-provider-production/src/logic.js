// Fairclinic Provider Production: production, adjustments and collections per provider and month.
import { fld, str, num, round2, isoDate, pct, tally } from 'fairclinic-core';

export const PRODUCTION_FIELDS = Object.freeze({
  provider: fld(['Provider', 'Provider Name', 'Doctor', 'Dentist', 'Hygienist', 'Prov'], { required: true, translate: 'provider' }),
  month: fld(['Month', 'Period', 'Date', 'Month Ending'], { required: true, translate: false }),
  gross_production: fld(['Gross Production', 'Production', 'Gross Prod', 'Charges'], { type: 'money', required: true, translate: false }),
  adjustments: fld(['Adjustments', 'Write-offs', 'Adj', 'PPO Write-offs'], { type: 'money', translate: false }),
  collections: fld(['Collections', 'Total Collections', 'Payments', 'Collected', 'Receipts'], { type: 'money', required: true, translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    collection_target_pct: { type: 'number', minimum: 50, maximum: 110, description: 'Collections as a percent of net production below this are flagged (default 98)' },
    adjustment_max_pct: { type: 'number', minimum: 1, maximum: 90, description: 'Adjustments above this percent of gross production are flagged (default 35)' },
    drop_pct: { type: 'number', minimum: 5, maximum: 90, description: 'A month this far below the provider\'s other months is flagged (default 25)' },
  },
});

export const STATUSES = ['missing_month', 'production_drop', 'low_collections', 'high_adjustments', 'ok'];
const monthOf = (v) => {
  const s = str(v); if (/^\d{4}-\d{2}$/.test(s)) return s;
  const my = /^(\d{1,2})[/.-](\d{4})$/.exec(s); if (my && Number(my[1]) >= 1 && Number(my[1]) <= 12) return `${my[2]}-${my[1].padStart(2, '0')}`;
  const ym = /^(\d{4})[/.](\d{1,2})$/.exec(s); if (ym && Number(ym[2]) >= 1 && Number(ym[2]) <= 12) return `${ym[1]}-${ym[2].padStart(2, '0')}`;
  const d = isoDate(s); return d ? d.slice(0, 7) : null;
};
const nextMonth = (m) => { const y = Number(m.slice(0, 4)), mo = Number(m.slice(5, 7)); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`; };

export function checkProduction(rows, { settings = {} } = {}) {
  const target = settings.collection_target_pct || 98, adjMax = settings.adjustment_max_pct || 35, drop = settings.drop_pct || 25;
  const cells = new Map();
  for (const r of rows) {
    const p = str(r.provider), m = monthOf(r.month); if (!p || !m) continue;
    const k = `${p}|${m}`; const x = cells.get(k) || { provider: p, month: m, gross_production: 0, adjustments: 0, collections: 0 };
    x.gross_production = round2(x.gross_production + (num(r.gross_production) || 0)); x.adjustments = round2(x.adjustments + Math.abs(num(r.adjustments) || 0)); x.collections = round2(x.collections + (num(r.collections) || 0));
    cells.set(k, x);
  }
  const months = [...new Set([...cells.values()].map((c) => c.month))].sort();
  const allMonths = []; if (months.length) for (let m = months[0]; m <= months.at(-1); m = nextMonth(m)) allMonths.push(m);
  const providers = [...new Set([...cells.values()].map((c) => c.provider))].sort();
  const items = [];
  for (const p of providers) {
    const mine = [...cells.values()].filter((c) => c.provider === p);
    const first = mine.map((c) => c.month).sort()[0], last = mine.map((c) => c.month).sort().at(-1);
    for (const m of allMonths.filter((x) => x >= first && x <= last)) {
      const c = cells.get(`${p}|${m}`);
      if (!c) { items.push({ provider: p, month: m, gross_production: null, adjustments: null, net_production: null, collections: null, collection_pct: null, adjustment_pct: null, status: 'missing_month', findings: [{ code: 'missing_month', detail: `No row for ${p} in ${m}, between months that have one. Check the export's date range or provider filter.` }] }); continue; }
      const net = round2(c.gross_production - c.adjustments); const coll = net ? pct(c.collections, net) : null; const adj = c.gross_production ? pct(c.adjustments, c.gross_production) : null;
      const others = mine.filter((o) => o.month !== m); const avg = others.length ? others.reduce((s, o) => s + o.gross_production, 0) / others.length : null;
      const f = []; const add = (code, detail) => f.push({ code, detail });
      if (avg && c.gross_production < avg * (1 - drop / 100)) add('production_drop', `Gross production ${c.gross_production} is ${round2(100 - (c.gross_production / avg) * 100)}% below this provider's other months (average ${round2(avg)}).`);
      if (coll !== null && coll < target) add('low_collections', `Collections are ${coll}% of net production (${c.collections} of ${net}); your target is ${target}%.`);
      if (adj !== null && adj > adjMax) add('high_adjustments', `Adjustments are ${adj}% of gross production (${c.adjustments} of ${c.gross_production}); your limit is ${adjMax}%.`);
      items.push({ provider: p, month: m, gross_production: c.gross_production, adjustments: c.adjustments, net_production: net, collections: c.collections, collection_pct: coll, adjustment_pct: adj, status: STATUSES.find((s) => f.some((x) => x.code === s)) || 'ok', findings: f });
    }
  }
  const real = items.filter((i) => i.status !== 'missing_month');
  const by_provider = providers.map((p) => { const xs = real.filter((i) => i.provider === p); const g = round2(xs.reduce((s, i) => s + i.gross_production, 0)), a = round2(xs.reduce((s, i) => s + i.adjustments, 0)), c = round2(xs.reduce((s, i) => s + i.collections, 0)); return { provider: p, months: xs.length, gross_production: g, adjustments: a, net_production: round2(g - a), collections: c, collection_pct: g - a ? pct(c, g - a) : null }; });
  const g = round2(real.reduce((s, i) => s + i.gross_production, 0)), a = round2(real.reduce((s, i) => s + i.adjustments, 0)), c = round2(real.reduce((s, i) => s + i.collections, 0));
  return { providers: providers.length, months: allMonths.length, gross_production: g, adjustments: a, net_production: round2(g - a), collections: c, collection_pct: g - a ? pct(c, g - a) : null, to_review: items.filter((i) => i.status !== 'ok').length, by_status: tally(items, 'status'), by_provider, items };
}
