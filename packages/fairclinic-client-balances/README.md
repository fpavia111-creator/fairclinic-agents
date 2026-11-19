# Fairclinic Client Balances (`fairclinic-client-balances`)

Fairclinic Client Balances: veterinary client accounts receivable with the next step for each account: credits and unapplied deposits for a person to check, money over 90 days for collections review, no recent statement, and small balances. It never refunds, applies money or sends anyone to collections. Client names and account numbers are masked before results reach the model.

**Never refunds, credits or pays anyone. Never sends a text, e-mail, letter or post; drafts wait for one named person. Never sends an account to a collection agency or reports it to a credit bureau. Never changes client accounts; a person makes any correction there.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-client-balances demo
npx -y fairclinic-client-balances mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-client-balances demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Client Balances demo (fictional animal hospital and clients, as of 2026-11-16)

▶ Check the files
  status: executed  decision: allow
  7 client account(s): 3558.5 owed, 1890 over 90 days, 85 in credits, 300 in unapplied deposits. 5 to work: 1 credit(s), 1 deposit(s) not applied, 1 for collections review, 2 with no recent statement.
    credit_balance       ACCT-1886516a balance      -85  A credit of 85 on the account. A person checks it and decides whether it is refunded or kept on account.
    deposit_not_applied  ACCT-45fd6a55 balance      230  230 owed while a deposit of 300 sits on the account unapplied. Check whether the deposit should be applied.
    collections_review   ACCT-34836bfc balance     1890  1890 over 90 days and no payment for 119 days; ready for a review by a person.
    no_statement         ACCT-ddffa12d balance      735  735 owed and no statement for 57 days.
    no_statement         ACCT-074b6eb9 balance      180  180 owed and no statement recorded.
    small_balance        ACCT-0cdc7441 balance      3.5  3.5 is below your small-balance amount of 5.

▶ Write the worklist for the team
  status: executed  decision: allow
  Client balances written: 7 client account(s): 3558.5 owed, 1890 over 90 days, 85 in credits, 300 in unapplied deposits. 5 to work: 1 credit(s), 1 deposit(s) not applied, 1 for collections review, 2 with no recent statement. Files: fairclinic-out/clientar/clientar-worklist.csv, fairclinic-out/clientar/clientar-worklist.html.

▶ Agent tries refund issue itself
  status: blocked  decision: block
  reason: Never refunds, credits or pays anyone.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `clientar_check` | Every client account with a balance, its aging buckets, deposits and last payment and statement, with a status: credit_balance, deposit_not_applied, collections_review, no_statement, small_balance or ok. | runs |
| `clientar_write_report` | Write clientar-worklist.csv (one row per item, with blank owner and decision columns for your team) and clientar-worklist.html into out_dir (default fairclinic-out/clientar). | runs |
| `clientar_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `clientar_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `clientar_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `clientar_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `refund_issue` | Never refunds, credits or pays anyone. | refused |
| `message_send` | Never sends a text, e-mail, letter or post; drafts wait for one named person. | refused |
| `collections_send` | Never sends an account to a collection agency or reports it to a credit bureau. | refused |
| `pms_update` | Never changes client accounts; a person makes any correction there. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Client accounts receivable (`balances`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `client_id` (required) | text (masked) | Client ID, Account, Client #, Account # | - |
| `client_name` | text (masked) | Client, Client Name, Owner, Name | - |
| `balance` (required) | amount | Balance, Total Balance, Account Balance, Amount Due | Saldo, Solde, 残高, 余额 |
| `aged_0_30` | amount | Current, 0-30, 0 - 30 | - |
| `aged_31_60` | amount | 31-60, 31 - 60, 30 Days | - |
| `aged_61_90` | amount | 61-90, 61 - 90, 60 Days | - |
| `aged_90_plus` | amount | 90+, Over 90, 90 Days, 91+ | - |
| `deposit` | amount | Deposit, Deposits, Unapplied Deposit, Prepayment, On Account | - |
| `last_payment` | date | Last Payment, Last Payment Date, Last Paid | - |
| `last_statement` | date | Last Statement, Last Statement Date, Statement Sent, Last Reminder | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-client-balances inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-client-balances can remember facts about your setup so the next run does not have to be told again. `clientar_learn` only proposes a fact; it changes nothing until a named person accepts it with `clientar_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-client-balances memory list
fairclinic-client-balances memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-client-balances memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-client-balances demo
npx -y fairclinic-client-balances mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-client-balances": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-client-balances",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-client-balances -- npx -y fairclinic-client-balances mcp --root .`, or install the `fairclinic-client-balances` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-client-balances approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-client-balances approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-client-balances kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-client-balances tools                 # every tool, its policy and arguments
fairclinic-client-balances sources               # the columns each input is read from
fairclinic-client-balances inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-client-balances call clientar_check '{"balances":"<balances>"}'
fairclinic-client-balances eval                  # the private eval cases on the fictional fixtures
fairclinic-client-balances demo
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
