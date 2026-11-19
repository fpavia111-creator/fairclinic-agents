# Fairclinic Patient Balances (`fairclinic-patient-balances`)

Fairclinic Patient Balances: dental patient and guarantor balances aged, with the next step for each account: credits for a person to check, missed payment-plan payments, money over 90 days for collections review, no recent statement, waiting on insurance, small balances; and a plain balance reminder for one named person to send. Names and account numbers are masked before results reach the model.

**Never refunds, credits or pays anyone. Never sends a text, e-mail, letter or post; drafts wait for one named person. Never sends an account to a collection agency or reports it to a credit bureau. Never changes balances or statements; a person makes any correction there.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-patient-balances demo
npx -y fairclinic-patient-balances mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-patient-balances demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Patient Balances demo (fictional dental practice and accounts, as of 2026-11-16) in C:\Users\fpavi\AppData\Local\Temp\fairclinic-patient-balances-demo-aD3dAa

▶ Check the files
  status: executed  decision: allow
  10 account(s), 4513.2 owed (3992.2 patient portion, 646 waiting on insurance), 2740 over 90 days, 125 in credits. 5 to work: 1 credit(s), 1 missed plan payment(s), 1 for collections review, 2 without a recent statement.
    credit_balance     balance     -125  patient        0  A credit of 125: the account may be owed money back. A person checks it and decides about a refund.
    plan_missed        balance     1200  patient     1200  On a payment plan with no payment for 67 days.
    collections_review balance      980  patient      980  680 over 90 days and no payment for 93 days; ready for a collections review by a person.
    no_statement       balance      640  patient      640  Patient portion 640 and no statement for 57 days.
    no_statement       balance      150  patient      150  Patient portion 150 and no statement recorded.
    insurance_pending  balance      310  patient        0  The balance is waiting on 310 of insurance; nothing to bill the patient yet.
    small_balance      balance      3.2  patient      3.2  Patient portion 3.2 is below your small-balance amount of 5.
    payment_plan       balance      860  patient      860  On a payment plan; last payment 2026-11-01.

▶ Write the worklist for the team
  status: executed  decision: allow
  Patient balances written: 10 account(s), 4513.2 owed (3992.2 patient portion, 646 waiting on insurance), 2740 over 90 days, 125 in credits. 5 to work: 1 credit(s), 1 missed plan payment(s), 1 for collections review, 2 without a recent statement. Files: fairclinic-out/balances/balances-worklist.csv, fairclinic-out/balances/balances-worklist.html.

▶ Agent tries refund issue itself
  status: blocked  decision: block
  reason: Never refunds, credits or pays anyone.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `balances_check` | Every account with a balance: patient portion, insurance pending, aging buckets, last payment and statement, and a status: credit_balance, plan_missed, collections_review, no_statement, insurance_pending, small_balanc… | runs |
| `balances_explain` | One account with its figures and the reason for its status. | runs |
| `balances_write_report` | Write balances-worklist.csv (one row per item, with blank owner and decision columns for your team) and balances-worklist.html into out_dir (default fairclinic-out/balances). | runs |
| `balances_draft_balance_letter` | Write drafts/balance_letter-<hash>.md: a plain reminder of the patient portion with the last statement date and a number to call. | asks first (Auto can be opted in) |
| `balances_request_send` | After one named human click (even in Auto), record that the reviewed balance letter draft is approved in balance_letter-requests.csv. | one named click, even in Auto (`binding_send`) |
| `balances_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `balances_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `balances_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `balances_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `refund_issue` | Never refunds, credits or pays anyone. | refused |
| `message_send` | Never sends a text, e-mail, letter or post; drafts wait for one named person. | refused |
| `collections_send` | Never sends an account to a collection agency or reports it to a credit bureau. | refused |
| `pms_update` | Never changes balances or statements; a person makes any correction there. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Accounts receivable by guarantor (`balances`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `account_number` (required) | text (masked) | Account, Account #, Guarantor ID, Acct #, Account Number, Guar # | - |
| `guarantor` | text (masked) | Guarantor, Guarantor Name, Responsible Party, Patient, Name | - |
| `balance` (required) | amount | Balance, Total Balance, Account Balance, BalTotal | Saldo, Solde, 残高, 余额 |
| `aged_0_30` | amount | 0-30, Current, 0 - 30, Bal_0_30 | - |
| `aged_31_60` | amount | 31-60, 31 - 60, Bal_31_60 | - |
| `aged_61_90` | amount | 61-90, 61 - 90, Bal_61_90 | - |
| `aged_90_plus` | amount | 90+, Over 90, 91+, BalOver90, 90 Plus | - |
| `insurance_pending` | amount | Ins Pending, Insurance Pending, Ins Est, InsEst, Est. Insurance | - |
| `last_payment` | date | Last Payment, Last Payment Date, Last Pmt, DateLastPay | - |
| `last_statement` | date | Last Statement, Last Statement Date, Statement Sent, DateLastStatement | - |
| `payment_plan` | text | Payment Plan, On Plan, Plan, HasPayPlan | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-patient-balances inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-patient-balances can remember facts about your setup so the next run does not have to be told again. `balances_learn` only proposes a fact; it changes nothing until a named person accepts it with `balances_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-patient-balances memory list
fairclinic-patient-balances memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-patient-balances memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-patient-balances demo
npx -y fairclinic-patient-balances mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-patient-balances": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-patient-balances",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-patient-balances -- npx -y fairclinic-patient-balances mcp --root .`, or install the `fairclinic-patient-balances` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-patient-balances approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-patient-balances approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-patient-balances kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-patient-balances tools                 # every tool, its policy and arguments
fairclinic-patient-balances sources               # the columns each input is read from
fairclinic-patient-balances inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-patient-balances call balances_check '{"balances":"<balances>"}'
fairclinic-patient-balances eval                  # the private eval cases on the fictional fixtures
fairclinic-patient-balances demo
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
