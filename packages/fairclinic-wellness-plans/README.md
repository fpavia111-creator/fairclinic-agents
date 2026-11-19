# Fairclinic Wellness Plans (`fairclinic-wellness-plans`)

Fairclinic Wellness Plans: a month of veterinary wellness plan billing and plan use: failed, missed and wrong charges, services used beyond what the plan includes, and early cancellations where the services used are worth more than the fees paid. It never charges, retries or refunds. Pet and client names are masked before results reach the model.

**Never charges or retries a card. Never refunds, credits or pays anyone. Never sends a text, e-mail, letter or post; drafts wait for one named person. Never changes plan enrollments; a person makes any correction there.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-wellness-plans demo
npx -y fairclinic-wellness-plans mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-wellness-plans demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Wellness Plans demo (fictional animal hospital, plans, pets and clients, October 2026)

▶ Check the files
  status: executed  decision: allow
  2026-10: 5 enrollment(s), 98 collected. 4 to review: 1 failed charge(s), 0 missed, 1 wrong amount, 1 service(s) used beyond the plan, 1 early cancellation(s) with more used than paid.
    early_cancel_balance Adult Dog   fee   35  used    377  early_cancel_balance
    failed_not_retried   Adult Cat   fee   29  used      0  failed_not_retried
    wrong_amount         Adult Dog   fee   35  used     68  wrong_amount
    over_used            Adult Cat   fee   29  used    136  over_used

▶ Write the worklist for the team
  status: executed  decision: allow
  Wellness plan billing and use written: 2026-10: 5 enrollment(s), 98 collected. 4 to review: 1 failed charge(s), 0 missed, 1 wrong amount, 1 service(s) used beyond the plan, 1 early cancellation(s) with more used than paid. Files: fairclinic-out/wellness/wellness-plans.csv, fairclinic-out/wellness/wellness-plans.html.

▶ Agent tries card charge itself
  status: blocked  decision: block
  reason: Never charges or retries a card.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `wellness_check` | Every enrollment for one month: what was collected, plan use against what the plan includes, and for cancelled plans the value used against the fees due, with a status: early_cancel_balance, failed_not_retried, missed… | runs |
| `wellness_write_report` | Write wellness-plans.csv (one row per item, with blank owner and decision columns for your team) and wellness-plans.html into out_dir (default fairclinic-out/wellness). | runs |
| `wellness_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `wellness_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `wellness_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `wellness_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `card_charge` | Never charges or retries a card. | refused |
| `refund_issue` | Never refunds, credits or pays anyone. | refused |
| `message_send` | Never sends a text, e-mail, letter or post; drafts wait for one named person. | refused |
| `pms_update` | Never changes plan enrollments; a person makes any correction there. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Wellness plan enrollments (`enrollments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `client_name` (required) | text (masked) | Client, Client Name, Owner, Customer | - |
| `patient_name` (required) | text (masked) | Patient, Pet, Animal, Patient Name | Patient, Patient, 患者名, 患者 |
| `plan` (required) | text | Plan, Wellness Plan, Plan Name | - |
| `monthly_fee` | amount | Monthly Fee, Fee, Price, Monthly | - |
| `start_date` | date | Start Date, Enrolled, Start | Eintrittsdatum, Date d'entrée, 入社日, 入职日期 |
| `status` | text | Status, Plan Status | - |
| `cancel_date` | date | Cancel Date, Cancelled, End Date | - |

### Processor payments (`payments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `client_name` (required) | text (masked) | Client, Customer, Customer Name, Client Name, Owner | - |
| `date` (required) | date | Date, Payment Date, Charge Date, Created | Datum, Date, 日付, 日期 |
| `amount` (required) | amount | Amount, Charged, Gross | Betrag, Montant, 金額, 金额 |
| `status` | text | Status, Result | - |

### Plan service use (`usage`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `patient_name` (required) | text (masked) | Patient, Pet, Animal, Patient Name | Patient, Patient, 患者名, 患者 |
| `date` (required) | date | Date, Visit Date, Date of Service | Datum, Date, 日付, 日期 |
| `service` (required) | text | Service, Item, Plan Service, Benefit | - |
| `qty` | number | Qty, Quantity, Count | Menge, Quantité, 数量, 数量 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-wellness-plans inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-wellness-plans can remember facts about your setup so the next run does not have to be told again. `wellness_learn` only proposes a fact; it changes nothing until a named person accepts it with `wellness_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-wellness-plans memory list
fairclinic-wellness-plans memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-wellness-plans memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-wellness-plans demo
npx -y fairclinic-wellness-plans mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-wellness-plans": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-wellness-plans",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-wellness-plans -- npx -y fairclinic-wellness-plans mcp --root .`, or install the `fairclinic-wellness-plans` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-wellness-plans approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-wellness-plans approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-wellness-plans kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-wellness-plans tools                 # every tool, its policy and arguments
fairclinic-wellness-plans sources               # the columns each input is read from
fairclinic-wellness-plans inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-wellness-plans call wellness_check '{"enrollments":"<enrollments>","payments":"<payments>","settings":"<settings>"}'
fairclinic-wellness-plans eval                  # the private eval cases on the fictional fixtures
fairclinic-wellness-plans demo
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
