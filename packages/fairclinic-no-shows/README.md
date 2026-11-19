# Fairclinic No Shows (`fairclinic-no-shows`)

Fairclinic No-shows: dental or veterinary appointments that were missed or cancelled late and not rebooked, repeat no-shows, no-show fees in your policy that were not charged (a person decides), no-show and late-cancellation rates by provider, and the scheduled value lost. It never books, messages or charges anyone. Patient names are masked before results reach the model.

**Never sends a text, e-mail, letter or post; drafts wait for one named person. Never changes the schedule; a person makes any correction there. Never charges a no-show or cancellation fee.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-no-shows demo
npx -y fairclinic-no-shows mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-no-shows demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic No-shows demo (fictional practice and patients, 2 to 13 November 2026)

▶ Check the files
  status: executed  decision: allow
  10 appointment(s): 4 no-show(s) (40%), 2 late cancellation(s) (20%), 2765 of scheduled value lost to them. 4 to follow up: 2 no-show(s) and 1 late cancellation(s) not rebooked, 1 repeat no-show(s), 3 no-show fee(s) not charged.
    repeat_no_show            A3   Hana Test        2026-11-10  no_show
    no_show_not_rebooked      A2   Hana Test        2026-11-03  no_show
    no_show_not_rebooked      A10  Dr. Ben Sample   2026-11-13  no_show
    late_cancel_not_rebooked  A4   Dr. Ada Example  2026-11-04  late_cancel

▶ Write the worklist for the team
  status: executed  decision: allow
  No-shows and late cancellations written: 10 appointment(s): 4 no-show(s) (40%), 2 late cancellation(s) (20%), 2765 of scheduled value lost to them. 4 to follow up: 2 no-show(s) and 1 late cancellation(s) not rebooked, 1 repeat no-show(s), 3 no-show fee(s) not charged. Files: fairclinic-out/noshows/noshows-follow-up.csv, fairclinic-out/noshows/noshows-follow-up.html.

▶ Agent tries message send itself
  status: blocked  decision: block
  reason: Never sends a text, e-mail, letter or post; drafts wait for one named person.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `noshows_check` | Every appointment as kept, cancelled, late cancellation or no-show, with a status: repeat_no_show, no_show_not_rebooked, late_cancel_not_rebooked, fee_not_charged or ok; no-show and late-cancellation rates by provider… | runs |
| `noshows_write_report` | Write noshows-follow-up.csv (one row per item, with blank owner and decision columns for your team) and noshows-follow-up.html into out_dir (default fairclinic-out/noshows). | runs |
| `noshows_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `noshows_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `noshows_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `noshows_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `message_send` | Never sends a text, e-mail, letter or post; drafts wait for one named person. | refused |
| `pms_update` | Never changes the schedule; a person makes any correction there. | refused |
| `client_charge` | Never charges a no-show or cancellation fee. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Appointments (`appointments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `appointment_id` (required) | text | Appointment, Appt ID, Appointment ID, ID | - |
| `patient_name` | text (masked) | Patient, Patient Name, Pet | Patient, Patient, 患者名, 患者 |
| `provider` | text | Provider, Doctor, Hygienist, Column, Operatory | Leistungserbringer, Prestataire, 医師, 医生 |
| `date` (required) | date | Date, Appointment Date, Appt Date, Scheduled For | Datum, Date, 日付, 日期 |
| `appointment_type` | text | Type, Appointment Type, Reason, Procedure | - |
| `status` (required) | text | Status, Appointment Status, Outcome | - |
| `cancelled_on` | date | Cancelled On, Cancel Date, Cancelled | - |
| `rebooked` | date | Rebooked, Rebooked For, Next Appointment, Rescheduled To | - |
| `fee_charged` | amount | Fee Charged, No-show Fee, Cancellation Fee, Fee | - |
| `scheduled_value` | amount | Scheduled Value, Scheduled Production, Value, Est Production | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-no-shows inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-no-shows can remember facts about your setup so the next run does not have to be told again. `noshows_learn` only proposes a fact; it changes nothing until a named person accepts it with `noshows_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-no-shows memory list
fairclinic-no-shows memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-no-shows memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-no-shows demo
npx -y fairclinic-no-shows mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-no-shows": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-no-shows",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-no-shows -- npx -y fairclinic-no-shows mcp --root .`, or install the `fairclinic-no-shows` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-no-shows approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-no-shows approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-no-shows kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-no-shows tools                 # every tool, its policy and arguments
fairclinic-no-shows sources               # the columns each input is read from
fairclinic-no-shows inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-no-shows call noshows_check '{"appointments":"<appointments>"}'
fairclinic-no-shows eval                  # the private eval cases on the fictional fixtures
fairclinic-no-shows demo
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
