// Builds a Fairclinic agent manifest from a short description, so every agent has the same
// shape: one check tool (read), optional extra read tools, one report tool, memory tools,
// an optional draft -> one-click pair, and refused tools listed so a host model can see them.
// Adapted from the Kestrel family's builder.
import { defineManifest } from './manifest.js';
import { MODEL_PIN, refusedTools, reportTool, draftPair, page } from './kit.js';
import { memoryTools } from './memory.js';
import { LANGS } from './lang.js';

const memoryToolsOrEmpty = (prefix, kinds) => memoryTools(prefix, kinds);

/** Limits sentences every clinic report can cite. */
export const CLINIC_LIMITS = Object.freeze({
  files: 'Reads only the files you export and give it. It does not log in to the practice-management system, a payer or pet-insurer portal, a payment processor, a bank, a lab or a supplier.',
  rules: 'Thresholds (days, percentages, targets) are settings you can change; the defaults are starting points, not anyone\'s policy or a standard of care.',
  advice: 'Not clinical, legal, tax, coding or compliance advice. It does not diagnose, recommend treatment or decide whether a rule is met. A person decides what to bill, pay, send, file or correct.',
  arithmetic: 'Totals, rates and variances are arithmetic on the numbers in your files, not forecasts.',
  phi: 'Results returned to the AI model have patient, pet and client names, account numbers, birth dates and contact details masked. The files written here keep the real values for your team: keep them in a secure folder.',
  baa: 'Dental files are protected health information: sign a business associate agreement with whoever sets this up before any file is held, and keep the output folder access-controlled.',
});

const LIMIT_ARG = { type: 'integer', minimum: 1, maximum: 5000, description: 'Most items to return to the model (the report file always has all of them)' };

/** A title in the nine report languages, in the order en, de, fr, es, pt, it, ja, zh, ko. */
export const T9 = (...v) => {
  if (v.length !== LANGS.length) throw new Error(`T9 needs ${LANGS.length} texts, got ${v.length}: ${v[0]}`);
  return Object.fromEntries(LANGS.map((l, i) => [l, v[i]]));
};

/** A column definition: aliases plus options (type, required, translate). */
export const fld = (aliases, extra = {}) => ({ aliases, ...extra });

/** Standard argument shapes. */
export const fileArg = (description) => ({ type: 'string', description });
export const AS_OF_ARG = { type: 'string', format: 'date', description: 'Date to measure ages and deadlines from (YYYY-MM-DD); default today' };
export const MONTH_ARG = { type: 'string', pattern: '^\\d{4}-\\d{2}$', description: 'Month to look at, YYYY-MM' };

/**
 * cfg: {
 *   pkg, prefix, title, description,
 *   args: { name: schema }            file and option arguments shared by check and report
 *   required: [names],
 *   sources: { key: { label, args: [argName], fields, profiles } },
 *   configSchemas, memoryKinds,
 *   run(a, ctx) -> out                reads files through ctx, returns { items, ... }
 *   summary(out) -> string,
 *   statuses: [values]                statuses an item can have (for the status filter)
 *   check: { title, description },
 *   reads: [{ name, title, description, properties, required, run(a, ctx) -> { summary, ... } }],
 *   report: { title (T9), base, rows(out), htmlColumns, sections(out), limits },
 *   drafts: draftPair cfg (optional),
 *   refused: [{ name, category, description }],
 *   prompt: { title, description, text, arguments }
 * }
 */
