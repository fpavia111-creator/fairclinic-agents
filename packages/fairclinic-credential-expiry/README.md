# Fairclinic Credential Expiry (`fairclinic-credential-expiry`)

Fairclinic Credential Expiry: dental and veterinary licences, DEA registrations, state permits, radiation registrations and malpractice insurance: expired, expiring with no renewal submitted, missing expiry dates, and CE hours short of what the next renewal needs. It never files a renewal or contacts a board, the DEA or an insurer.

**Never files or reports anything to a licensing board, the DEA or an insurer. Never pays an invoice, a person or a supplier. Never sends a text, e-mail, letter or post; drafts wait for one named person.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-credential-expiry demo
npx -y fairclinic-credential-expiry mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-credential-expiry demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Credential Expiry demo (fictional practice, people and credentials, as of 2026-11-16) in C:\Users\fpavi\AppData\Local\Temp\fairclinic-credential-expiry-demo-LCBfkF

▶ Check the files
  status: executed  decision: allow
  8 credential(s) for 5 holder(s); next expiry 2026-12-15. 5 to act on: 1 expired, 2 expiring with no renewal submitted, 1 with no expiry date, 1 short of CE hours; 1 renewal(s) waiting.
    expired           Dr. Ben Sample     State dental license               2026-10-31
    expiring          Dr. Ben Sample     Malpractice insurance              2026-12-15
    expiring          Dr. Ada Example    DEA registration                   2026-12-31
    missing_expiry    Bright Example Dental Radiation equipment registration   -
    ce_short          Dr. Ada Example    State dental license               2027-03-31
    renewal_submitted Dr. Cora Example   DEA registration                   2027-01-31

▶ Write the worklist for the team
  status: executed  decision: allow
  Credential expiries written: 8 credential(s) for 5 holder(s); next expiry 2026-12-15. 5 to act on: 1 expired, 2 expiring with no renewal submitted, 1 with no expiry date, 1 short of CE hours; 1 renewal(s) waiting. Files: fairclinic-out/credentials/credentials-expiry.csv, fairclinic-out/credentials/credentials-expiry.html.

▶ Agent tries regulator file itself
  status: blocked  decision: block
  reason: Never files or reports anything to a licensing board, the DEA or an insurer.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `credentials_check` | Every licence, registration, permit and policy with days to expiry, renewal and CE hours, and a status: expired, expiring, missing_expiry, ce_short, renewal_submitted or ok. | runs |
| `credentials_write_report` | Write credentials-expiry.csv (one row per item, with blank owner and decision columns for your team) and credentials-expiry.html into out_dir (default fairclinic-out/credentials). | runs |
| `credentials_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `credentials_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `credentials_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `credentials_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `regulator_file` | Never files or reports anything to a licensing board, the DEA or an insurer. | refused |
| `payment_send` | Never pays an invoice, a person or a supplier. | refused |
| `message_send` | Never sends a text, e-mail, letter or post; drafts wait for one named person. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Credentials (`credentials`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `holder` (required) | text | Holder, Person, Provider, Name, Staff, Entity | - |
| `role` | text | Role, Position, Title | Rolle, Rôle, ロール, 角色 |
| `credential` (required) | text | Credential, Type, License Type, Document, Item | - |
| `credential_number` | text | Number, License #, Registration #, Policy #, Credential Number | - |
| `issuer` | text | Issuer, Board, Agency, State, Carrier | Aussteller, Émetteur, 発行者, 颁发者 |
| `expires` | date | Expires, Expiration Date, Expiry, Valid Until, Renewal Date | Ablaufdatum, Date d'expiration, 有効期限, 到期日 |
| `renewal_submitted` | date | Renewal Submitted, Renewal Sent, Applied | - |
| `ce_required` | number | CE Required, CE Hours Required, Required Hours | - |
| `ce_done` | number | CE Done, CE Hours, CE Completed, Hours Completed | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-credential-expiry inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-credential-expiry can remember facts about your setup so the next run does not have to be told again. `credentials_learn` only proposes a fact; it changes nothing until a named person accepts it with `credentials_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-credential-expiry memory list
fairclinic-credential-expiry memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-credential-expiry memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-credential-expiry demo
npx -y fairclinic-credential-expiry mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-credential-expiry": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-credential-expiry",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-credential-expiry -- npx -y fairclinic-credential-expiry mcp --root .`, or install the `fairclinic-credential-expiry` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-credential-expiry approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-credential-expiry approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-credential-expiry kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-credential-expiry tools                 # every tool, its policy and arguments
fairclinic-credential-expiry sources               # the columns each input is read from
fairclinic-credential-expiry inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-credential-expiry call credentials_check '{"credentials":"<credentials>"}'
fairclinic-credential-expiry eval                  # the private eval cases on the fictional fixtures
fairclinic-credential-expiry demo
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
