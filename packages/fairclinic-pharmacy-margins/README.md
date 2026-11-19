# Fairclinic Pharmacy Margins (`fairclinic-pharmacy-margins`)

Fairclinic Pharmacy Margins: veterinary in-house pharmacy prices against cost: items priced below cost, cost rises not passed on, margins under your target with the gap on quantities sold, and prescription items with no dispensing fee. It never changes a price.

**Never changes prices; a person makes any correction there. Never places or changes an order.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-pharmacy-margins demo
npx -y fairclinic-pharmacy-margins mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-pharmacy-margins demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Pharmacy Margins demo (fictional animal hospital price list) in C:\Users\fpavi\AppData\Local\Temp\fairclinic-pharmacy-margins-demo-RMLmCn

▶ Check the files
  status: executed  decision: allow
  7 item(s), average margin 43.63% of price. 4 to review: 1 priced below cost, 1 cost rise(s) not passed on, 2 under the target margin, 1 prescription item(s) with no dispensing fee. Gap to target on the quantities sold: 2103.64.
    below_cost            Heartworm chewable 6-pack          cost     48  price     46  margin -4.35%
    cost_rise_not_passed  Maropitant 16 mg tab               cost    9.8  price   14.5  margin 32.41%
    low_margin            Gabapentin 100 mg cap              cost   0.12  price    0.2  margin 40%
    no_dispensing_fee     Amoxicillin-clavulanate 250 mg tab cost    0.9  price    1.8  margin 50%

▶ Write the worklist for the team
  status: executed  decision: allow
  Pharmacy margins written: 7 item(s), average margin 43.63% of price. 4 to review: 1 priced below cost, 1 cost rise(s) not passed on, 2 under the target margin, 1 prescription item(s) with no dispensing fee. Gap to target on the quantities sold: 2103.64. Files: fairclinic-out/pharmacy/pharmacy-margins.csv, fairclinic-out/pharmacy/pharmacy-margins.html.

▶ Agent tries pms update itself
  status: blocked  decision: block
  reason: Never changes prices; a person makes any correction there.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `pharmacy_check` | Every item with cost, price, margin as a percent of price and, with sales, the gap to your target, with a status: below_cost, cost_rise_not_passed, low_margin, no_dispensing_fee or ok. | runs |
| `pharmacy_write_report` | Write pharmacy-margins.csv (one row per item, with blank owner and decision columns for your team) and pharmacy-margins.html into out_dir (default fairclinic-out/pharmacy). | runs |
| `pharmacy_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `pharmacy_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `pharmacy_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `pharmacy_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `pms_update` | Never changes prices; a person makes any correction there. | refused |
| `order_place` | Never places or changes an order. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Pharmacy price list (`prices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `item` (required) | text | Item, Item Name, Product, Description, Product Name | Artikel, Article, 品目, 物料 |
| `item_type` | text | Type, Rx/OTC, Category, Class | - |
| `cost` (required) | amount | Cost, Unit Cost, Current Cost, Cost Each | Stückkosten, Coût unitaire, 単価, 单位成本 |
| `previous_cost` | amount | Previous Cost, Prior Cost, Old Cost, Last Cost | - |
| `price` (required) | amount | Price, Unit Price, Sell Price, Retail Price | Einzelpreis, Prix unitaire, 単価, 单价 |
| `previous_price` | amount | Previous Price, Prior Price, Old Price | - |
| `dispensing_fee` | amount | Dispensing Fee, Rx Fee, Dispense Fee | - |

### Quantities sold (`sales`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `item` (required) | text | Item, Item Name, Product, Description | Artikel, Article, 品目, 物料 |
| `qty` (required) | number | Qty, Quantity, Units Sold, Qty Sold | Menge, Quantité, 数量, 数量 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-pharmacy-margins inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-pharmacy-margins can remember facts about your setup so the next run does not have to be told again. `pharmacy_learn` only proposes a fact; it changes nothing until a named person accepts it with `pharmacy_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-pharmacy-margins memory list
fairclinic-pharmacy-margins memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-pharmacy-margins memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-pharmacy-margins demo
npx -y fairclinic-pharmacy-margins mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-pharmacy-margins": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-pharmacy-margins",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-pharmacy-margins -- npx -y fairclinic-pharmacy-margins mcp --root .`, or install the `fairclinic-pharmacy-margins` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-pharmacy-margins approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-pharmacy-margins approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-pharmacy-margins kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-pharmacy-margins tools                 # every tool, its policy and arguments
fairclinic-pharmacy-margins sources               # the columns each input is read from
fairclinic-pharmacy-margins inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-pharmacy-margins call pharmacy_check '{"prices":"<prices>"}'
fairclinic-pharmacy-margins eval                  # the private eval cases on the fictional fixtures
fairclinic-pharmacy-margins demo
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