export function clinicAgent(cfg) {
  const { pkg, prefix } = cfg;
  const out = `fairclinic-out/${prefix}`;
  const MEMORY = memoryToolsOrEmpty(prefix, cfg.memoryKinds || {});
  const refused = refusedTools(cfg.refused || []);
  const drafts = cfg.drafts ? draftPair({ prefix, outDir: out, actor: 'one named person on your team', ...cfg.drafts }) : { tools: [], rules: [] };
  const checkName = `${prefix}_check`;
  const statusArg = cfg.statuses ? { type: 'string', enum: cfg.statuses, description: 'Only items with this status' } : { type: 'string', description: 'Only items with this status' };
  if (!cfg.report.title || typeof cfg.report.title !== 'object' || !cfg.report.title.ko) throw new Error(`${pkg.name}: report.title must be a T9 object`);
  const tools = [
    {
      name: checkName, kind: 'read', title: cfg.check.title, description: cfg.check.description,
      inputSchema: { type: 'object', additionalProperties: false, required: cfg.required || [], properties: { ...cfg.args, status: statusArg, limit: LIMIT_ARG } },
      handler: async (a, ctx) => {
        const o = await cfg.run(a, ctx);
        const items = a.status ? (o.items || []).filter((i) => i.status === a.status) : (o.items || []);
        const { items: _drop, ...rest } = o;
        return { summary: cfg.summary(o), ...rest, ...page(items, a.limit || 200) };
      },
    },
    ...(cfg.reads || []).map((r) => ({
      name: r.name, kind: 'read', title: r.title, description: r.description,
      inputSchema: { type: 'object', additionalProperties: false, required: r.required || [], properties: r.properties },
      handler: async (a, ctx) => r.run(a, ctx),
    })),
    reportTool({
      name: `${prefix}_write_report`, title: cfg.report.title.en, outDir: out, base: cfg.report.base,
      description: cfg.report.description || `Write ${cfg.report.base}.csv (one row per item, with blank owner and decision columns for your team) and ${cfg.report.base}.html into out_dir (default ${out}). The files keep real names; only the result the model sees is masked.`,
      properties: cfg.args, required: cfg.required || [],
      build: async (a, ctx) => {
        const o = await cfg.run(a, ctx);
        const rows = cfg.report.rows(o).map((r) => ({ ...r, owner: '', decision: '' }));
        return {
          title: cfg.report.title, intro: cfg.summary(o), rows, summary: `${cfg.report.title.en} written: ${cfg.summary(o)}`,
          columns: rows.length ? Object.keys(rows[0]) : [...(cfg.report.htmlColumns || ['status']), 'owner', 'decision'],
          htmlColumns: cfg.report.htmlColumns, sections: cfg.report.sections ? cfg.report.sections(o) : [],
          limits: cfg.report.limits || [CLINIC_LIMITS.files, CLINIC_LIMITS.rules, CLINIC_LIMITS.advice],
        };
      },
    }),
    ...drafts.tools,
    ...MEMORY.tools,
    ...refused.tools,
  ];
  return defineManifest({
    name: pkg.name, version: pkg.version, description: cfg.description, model: MODEL_PIN,
    caps: { maxSteps: 60, maxSpendUsd: 0 },
    configSchemas: cfg.configSchemas || {},
    ...(cfg.memoryKinds && Object.keys(cfg.memoryKinds).length ? { memory: { prefix, kinds: cfg.memoryKinds } } : { memory: { prefix, kinds: {} } }),
    sources: cfg.sources || {},
    argDocs: cfg.argDocs || {},
    prompts: cfg.prompt ? [{ name: `${prefix}_review`, arguments: [], ...cfg.prompt }] : [],
    tools,
    policy: { rules: [
      { tool: checkName, decision: 'allow' },
      ...(cfg.reads || []).map((r) => ({ tool: r.name, decision: 'allow' })),
      { tool: `${prefix}_write_report`, decision: 'allow' },
      ...drafts.rules,
      ...MEMORY.rules,
      ...refused.rules,
      { tool: '*', decision: 'block', reason: `Not on the ${cfg.title} allowlist.` },
    ] },
  });
}

/** Refused tools most clinic agents list, so a host model sees the line. */
export const REFUSE = Object.freeze({
  pms_write: (what = 'the practice-management system') => ({ name: 'pms_update', category: 'binding_send', description: `Never changes ${what}; a person makes any correction there.` }),
  insurer_submit: (who = 'an insurer') => ({ name: 'claim_submit', category: 'binding_send', description: `Never bills or files with ${who}; a person does, after review.` }),
  refund: () => ({ name: 'refund_issue', category: 'move_money', description: 'Never refunds, credits or pays anyone.' }),
  pay: () => ({ name: 'payment_send', category: 'move_money', description: 'Never pays an invoice, a person or a supplier.' }),
  message: () => ({ name: 'message_send', category: 'binding_send', description: 'Never sends a text, e-mail, letter or post; drafts wait for one named person.' }),
  clinical: () => ({ name: 'clinical_advice', category: 'binding_send', description: 'Never diagnoses, recommends treatment or tells a patient or client what care to have.' }),
  file_report: (what = 'a regulator') => ({ name: 'regulator_file', category: 'binding_send', description: `Never files or reports anything to ${what}.` }),
});

/**
 * A standard demo: run the check, print one line per item that needs a person, write the
 * report, optionally draft, and show a refused tool being blocked.
 * opts: { intro, args, line(item) -> string, skip(item) -> bool, draft: { tool, args }, refused }
 */
export async function clinicDemo(manifest, fixturesDir, { intro, args, line, skip = (i) => i.status === 'ok', draft = null, refused = null }) {
  const { demoRuntime, printStep } = await import('./demo.js');
  const prefix = manifest.tools[0].name.split('_')[0];
  const rt = demoRuntime(manifest, fixturesDir);
  process.stdout.write(`${intro} in ${rt.root}\n`);
  const r = await rt.call(`${prefix}_check`, args);
  printStep('Check the files', r);
  for (const i of ((r.result && r.result.items) || []).filter((x) => !skip(x))) process.stdout.write(`    ${line(i)}\n`);
  printStep('Write the worklist for the team', await rt.call(`${prefix}_write_report`, args));
  if (draft) printStep('Draft (waits for a yes; sending stays with one named person)', await rt.call(draft.tool, { ...args, ...draft.args }));
  const ref = refused || manifest.tools.filter((t) => t.description.startsWith('Listed so agents can see it is refused.'))[0].name;
  printStep(`Agent tries ${ref.replace(/_/g, ' ')} itself`, await rt.call(ref, {}));
}
