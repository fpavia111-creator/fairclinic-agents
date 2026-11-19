# Fairclinic Payroll Production (`fairclinic-payroll-production`)

Fairclinic Payroll Production: dental or veterinary payroll hours and pay against collections per pay period: payroll as a percent of collections, collections per paid hour, periods over your target or missing a collections figure, high overtime by employee, and totals by role. Not a wage-and-hour review; it never changes pay or runs payroll.

**Never changes pay, hours or schedules and never runs payroll. Never pays an invoice, a person or a supplier. Never messages, disciplines or reports a member of staff.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-payroll-production demo
npx -y fairclinic-payroll-production mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-payroll-production demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Payroll Production demo (fictional clinic and staff, October 2026)

▶ Check the files
  status: executed  decision: allow
  3 pay period(s), 5 employee(s): payroll 25920 against 67000 collected (38.69%), 22 overtime hours. 3 to review: 1 period(s) over your payroll target, 1 with no collections figure, 1 employee-period(s) with high overtime.
    payroll_pct_high  2026-10-16 (period)         hours    360  pay     13320  42.97% of collections
    overtime          2026-10-16 Lee Tech         hours     94  pay      2870  
    no_revenue        2026-11-01 (period)         hours     80  pay      1760  

▶ Write the worklist for the team
  status: executed  decision: allow
  Payroll against collections written: 3 pay period(s), 5 employee(s): payroll 25920 against 67000 collected (38.69%), 22 overtime hours. 3 to review: 1 period(s) over your payroll target, 1 with no collections figure, 1 employee-period(s) with high overtime. Files: fairclinic-out/payroll/payroll-production.csv, fairclinic-out/payroll/payroll-production.html.

▶ Agent tries payroll change itself
  status: blocked  decision: block
  reason: Never changes pay, hours or schedules and never runs payroll.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `payroll_check` | Each pay period with hours, overtime, gross pay, collections, payroll as a percent of collections and collections per paid hour, plus employees with high overtime, with a status: payroll_pct_high, no_revenue, overtime… | runs |
| `payroll_write_report` | Write payroll-production.csv (one row per item, with blank owner and decision columns for your team) and payroll-production.html into out_dir (default fairclinic-out/payroll). | runs |
| `payroll_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `payroll_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `payroll_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `payroll_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `payroll_change` | Never changes pay, hours or schedules and never runs payroll. | refused |
| `payment_send` | Never pays an invoice, a person or a supplier. | refused |
| `staff_action` | Never messages, disciplines or reports a member of staff. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Payroll register (`payroll`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `employee` (required) | text | Employee, Name, Staff, Employee Name | Mitarbeiter, Employé, 社員名, 员工 |
| `role` | text | Role, Position, Job Title, Department | Rolle, Rôle, ロール, 角色 |
| `period_start` (required) | date | Period Start, Pay Period Start, Start | - |
| `period_end` | date | Period End, Pay Period End, End, Pay Date | - |
| `regular_hours` | number | Regular Hours, Reg Hours, Hours, Regular | - |
| `overtime_hours` | number | Overtime Hours, OT Hours, Overtime, OT | - |
| `gross_pay` (required) | amount | Gross Pay, Gross, Total Pay, Earnings | - |

### Collections per period (`revenue`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `period_start` (required) | date | Period Start, Start, From | - |
| `collections` (required) | amount | Collections, Collected, Receipts, Revenue | - |
| `production` | amount | Production, Gross Production, Charges | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-payroll-production inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-payroll-production can remember facts about your setup so the next run does not have to be told again. `payroll_learn` only proposes a fact; it changes nothing until a named person accepts it with `payroll_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-payroll-production memory list
fairclinic-payroll-production memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-payroll-production memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-payroll-production demo
npx -y fairclinic-payroll-production mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-payroll-production": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-payroll-production",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-payroll-production -- npx -y fairclinic-payroll-production mcp --root .`, or install the `fairclinic-payroll-production` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-payroll-production approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-payroll-production approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-payroll-production kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-payroll-production tools                 # every tool, its policy and arguments
fairclinic-payroll-production sources               # the columns each input is read from
fairclinic-payroll-production inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-payroll-production call payroll_check '{"payroll":"<payroll>"}'
fairclinic-payroll-production eval                  # the private eval cases on the fictional fixtures
fairclinic-payroll-production demo
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
