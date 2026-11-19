// Fairclinic Sterilization Logs: gaps and open items in the sterilizer cycle log and the spore test log.
// It points at what the log does not show; it never decides whether any rule or standard is met.
import { fld, str, num, isoDate, daysBetween, tally } from 'fairclinic-core';

export const CYCLE_FIELDS = Object.freeze({
  date: fld(['Date', 'Cycle Date', 'Run Date'], { type: 'date', required: true }),
  sterilizer: fld(['Sterilizer', 'Autoclave', 'Unit', 'Device'], { required: true, translate: false }),
  cycle_number: fld(['Cycle', 'Cycle #', 'Cycle Number', 'Load #', 'Load'], { translate: false }),
  result: fld(['Result', 'Pass/Fail', 'Outcome', 'Indicator'], { translate: false }),
  initials: fld(['Initials', 'Operator', 'Staff', 'Run By'], { translate: false }),
});
export const SPORE_FIELDS = Object.freeze({
  date: fld(['Date', 'Test Date', 'Date Run'], { type: 'date', required: true }),
  sterilizer: fld(['Sterilizer', 'Autoclave', 'Unit', 'Device'], { required: true, translate: false }),
  result: fld(['Result', 'Outcome', 'Spore Result'], { translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    spore_interval_days: { type: 'integer', minimum: 1, maximum: 60, description: 'Your own interval between spore tests for a sterilizer in use (default 7)' },
    retest_days: { type: 'integer', minimum: 0, maximum: 14, description: 'Days to log a retest after a positive spore test (default 2)' },
  },
});

export const STATUSES = ['positive_no_followup', 'failed_no_rerun', 'spore_gap', 'cycle_number_gap', 'missing_entry', 'ok'];
const PASS = /^(p|pass|passed|ok|accept|accepted|good|neg|negative|-)$/i;
const FAIL = /^(f|fail|failed|reject|rejected|bad|pos|positive|\+)$/i;

export function checkSterilization(cycles, spores = [], { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const interval = settings.spore_interval_days || 7, retest = settings.retest_days ?? 2;
  const items = [];
  const add = (status, sterilizer, date, detail, ref = '') => items.push({ status, sterilizer, date, ref, detail });
  const rows = cycles.map((c) => ({ date: isoDate(c.date), sterilizer: str(c.sterilizer), cycle: str(c.cycle_number), n: num(c.cycle_number), result: str(c.result), initials: str(c.initials) })).filter((c) => c.date && c.sterilizer);
  const units = [...new Set([...rows.map((c) => c.sterilizer), ...spores.map((s) => str(s.sterilizer)).filter(Boolean)])].sort();
  const summary = [];
  for (const u of units) {
    const mine = rows.filter((c) => c.sterilizer === u).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.n ?? 0) - (b.n ?? 0)));
    for (const c of mine) {
      const missing = [!c.cycle && 'cycle number', !c.result && 'result', !c.initials && 'initials'].filter(Boolean);
      if (missing.length) add('missing_entry', u, c.date, `Cycle ${c.cycle || '(no number)'} on ${c.date} has no ${missing.join(', ')} in the log.`, c.cycle);
      if (FAIL.test(c.result) && !mine.some((x) => x.date === c.date && (x.n ?? -1) > (c.n ?? -1) && PASS.test(x.result))) add('failed_no_rerun', u, c.date, `Cycle ${c.cycle} on ${c.date} failed and no passing cycle follows it that day in the log. Check what happened to that load.`, c.cycle);
    }
    const nums = mine.filter((c) => c.n !== null);
    for (let i = 1; i < nums.length; i++) if (nums[i].n > nums[i - 1].n + 1) add('cycle_number_gap', u, nums[i].date, `Cycle numbers jump from ${nums[i - 1].n} to ${nums[i].n}: ${nums[i].n - nums[i - 1].n - 1} cycle(s) not in the log.`, `${nums[i - 1].n}-${nums[i].n}`);
    const tests = spores.filter((s) => str(s.sterilizer) === u && isoDate(s.date)).map((s) => ({ date: isoDate(s.date), result: str(s.result) })).sort((a, b) => (a.date < b.date ? -1 : 1));
    for (let i = 1; i < tests.length; i++) {
      const gap = daysBetween(tests[i - 1].date, tests[i].date);
      const used = mine.some((c) => c.date > tests[i - 1].date && c.date < tests[i].date);
      if (gap > interval && used) add('spore_gap', u, tests[i].date, `${gap} days between spore tests (${tests[i - 1].date} to ${tests[i].date}) while the sterilizer was in use; your interval is ${interval} days.`);
    }
    const lastTest = tests.at(-1); const lastUse = mine.at(-1);
    if (lastUse && (!lastTest || daysBetween(lastTest.date, lastUse.date) > interval)) add('spore_gap', u, lastUse.date, lastTest ? `Last spore test ${lastTest.date}; the sterilizer was used on ${lastUse.date}, ${daysBetween(lastTest.date, lastUse.date)} days later.` : 'Used, with no spore test in the log.');
    for (const t of tests.filter((x) => FAIL.test(x.result))) {
      const after = tests.find((x) => x.date > t.date && PASS.test(x.result));
      if (!after && daysBetween(t.date, today) > retest) add('positive_no_followup', u, t.date, `Positive spore test on ${t.date} with no negative retest in the log since (${daysBetween(t.date, today)} days).`);
    }
    summary.push({ sterilizer: u, cycles: mine.length, failed_cycles: mine.filter((c) => FAIL.test(c.result)).length, spore_tests: tests.length, positive_tests: tests.filter((x) => FAIL.test(x.result)).length, last_spore_test: lastTest ? lastTest.date : null, open_items: items.filter((i) => i.sterilizer === u).length });
  }
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (a.sterilizer < b.sterilizer ? -1 : a.sterilizer > b.sterilizer ? 1 : a.date < b.date ? -1 : 1));
  return { as_of: today, sterilizers: units.length, cycles: rows.length, spore_tests: spores.length, open_items: items.length, by_status: tally(items, 'status'), by_sterilizer: summary, items };
}
