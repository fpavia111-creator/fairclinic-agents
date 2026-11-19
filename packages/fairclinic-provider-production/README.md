# Fairclinic Provider Production (`fairclinic-provider-production`)

Fairclinic Provider Production: dental production, adjustments and collections per provider and month: net production, collections as a percent of net, adjustments as a percent of gross, months well below a provider's others, and months missing from the export. Not a pay calculation or a judgment of anyone's clinical work.

**Never changes production or provider records; a person makes any correction there. Never changes pay, bonuses or provider compensation.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-provider-production demo
npx -y fairclinic-provider-production mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-provider-production demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Provider Production demo (fictional dental practice, July to October 2026) in C:\Users\fpavi\AppData\Local\Temp\fairclinic-provider-production-demo-NOv8Y3

▶ Check the files
  status: executed  decision: allow
  4 provider(s) over 4 month(s): gross 514300, adjustments 135300, net 379000, collected 371300 (97.97% of net). 4 provider-month(s) to review: 1 drop(s), 1 low collection month(s), 1 with high adjustments, 1 missing month(s).
    low_collections   Dr. Ben Sample   2026-08  gross    47500  collected  87.89%
    high_adjustments  Dr. Ben Sample   2026-09  gross    46900  collected  99.29%
    production_drop   Dr. Ben Sample   2026-10  gross    31000  collected  99.14%
    missing_month     Hana Test RDH    2026-09  gross        -  collected      -%

▶ Write the worklist for the team
  status: executed  decision: allow
  Provider production and collections written: 4 provider(s) over 4 month(s): gross 514300, adjustments 135300, net 379000, collected 371300 (97.97% of net). 4 provider-month(s) to review: 1 drop(s), 1 low collection month(s), 1 with high adjustments, 1 missing month(s). Files: fairclinic-out/production/production-by-provider.csv, fairclinic-out/production/production-by-provider.html.

▶ Agent tries pms update itself
  status: blocked  decision: block
  reason: Never changes production or provider records; a person makes any correction there.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `production_check` | Every provider and month with gross production, adjustments, net production, collections, collection percent of net and adjustment percent of gross, and a status: missing_month, production_drop, low_collections, high_… | runs |
| `production_by_provider` | Per provider over the whole file: months, gross and net production, adjustments, collections and collection percent. | runs |
| `production_write_report` | Write production-by-provider.csv (one row per item, with blank owner and decision columns for your team) and production-by-provider.html into out_dir (default fairclinic-out/production). | runs |
| `production_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `production_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `production_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `production_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `pms_update` | Never changes production or provider records; a person makes any correction there. | refused |
| `payroll_change` | Never changes pay, bonuses or provider compensation. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Production and collections by provider (`production`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `provider` (required) | text | Provider, Provider Name, Doctor, Dentist, Hygienist, Prov | Leistungserbringer, Prestataire, 医師, 医生 |
| `month` (required) | text | Month, Period, Date, Month Ending | - |
| `gross_production` (required) | amount | Gross Production, Production, Gross Prod, Charges | - |
| `adjustments` | amount | Adjustments, Write-offs, Adj, PPO Write-offs | - |
| `collections` (required) | amount | Collections, Payments, Collected, Receipts | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Denticon | Production and collections by provider, exported to CSV | Provider, Gross Production, Adjustments, Collections | no |

Where a layout says "checked", its column names were compared with the publisher's template or documentation on that date (the CMS price-transparency templates, the pfs.data.cms.gov column lists and Open Dental's published procedure log fields). The NCCI, MUE and RVU file headers and the other practice-management and clearinghouse layouts were written from knowledge of the export and were not checked; where the vendor's public help says something about the export, the layout's note says what. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-provider-production inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-provider-production can remember facts about your setup so the next run does not have to be told again. `production_learn` only proposes a fact; it changes nothing until a named person accepts it with `production_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-provider-production memory list
fairclinic-provider-production memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-provider-production memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-provider-production demo
npx -y fairclinic-provider-production mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-provider-production": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-provider-production",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-provider-production -- npx -y fairclinic-provider-production mcp --root .`, or install the `fairclinic-provider-production` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-provider-production approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-provider-production approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-provider-production kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-provider-production tools                 # every tool, its policy and arguments
fairclinic-provider-production sources               # the columns each input is read from
fairclinic-provider-production inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-provider-production call production_check '{"production":"<production>"}'
fairclinic-provider-production eval                  # the private eval cases on the fictional fixtures
fairclinic-provider-production demo
```

## Patient data

Results go to an AI model, so patient identifiers are masked before they leave the agent (`--phi mask`, the default): names, member IDs, MRNs and account numbers become stable pseudonyms such as `PT-3f9a1c2e`; birth dates become the birth year; addresses, phones, e-mails and SSNs are removed, also inside free text. `--phi strict` also hides claim numbers, service days and ZIP codes. Tools still take a pseudonym back as an argument. Report files written to disk keep real names, because people work from them: keep them in a folder only your staff can open. `--phi off` is possible and is recorded in the audit log. The shared tests check that no fictional patient identifier from the fixtures reaches any eval result. This is a design for keeping PHI away from the model; it is not a HIPAA compliance determination: your business associate agreements, access controls and policies still apply.

## Audit log and data

Every call is written to `.fairclinic/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- It checks only what is in the files and settings you load. Thresholds and fee schedules are as current as what you give it; the defaults are starting points, not anyone's policy or a standard of care.
- It is not clinical, legal, tax, coding or compliance advice, and it never decides whether a rule is met. A person reviews every result before anything is billed, sent, filed, refunded or corrected; the agent does none of those.
- Export layouts named in "Columns it reads" were written from knowledge of each system and not tested against a live account; `inspect` shows how a file was read.
- Masking keeps names and contact details away from the model; it does not replace your privacy program. Dental files are protected health information: a business associate agreement is signed before any file is held.
