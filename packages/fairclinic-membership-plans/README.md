# Fairclinic Membership Plans (`fairclinic-membership-plans`)

Fairclinic Membership Plans: a month of in-house dental membership (savings) plan billing against the roster: missed and failed charges, wrong amounts, charges after cancelling, plan use after a membership ended, annual renewals due or lapsed, and charges for people not on the roster. It never charges, retries or refunds. Member names are masked before results reach the model.

**Never charges or retries a card. Never refunds, credits or pays anyone. Never sends a text, e-mail, letter or post; drafts wait for one named person. Never changes membership records; a person makes any correction there.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-membership-plans demo
npx -y fairclinic-membership-plans mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-membership-plans demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Membership Plans demo (fictional dental practice and members, October 2026, as of 2026-11-16) in C:\Users\fpavi\AppData\Local\Temp\fairclinic-membership-plans-demo-3HEtCh

▶ Check the files
  status: executed  decision: allow
  2026-10: 9 member(s), 145 expected from monthly plans, 131 collected. 8 to review: 1 missed, 1 failed, 1 wrong amount, 1 charged after cancelling, 2 visit(s) after a membership ended, 1 charge(s) not on the roster, 1 renewal(s) due.
    billed_after_cancel  Adult Plan    fee     29  collected     29
    used_after_lapse     Annual Adult  fee    329  collected      0
    used_after_lapse     Adult Plan    fee     29  collected      0
    failed_not_retried   Perio Plan    fee     39  collected      0
    missed_payment       Adult Plan    fee     29  collected      0
    wrong_amount         Adult Plan    fee     29  collected     25
    not_in_roster        -             fee      -  collected     29
    renewal_due          Annual Adult  fee    329  collected      0

▶ Write the worklist for the team
  status: executed  decision: allow
  Membership plan billing written: 2026-10: 9 member(s), 145 expected from monthly plans, 131 collected. 8 to review: 1 missed, 1 failed, 1 wrong amount, 1 charged after cancelling, 2 visit(s) after a membership ended, 1 charge(s) not on the roster, 1 renewal(s) due. Files: fairclinic-out/membership/membership-billing.csv, fairclinic-out/membership/membership-billing.html.

▶ Agent tries card charge itself
  status: blocked  decision: block
  reason: Never charges or retries a card.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `membership_check` | Every member for one month with what was collected and a status: billed_after_cancel, used_after_lapse, failed_not_retried, missed_payment, wrong_amount, annual_lapsed, not_in_roster, renewal_due or ok. | runs |
| `membership_write_report` | Write membership-billing.csv (one row per item, with blank owner and decision columns for your team) and membership-billing.html into out_dir (default fairclinic-out/membership). | runs |
| `membership_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `membership_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `membership_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `membership_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `card_charge` | Never charges or retries a card. | refused |
| `refund_issue` | Never refunds, credits or pays anyone. | refused |
| `message_send` | Never sends a text, e-mail, letter or post; drafts wait for one named person. | refused |
| `pms_update` | Never changes membership records; a person makes any correction there. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Membership roster (`members`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `patient_name` (required) | text (masked) | Member, Patient, Patient Name, Member Name, Name | Patient, Patient, 患者名, 患者 |
| `plan` | text | Plan, Membership, Plan Name, Membership Plan | - |
| `fee` (required) | amount | Fee, Plan Fee, Price, Amount, Monthly Fee | - |
| `billing` | text | Billing, Frequency, Billing Cycle, Interval | - |
| `start_date` | date | Start Date, Joined, Enrolled, Start | Eintrittsdatum, Date d'entrée, 入社日, 入职日期 |
| `status` | text | Status, Membership Status | - |
| `cancel_date` | date | Cancel Date, Cancelled, End Date, Canceled | - |
| `renewal_date` | date | Renewal Date, Renews, Next Renewal, Expires | - |

### Processor payments (`payments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `patient_name` (required) | text (masked) | Member, Customer, Customer Name, Patient, Name, Description | Patient, Patient, 患者名, 患者 |
| `date` (required) | date | Date, Payment Date, Created, Charge Date | Datum, Date, 日付, 日期 |
| `amount` (required) | amount | Amount, Charged, Payment Amount, Gross | Betrag, Montant, 金額, 金额 |
| `status` | text | Status, Result, Payment Status | - |

### Visits (`visits`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `patient_name` (required) | text (masked) | Patient, Patient Name, Member | Patient, Patient, 患者名, 患者 |
| `date` (required) | date | Date, Visit Date, Date of Service | Datum, Date, 日付, 日期 |
| `code` | text | Code, Procedure, CDT | - |
| `discount` | amount | Discount, Member Discount, Plan Discount | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-membership-plans inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-membership-plans can remember facts about your setup so the next run does not have to be told again. `membership_learn` only proposes a fact; it changes nothing until a named person accepts it with `membership_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-membership-plans memory list
fairclinic-membership-plans memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-membership-plans memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-membership-plans demo
npx -y fairclinic-membership-plans mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-membership-plans": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-membership-plans",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-membership-plans -- npx -y fairclinic-membership-plans mcp --root .`, or install the `fairclinic-membership-plans` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-membership-plans approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-membership-plans approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-membership-plans kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-membership-plans tools                 # every tool, its policy and arguments
fairclinic-membership-plans sources               # the columns each input is read from
fairclinic-membership-plans inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-membership-plans call membership_check '{"members":"<members>","payments":"<payments>"}'
fairclinic-membership-plans eval                  # the private eval cases on the fictional fixtures
fairclinic-membership-plans demo
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
