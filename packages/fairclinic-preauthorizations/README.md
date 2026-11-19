# Fairclinic Preauthorizations (`fairclinic-preauthorizations`)

Fairclinic Pre-authorizations: dental pre-authorizations and pre-treatment estimates that need a person: no answer from the carrier, approved but not scheduled, expiring or expired before the work is done, scheduled or done after the approval ran out, reduced or denied, or never sent. Patient names are masked before results reach the model.

**Never bills or files with a dental carrier; a person does, after review. Never changes appointments or treatment plans; a person makes any correction there. Never diagnoses, recommends treatment or tells a patient or client what care to have.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-preauthorizations demo
npx -y fairclinic-preauthorizations mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-preauthorizations demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Pre-authorizations demo (fictional dental practice, carriers and patients, as of 2026-11-16)

▶ Check the files
  status: executed  decision: allow
  11 pre-authorization(s), 8 need a person: 1 expired (155), 1 expiring, 1 with no answer, 1 denied, 1 not sent, 1 reduced. Approved and at risk: 2430.
    no_response            P302  D4341        -  no_response
    expiring               P303  D6010     1200  expiring, approved_unscheduled
    expired                P304  D2950      155  expired
    scheduled_after_expiry P305  D2750      330  scheduled_after_expiry, reduced
    denied                 P306  D7240        -  denied
    not_sent               P307  D2391        -  not_sent
    approved_unscheduled   P309  D5110      900  approved_unscheduled
    done_after_expiry      P311  D2950      155  done_after_expiry

▶ Write the worklist for the team
  status: executed  decision: allow
  Pre-authorizations to work written: 11 pre-authorization(s), 8 need a person: 1 expired (155), 1 expiring, 1 with no answer, 1 denied, 1 not sent, 1 reduced. Approved and at risk: 2430. Files: fairclinic-out/preauth/preauth-worklist.csv, fairclinic-out/preauth/preauth-worklist.html.

▶ Agent tries claim submit itself
  status: blocked  decision: block
  reason: Never bills or files with a dental carrier; a person does, after review.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `preauth_check` | Every pre-authorization with a status: done_after_expiry, expired, scheduled_after_expiry, denied, expiring, no_response, approved_unscheduled, not_sent, reduced, pending or ok, with the reason and the approved amount… | runs |
| `preauth_explain` | One pre-authorization with its dates, amounts and each finding in plain words. | runs |
| `preauth_write_report` | Write preauth-worklist.csv (one row per item, with blank owner and decision columns for your team) and preauth-worklist.html into out_dir (default fairclinic-out/preauth). | runs |
| `preauth_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `preauth_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `preauth_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `preauth_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `claim_submit` | Never bills or files with a dental carrier; a person does, after review. | refused |
| `pms_update` | Never changes appointments or treatment plans; a person makes any correction there. | refused |
| `clinical_advice` | Never diagnoses, recommends treatment or tells a patient or client what care to have. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Pre-authorizations and pre-treatment estimates (`preauths`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `preauth_id` (required) | text | Pre-auth #, Preauth ID, Predetermination #, Pre-D #, Pre-Treatment #, Estimate # | - |
| `patient_name` | text (masked) | Patient, Patient Name | Patient, Patient, 患者名, 患者 |
| `payer` | text | Carrier, Carrier Name, Insurance, Payer | Kostenträger, Payeur, 保険者, 付款方 |
| `provider` | text | Provider, Dentist, Treating Provider | Leistungserbringer, Prestataire, 医師, 医生 |
| `code` | text | Procedure, Code, CDT, CDT Code, Proc Code | - |
| `fee` | amount | Fee, Office Fee, Procedure Fee | Betrag, Montant, 請求額, 金额 |
| `requested` | amount | Requested, Est. Insurance, Estimate, Est Ins, Expected Insurance | - |
| `created` | date | Created, Date Created, Entry Date, Date Planned | - |
| `date_sent` | date | Date Sent, Sent, Sent Date, Submitted | - |
| `status` | text | Status, Pre-auth Status, Determination | - |
| `response_date` | date | Response Date, Date Received, Determination Date, Received | - |
| `approved_amount` | amount | Approved Amount, Approved, Ins Approved, Allowed Benefit | - |
| `valid_until` | date | Valid Until, Expires, Expiration Date, Approval Expires, Good Through | Ablaufdatum, Date d'expiration, 有効期限, 到期日 |
| `scheduled_date` | date | Scheduled, Scheduled Date, Appointment, Next Appt, Appt Date | - |
| `completed_date` | date | Completed, Date Completed, Completed Date | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-preauthorizations inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-preauthorizations can remember facts about your setup so the next run does not have to be told again. `preauth_learn` only proposes a fact; it changes nothing until a named person accepts it with `preauth_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-preauthorizations memory list
fairclinic-preauthorizations memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-preauthorizations memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-preauthorizations demo
npx -y fairclinic-preauthorizations mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-preauthorizations": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-preauthorizations",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-preauthorizations -- npx -y fairclinic-preauthorizations mcp --root .`, or install the `fairclinic-preauthorizations` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-preauthorizations approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-preauthorizations approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-preauthorizations kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-preauthorizations tools                 # every tool, its policy and arguments
fairclinic-preauthorizations sources               # the columns each input is read from
fairclinic-preauthorizations inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-preauthorizations call preauth_check '{"preauths":"<preauths>"}'
fairclinic-preauthorizations eval                  # the private eval cases on the fictional fixtures
fairclinic-preauthorizations demo
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
