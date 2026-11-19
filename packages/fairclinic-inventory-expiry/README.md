# Fairclinic Inventory Expiry (`fairclinic-inventory-expiry`)

Fairclinic Inventory Expiry: veterinary or dental stock by lot: expired stock still on hand, stock expiring soon and lots with no expiry date, valued at cost; and shrink or overage from opening, received, used and counted. It never disposes of, returns or writes off stock.

**Never disposes of, returns or writes off stock. Never changes inventory quantities; a person makes any correction there. Never places or changes an order.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-inventory-expiry demo
npx -y fairclinic-inventory-expiry mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-inventory-expiry demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Inventory Expiry demo (fictional animal hospital stock, as of 2026-11-16)

▶ Check the files
  status: executed  decision: allow
  6 lot(s) worth 1166.8 at cost. 7 to review: 1 expired lot(s) (420), 2 expiring soon (366), 1 without an expiry date, 2 item(s) with shrink (97.4), 1 with more counted than expected.
    expired         Cefovecin 80 mg/mL 10 mL   LOT-A1  2 on hand expired on 2026-10-31 (cost 420). Set it aside under your own procedure and check for a supplier credit.
    shrink          Gabapentin 100 mg caps             Counted 500; opening 400 + received 500 - used 380 is 520: 20 unit(s) missing (cost 2.4). Check for unbilled use, breakage or entry errors.
    shrink          Maropitant 10 mg/mL 20 mL          Counted 3; opening 4 + received 2 - used 2 is 4: 1 unit(s) missing (cost 95). Check for unbilled use, breakage or entry errors.
    expiring        Carprofen 75 mg tabs       LOT-C7  180 on hand expire in 34 day(s) (2026-12-20), cost 81. Use first or ask about a return.
    expiring        Maropitant 10 mg/mL 20 mL  LOT-M2  3 on hand expire in 50 day(s) (2027-01-05), cost 285. Use first or ask about a return.
    overage         Ear cleanser 4 oz                  Counted 24, 2 more than the 22 expected; a receipt or a return may be missing from the records.
    no_expiry_date  Ear cleanser 4 oz                  On hand with no expiry date recorded for this lot.

▶ Write the worklist for the team
  status: executed  decision: allow
  Inventory expiry and shrink written: 6 lot(s) worth 1166.8 at cost. 7 to review: 1 expired lot(s) (420), 2 expiring soon (366), 1 without an expiry date, 2 item(s) with shrink (97.4), 1 with more counted than expected. Files: fairclinic-out/inventory/inventory-expiry.csv, fairclinic-out/inventory/inventory-expiry.html.

▶ Agent tries stock dispose itself
  status: blocked  decision: block
  reason: Never disposes of, returns or writes off stock.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `inventory_check` | Every lot with days to expiry and value at cost, and every counted item with expected against counted, with a status: expired, shrink, expiring, overage, no_expiry_date or ok. | runs |
| `inventory_write_report` | Write inventory-expiry.csv (one row per item, with blank owner and decision columns for your team) and inventory-expiry.html into out_dir (default fairclinic-out/inventory). | runs |
| `inventory_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `inventory_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `inventory_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `inventory_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `stock_dispose` | Never disposes of, returns or writes off stock. | refused |
| `pms_update` | Never changes inventory quantities; a person makes any correction there. | refused |
| `order_place` | Never places or changes an order. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Stock on hand by lot (`stock`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `item` (required) | text | Item, Item Name, Product, Description, Product Name | Artikel, Article, 品目, 物料 |
| `lot` | text | Lot, Lot Number, Lot #, Batch | Charge, Lot, ロット, 批次 |
| `expiry` | date | Expiry, Expiration Date, Expires, Exp Date, Best Before | Mindesthaltbarkeitsdatum, Date de péremption, 賞味期限, 有效期 |
| `on_hand` (required) | number | On Hand, Quantity On Hand, Qty On Hand, Qty, Quantity | Bestand, Stock, 在庫数, 库存数量 |
| `unit_cost` | amount | Unit Cost, Cost, Cost Each, Avg Cost | Stückkosten, Coût unitaire, 単価, 单位成本 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Covetrus Pulse | Inventory on hand with lots, exported to CSV | Item Name, Lot Number, Expiration Date, Quantity On Hand | no |

Where a layout says "checked", its column names were compared with the publisher's template or documentation on that date (the CMS price-transparency templates, the pfs.data.cms.gov column lists and Open Dental's published procedure log fields). The NCCI, MUE and RVU file headers and the other practice-management and clearinghouse layouts were written from knowledge of the export and were not checked; where the vendor's public help says something about the export, the layout's note says what. None was tested against a live account.

### Count sheet (`counts`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `item` (required) | text | Item, Item Name, Product, Description | Artikel, Article, 品目, 物料 |
| `opening` (required) | number | Opening, Start Qty, Beginning, Opening Qty | - |
| `received` | number | Received, Purchased, Qty Received | - |
| `used` | number | Used, Sold, Dispensed, Qty Used, Sold/Dispensed | - |
| `counted` (required) | number | Counted, Count, Physical Count, Closing Count | Gezählt, Quantité comptée, 実棚数, 盘点数量 |
| `unit_cost` | amount | Unit Cost, Cost, Cost Each, Avg Cost | Stückkosten, Coût unitaire, 単価, 单位成本 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-inventory-expiry inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-inventory-expiry can remember facts about your setup so the next run does not have to be told again. `inventory_learn` only proposes a fact; it changes nothing until a named person accepts it with `inventory_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-inventory-expiry memory list
fairclinic-inventory-expiry memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-inventory-expiry memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-inventory-expiry demo
npx -y fairclinic-inventory-expiry mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-inventory-expiry": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-inventory-expiry",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-inventory-expiry -- npx -y fairclinic-inventory-expiry mcp --root .`, or install the `fairclinic-inventory-expiry` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-inventory-expiry approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-inventory-expiry approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-inventory-expiry kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-inventory-expiry tools                 # every tool, its policy and arguments
fairclinic-inventory-expiry sources               # the columns each input is read from
fairclinic-inventory-expiry inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-inventory-expiry call inventory_check '{"stock":"<stock>"}'
fairclinic-inventory-expiry eval                  # the private eval cases on the fictional fixtures
fairclinic-inventory-expiry demo
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
