# Fairclinic Hygiene Production (`fairclinic-hygiene-production`)

Fairclinic Hygiene Production: dental hygiene production per worked hour for each hygienist, unfilled schedule time, the share of periodontal visits among cleanings, and production on days missing from the hours file. Not a pay calculation or a view on patient care.

**Never changes the schedule; a person makes any correction there. Never changes pay or hours. Never diagnoses, recommends treatment or tells a patient or client what care to have.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-hygiene-production demo
npx -y fairclinic-hygiene-production mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-hygiene-production demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Hygiene Production demo (fictional dental practice and hygienists, 2 to 6 November 2026)

▶ Check the files
  status: executed  decision: allow
  3 hygienist(s): 7980 produced, 159.59 per worked hour over 48.5 hours, 7.5 hours unfilled. 2 to review: 1 with production on days missing from the hours file, 1 below the hourly target, 0 with too much open time.
    below_target  Iris Demo       130 per hour  open 25%  perio 14.29%
    no_hours      Jo Temp         150 per hour  open 0%  perio 0%

▶ Write the worklist for the team
  status: executed  decision: allow
  Hygiene production per hour written: 3 hygienist(s): 7980 produced, 159.59 per worked hour over 48.5 hours, 7.5 hours unfilled. 2 to review: 1 with production on days missing from the hours file, 1 below the hourly target, 0 with too much open time. Files: fairclinic-out/hygiene/hygiene-production.csv, fairclinic-out/hygiene/hygiene-production.html.

▶ Agent tries pms update itself
  status: blocked  decision: block
  reason: Never changes the schedule; a person makes any correction there.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `hygiene_check` | Per hygienist: days, scheduled, open and worked hours, production, production per worked hour, open time percent and the share of periodontal visits among cleanings, with a status: no_hours, below_target, open_time or… | runs |
| `hygiene_write_report` | Write hygiene-production.csv (one row per item, with blank owner and decision columns for your team) and hygiene-production.html into out_dir (default fairclinic-out/hygiene). | runs |
| `hygiene_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `hygiene_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `hygiene_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `hygiene_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `pms_update` | Never changes the schedule; a person makes any correction there. | refused |
| `payroll_change` | Never changes pay or hours. | refused |
| `clinical_advice` | Never diagnoses, recommends treatment or tells a patient or client what care to have. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Hygiene hours (`hours`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `hygienist` (required) | text | Hygienist, Provider, RDH, Hyg | - |
| `date` (required) | date | Date, Work Date, Day | Datum, Date, 日付, 日期 |
| `scheduled_hours` (required) | number | Scheduled Hours, Hours, Hours Worked, Booked Hours, Available Hours | - |
| `open_hours` | number | Open Hours, Unfilled Hours, Unbooked Hours, Open Time | - |

### Hygiene procedures (`procedures`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `hygienist` (required) | text | Hygienist, Provider, RDH, Hyg | - |
| `date` (required) | date | Date, Date of Service, Proc Date, DOS | Datum, Date, 日付, 日期 |
| `code` (required) | text | Code, CDT, Procedure, Proc Code | - |
| `qty` | number | Qty, Quantity, Count, Units | Menge, Quantité, 数量, 数量 |
| `fee` (required) | amount | Fee, Amount, Production, Charge | Betrag, Montant, 請求額, 金额 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-hygiene-production inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-hygiene-production can remember facts about your setup so the next run does not have to be told again. `hygiene_learn` only proposes a fact; it changes nothing until a named person accepts it with `hygiene_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-hygiene-production memory list
fairclinic-hygiene-production memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-hygiene-production memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-hygiene-production demo
npx -y fairclinic-hygiene-production mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-hygiene-production": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-hygiene-production",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-hygiene-production -- npx -y fairclinic-hygiene-production mcp --root .`, or install the `fairclinic-hygiene-production` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-hygiene-production approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-hygiene-production approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-hygiene-production kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-hygiene-production tools                 # every tool, its policy and arguments
fairclinic-hygiene-production sources               # the columns each input is read from
fairclinic-hygiene-production inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-hygiene-production call hygiene_check '{"hours":"<hours>","procedures":"<procedures>"}'
fairclinic-hygiene-production eval                  # the private eval cases on the fictional fixtures
fairclinic-hygiene-production demo
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
