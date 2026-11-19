# Fairclinic Pet Insurance Claims (`fairclinic-pet-insurance-claims`)

Fairclinic Pet Insurance Claims: where each pet insurance claim stands: information requests from the insurer, direct payments that came in below the claim, claims drafted and not submitted, claims with no decision, and denials, with open amounts by insurer. It never submits a claim or charges a client. Pet and client names are masked before results reach the model.

**Never bills or files with a pet insurer; a person does, after review. Never sends a text, e-mail, letter or post; drafts wait for one named person. Never charges a client for a balance left after insurance.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-pet-insurance-claims demo
npx -y fairclinic-pet-insurance-claims mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-pet-insurance-claims demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Pet Insurance Claims demo (fictional animal hospital, insurers, pets and clients, as of 2026-11-16) in C:\Users\fpavi\AppData\Local\Temp\fairclinic-pet-insurance-claims-demo-BfkDJk

▶ Check the files
  status: executed  decision: allow
  7 claim(s), 4 open for 3155 (1055 owed directly to the clinic). 5 to work: 1 information request(s), 1 direct payment(s) short (230 left on client accounts), 1 drafted and not submitted, 1 with no decision, 1 denied.
    info_requested     PC3 Demo Pet Cover         claimed     210  Demo Pet Cover asked for more information on a claim submitted 2026-11-06. Send the records they asked for.
    direct_pay_balance PC4 Example Pet Insurance  claimed     950  Paid 720 directly to the clinic against 950 claimed; 230 is left on the client's account. A person decides how to bill it.
    not_submitted      PC6 Demo Pet Cover         claimed     735  Drafted 14 days ago and not submitted.
    no_response        PC2 Sample Paws Mutual     claimed    1890  Submitted 32 days ago with no decision.
    denied             PC5 Sample Paws Mutual     claimed     180  Denied by Sample Paws Mutual. The client hears from the insurer; the clinic may be asked for records for an appeal.

▶ Write the worklist for the team
  status: executed  decision: allow
  Pet insurance claims written: 7 claim(s), 4 open for 3155 (1055 owed directly to the clinic). 5 to work: 1 information request(s), 1 direct payment(s) short (230 left on client accounts), 1 drafted and not submitted, 1 with no decision, 1 denied. Files: fairclinic-out/petclaims/petclaims-status.csv, fairclinic-out/petclaims/petclaims-status.html.

▶ Agent tries claim submit itself
  status: blocked  decision: block
  reason: Never bills or files with a pet insurer; a person does, after review.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `petclaims_check` | Every claim with what was claimed and paid and a status: info_requested, direct_pay_balance, not_submitted, no_response, denied, pending or paid. | runs |
| `petclaims_write_report` | Write petclaims-status.csv (one row per item, with blank owner and decision columns for your team) and petclaims-status.html into out_dir (default fairclinic-out/petclaims). | runs |
| `petclaims_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `petclaims_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `petclaims_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `petclaims_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `claim_submit` | Never bills or files with a pet insurer; a person does, after review. | refused |
| `message_send` | Never sends a text, e-mail, letter or post; drafts wait for one named person. | refused |
| `client_charge` | Never charges a client for a balance left after insurance. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Pet insurance claims (`claims`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `claim_id` (required) | text | Claim, Claim #, Claim ID, Claim Number, Reference | - |
| `client_name` | text (masked) | Client, Owner, Policyholder, Client Name | - |
| `patient_name` | text (masked) | Patient, Pet, Animal, Patient Name | Patient, Patient, 患者名, 患者 |
| `insurer` (required) | text | Insurer, Insurance, Pet Insurer, Carrier, Provider | Kostenträger, Payeur, 保険者, 付款方 |
| `invoice_number` | text | Invoice, Invoice #, Invoice Number | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `claimed` (required) | amount | Claimed, Claim Amount, Amount Claimed, Invoice Total | - |
| `created` | date | Created, Date Created, Invoice Date | - |
| `submitted` | date | Submitted, Date Submitted, Sent | - |
| `status` (required) | text | Status, Claim Status | - |
| `paid` | amount | Paid, Paid Amount, Reimbursed, Amount Paid | Bezahlt, Payé, 支払額, 已付 |
| `paid_date` | date | Paid Date, Date Paid, Payment Date | - |
| `direct_pay` | text | Direct Pay, Paid To Clinic, Vet Direct Pay, Assigned | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-pet-insurance-claims inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-pet-insurance-claims can remember facts about your setup so the next run does not have to be told again. `petclaims_learn` only proposes a fact; it changes nothing until a named person accepts it with `petclaims_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-pet-insurance-claims memory list
fairclinic-pet-insurance-claims memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-pet-insurance-claims memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-pet-insurance-claims demo
npx -y fairclinic-pet-insurance-claims mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-pet-insurance-claims": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-pet-insurance-claims",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-pet-insurance-claims -- npx -y fairclinic-pet-insurance-claims mcp --root .`, or install the `fairclinic-pet-insurance-claims` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-pet-insurance-claims approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-pet-insurance-claims approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-pet-insurance-claims kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-pet-insurance-claims tools                 # every tool, its policy and arguments
fairclinic-pet-insurance-claims sources               # the columns each input is read from
fairclinic-pet-insurance-claims inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-pet-insurance-claims call petclaims_check '{"claims":"<claims>"}'
fairclinic-pet-insurance-claims eval                  # the private eval cases on the fictional fixtures
fairclinic-pet-insurance-claims demo
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
