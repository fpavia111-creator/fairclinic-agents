# Fairclinic Card Deposits (`fairclinic-card-deposits`)

Fairclinic Card Deposits: card processor batches against bank deposits and the practice system's card totals: batches that never arrived, deposits at a different amount, chargebacks, days where the practice system differs, high fees, and card deposits that match no batch. It never responds to disputes, refunds or posts anything.

**Never responds to a chargeback or dispute; a person does in the processor portal. Never refunds, credits or pays anyone. Never posts to the books or the bank.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-card-deposits demo
npx -y fairclinic-card-deposits mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-card-deposits demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Card Deposits demo (fictional clinic, processor and bank, November 2026)

▶ Check the files
  status: executed  decision: allow
  5 batch(es): gross 19750, fees 630.35 (3.19%), net 18769.65, deposited 15281.65. 4 to review: 1 with no deposit, 1 deposited at a different amount, 1 chargeback(s) (150), 1 day(s) where the practice system differs, 1 with high fees, 1 deposit(s) matching no batch.
    no_deposit        B105  2026-11-06  net     3438  deposited -
    amount_differs    B103  2026-11-04  net  4771.52  deposited 4721.52
    chargeback        B104  2026-11-05  net  2743.58  deposited 2743.58
    deposit_unmatched -     2026-11-09  net        -  deposited 980

▶ Write the worklist for the team
  status: executed  decision: allow
  Card batches and deposits written: 5 batch(es): gross 19750, fees 630.35 (3.19%), net 18769.65, deposited 15281.65. 4 to review: 1 with no deposit, 1 deposited at a different amount, 1 chargeback(s) (150), 1 day(s) where the practice system differs, 1 with high fees, 1 deposit(s) matching no batch. Files: fairclinic-out/deposits/deposits-match.csv, fairclinic-out/deposits/deposits-match.html.

▶ Agent tries dispute respond itself
  status: blocked  decision: block
  reason: Never responds to a chargeback or dispute; a person does in the processor portal.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `deposits_check` | Every processor batch matched to a bank deposit (by batch id in the description, else by net amount within a few days), checked against the practice system's card total for the day, with a status: no_deposit, amount_d… | runs |
| `deposits_write_report` | Write deposits-match.csv (one row per item, with blank owner and decision columns for your team) and deposits-match.html into out_dir (default fairclinic-out/deposits). | runs |
| `deposits_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `deposits_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `deposits_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `deposits_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `dispute_respond` | Never responds to a chargeback or dispute; a person does in the processor portal. | refused |
| `refund_issue` | Never refunds, credits or pays anyone. | refused |
| `ledger_post` | Never posts to the books or the bank. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Processor batches (`batches`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `batch_id` (required) | text | Batch, Batch ID, Batch #, Settlement ID, Payout ID | - |
| `batch_date` (required) | date | Batch Date, Date, Settlement Date, Close Date | Datum, Date, 日付, 日期 |
| `gross` (required) | amount | Gross, Sales, Gross Amount, Total Sales | - |
| `fees` | amount | Fees, Fee, Processing Fees, Discount Fees | - |
| `refunds` | amount | Refunds, Returns, Refund Amount | - |
| `chargebacks` | amount | Chargebacks, Disputes, Chargeback Amount | - |
| `net` | amount | Net, Net Deposit, Net Amount, Payout Amount | - |

### Bank deposits (`deposits`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Posting Date, Transaction Date, Value Date | Datum, Date, 日付, 日期 |
| `amount` (required) | amount | Amount, Credit, Deposit, Deposits | Betrag, Montant, 金額, 金额 |
| `description` | text | Description, Memo, Reference, Details | Beschreibung, Description, 摘要, 摘要 |

### Practice system card totals (`pms`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Day, Business Date | Datum, Date, 日付, 日期 |
| `card_total` (required) | amount | Card Payments, Card Total, Credit Card, Cards, Card | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-card-deposits inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-card-deposits can remember facts about your setup so the next run does not have to be told again. `deposits_learn` only proposes a fact; it changes nothing until a named person accepts it with `deposits_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-card-deposits memory list
fairclinic-card-deposits memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-card-deposits memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-card-deposits demo
npx -y fairclinic-card-deposits mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-card-deposits": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-card-deposits",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-card-deposits -- npx -y fairclinic-card-deposits mcp --root .`, or install the `fairclinic-card-deposits` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-card-deposits approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-card-deposits approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-card-deposits kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-card-deposits tools                 # every tool, its policy and arguments
fairclinic-card-deposits sources               # the columns each input is read from
fairclinic-card-deposits inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-card-deposits call deposits_check '{"batches":"<batches>","deposits":"<deposits>"}'
fairclinic-card-deposits eval                  # the private eval cases on the fictional fixtures
fairclinic-card-deposits demo
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
