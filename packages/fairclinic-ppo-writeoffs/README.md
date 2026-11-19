# Fairclinic PPO Write-offs (`fairclinic-ppo-writeoffs`)

Fairclinic PPO Write-offs: dental adjustments and write-offs split into contractual (PPO) and discretionary, with write-off percent of production by carrier and discretionary adjustments by the person who entered them; flags duplicates, contractual write-offs for out-of-network carriers or no carrier, adjustments without a reason, and large ones. Patient names are masked before results reach the model.

**Never changes adjustments or balances; a person makes any correction there. Never refunds, credits or pays anyone. Never bills or files with a carrier; a person does, after review.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-ppo-writeoffs demo
npx -y fairclinic-ppo-writeoffs mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-ppo-writeoffs demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic PPO Write-offs demo (fictional dental practice, staff and patients, November 2026)

▶ Check the files
  status: executed  decision: allow
  11 adjustment(s), 2315.5 in total: 881 contractual, 1434.5 discretionary. 5 to review: 1 duplicate(s), 1 contractual write-off(s) for out-of-network carriers, 1 with no carrier, 1 without a reason, 2 large.
    out_of_network  2026-11-04  PPO Write-off            180  Sam Billing
    no_reason       2026-11-05  Courtesy Discount        150  Jo Front
    large           2026-11-07  Bad Debt Write-off       620  Sam Billing
    duplicate       2026-11-07  Bad Debt Write-off       620  Sam Billing
    no_carrier      2026-11-09  PPO Write-off             60  Jo Front

▶ Write the worklist for the team
  status: executed  decision: allow
  Write-off review written: 11 adjustment(s), 2315.5 in total: 881 contractual, 1434.5 discretionary. 5 to review: 1 duplicate(s), 1 contractual write-off(s) for out-of-network carriers, 1 with no carrier, 1 without a reason, 2 large. Files: fairclinic-out/writeoffs/writeoffs-review.csv, fairclinic-out/writeoffs/writeoffs-review.html.

▶ Agent tries pms update itself
  status: blocked  decision: block
  reason: Never changes adjustments or balances; a person makes any correction there.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `writeoffs_check` | Every adjustment as contractual (PPO) or discretionary, with a status: duplicate, out_of_network, no_carrier, no_reason, large or ok. | runs |
| `writeoffs_by_staff` | Per person who entered them: discretionary adjustments, amount, share of the total and how many have no reason. | runs |
| `writeoffs_write_report` | Write writeoffs-review.csv (one row per item, with blank owner and decision columns for your team) and writeoffs-review.html into out_dir (default fairclinic-out/writeoffs). | runs |
| `writeoffs_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `writeoffs_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `writeoffs_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `writeoffs_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `pms_update` | Never changes adjustments or balances; a person makes any correction there. | refused |
| `refund_issue` | Never refunds, credits or pays anyone. | refused |
| `claim_submit` | Never bills or files with a carrier; a person does, after review. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Adjustments and write-offs (`adjustments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Adjustment Date, Entry Date, AdjDate | Datum, Date, 日付, 日期 |
| `patient_name` | text (masked) | Patient, Patient Name, PatName | Patient, Patient, 患者名, 患者 |
| `type` (required) | text | Adjustment Type, Type, Adj Type, Description | Typ, Type, 種類, 类型 |
| `carrier` | text | Carrier, Insurance, Primary Carrier, Carrier Name, Plan | Kostenträger, Payeur, 保険者, 付款方 |
| `amount` (required) | amount | Amount, Adjustment Amount, Adj Amount, AdjAmt | Betrag, Montant, 金額, 金额 |
| `entered_by` | text | Entered By, User, Operator, Staff, Posted By | - |
| `note` | text | Note, Reason, Comment, Memo | Verwendungszweck, Libellé, 摘要, 摘要 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Dentrix | Adjustments by type report, exported to CSV | Adjustment Type, Patient Name, Entered By, Amount | no |

Where a layout says "checked", its column names were compared with the publisher's template or documentation on that date (the CMS price-transparency templates, the pfs.data.cms.gov column lists and Open Dental's published procedure log fields). The NCCI, MUE and RVU file headers and the other practice-management and clearinghouse layouts were written from knowledge of the export and were not checked; where the vendor's public help says something about the export, the layout's note says what. None was tested against a live account.

### Production by carrier (`production`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `carrier` (required) | text | Carrier, Insurance, Plan, Payer | Kostenträger, Payeur, 保険者, 付款方 |
| `production` (required) | amount | Production, Gross Production, Charges, Billed | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-ppo-writeoffs inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-ppo-writeoffs can remember facts about your setup so the next run does not have to be told again. `writeoffs_learn` only proposes a fact; it changes nothing until a named person accepts it with `writeoffs_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-ppo-writeoffs memory list
fairclinic-ppo-writeoffs memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-ppo-writeoffs memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-ppo-writeoffs demo
npx -y fairclinic-ppo-writeoffs mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-ppo-writeoffs": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-ppo-writeoffs",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-ppo-writeoffs -- npx -y fairclinic-ppo-writeoffs mcp --root .`, or install the `fairclinic-ppo-writeoffs` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-ppo-writeoffs approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-ppo-writeoffs approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-ppo-writeoffs kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-ppo-writeoffs tools                 # every tool, its policy and arguments
fairclinic-ppo-writeoffs sources               # the columns each input is read from
fairclinic-ppo-writeoffs inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-ppo-writeoffs call writeoffs_check '{"adjustments":"<adjustments>"}'
fairclinic-ppo-writeoffs eval                  # the private eval cases on the fictional fixtures
fairclinic-ppo-writeoffs demo
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
