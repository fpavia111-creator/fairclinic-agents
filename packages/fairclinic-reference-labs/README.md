# Fairclinic Reference Labs (`fairclinic-reference-labs`)

Fairclinic Reference Labs: veterinary send-out tests on the reference lab's invoice matched to client charges for the same pet and date: tests not charged, charges below lab cost or under your markup rule, and send-out items charged with no test on the lab invoice. Pet and client names are masked before results reach the model.

**Never changes invoices; a person makes any correction there. Never charges a client. Never pays an invoice, a person or a supplier.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-reference-labs demo
npx -y fairclinic-reference-labs mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-reference-labs demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Reference Labs demo (fictional animal hospital, reference lab, pets and clients, November 2026) in C:\Users\fpavi\AppData\Local\Temp\fairclinic-reference-labs-demo-VhCUhJ

▶ Check the files
  status: executed  decision: allow
  5 send-out test(s), lab cost 176.5. 4 to review: 1 not charged to the client (lab cost 22), 1 charged below cost, 1 under your markup rule, 1 charged with no test on the lab invoice.
    not_charged         A-9002  Thyroid T4                 cost     22  charged -
    charged_below_cost  A-9004  Fecal PCR panel            cost     55  charged 49
    low_markup          A-9003  Urinalysis with culture    cost     39  charged 60
    charged_not_sent            Lyme quantitative          cost      -  charged 85

▶ Write the worklist for the team
  status: executed  decision: allow
  Reference lab send-outs written: 5 send-out test(s), lab cost 176.5. 4 to review: 1 not charged to the client (lab cost 22), 1 charged below cost, 1 under your markup rule, 1 charged with no test on the lab invoice. Files: fairclinic-out/sendouts/sendouts-match.csv, fairclinic-out/sendouts/sendouts-match.html.

▶ Agent tries pms update itself
  status: blocked  decision: block
  reason: Never changes invoices; a person makes any correction there.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `sendouts_check` | Every test on the lab invoice matched to a client charge for the same pet within a few days, with a status: not_charged, charged_below_cost, low_markup, charged_not_sent or ok. | runs |
| `sendouts_write_report` | Write sendouts-match.csv (one row per item, with blank owner and decision columns for your team) and sendouts-match.html into out_dir (default fairclinic-out/sendouts). | runs |
| `sendouts_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `sendouts_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `sendouts_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `sendouts_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `pms_update` | Never changes invoices; a person makes any correction there. | refused |
| `client_charge` | Never charges a client. | refused |
| `payment_send` | Never pays an invoice, a person or a supplier. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Reference lab invoice detail (`lab`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `accession` (required) | text | Accession, Accession #, Requisition, Order #, Lab Order | - |
| `date` (required) | date | Date, Collection Date, Date Received, Service Date | Datum, Date, 日付, 日期 |
| `patient_name` (required) | text (masked) | Patient, Pet, Animal, Patient Name | Patient, Patient, 患者名, 患者 |
| `test` (required) | text | Test, Test Name, Description, Service | - |
| `lab_cost` (required) | amount | Lab Cost, Cost, Amount, Charge, Net | Stückkosten, Coût unitaire, 単価, 单位成本 |

### Client invoice lines (`charges`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `patient_name` (required) | text (masked) | Patient, Pet, Animal, Patient Name, Animal Name | Patient, Patient, 患者名, 患者 |
| `date` (required) | date | Date, Invoice Date, Service Date | Datum, Date, 日付, 日期 |
| `item` (required) | text | Item, Product Name, Description, Service | Artikel, Article, 品目, 物料 |
| `amount` (required) | amount | Amount, Total, Line Total, Price | Betrag, Montant, 金額, 金额 |
| `client_name` | text (masked) | Client, Owner | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-reference-labs inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-reference-labs can remember facts about your setup so the next run does not have to be told again. `sendouts_learn` only proposes a fact; it changes nothing until a named person accepts it with `sendouts_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-reference-labs memory list
fairclinic-reference-labs memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-reference-labs memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-reference-labs demo
npx -y fairclinic-reference-labs mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-reference-labs": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-reference-labs",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-reference-labs -- npx -y fairclinic-reference-labs mcp --root .`, or install the `fairclinic-reference-labs` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-reference-labs approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-reference-labs approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-reference-labs kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-reference-labs tools                 # every tool, its policy and arguments
fairclinic-reference-labs sources               # the columns each input is read from
fairclinic-reference-labs inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-reference-labs call sendouts_check '{"lab":"<lab>","charges":"<charges>"}'
fairclinic-reference-labs eval                  # the private eval cases on the fictional fixtures
fairclinic-reference-labs demo
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
