# Fairclinic Review Replies (`fairclinic-review-replies`)

Fairclinic Review Replies: online reviews that need a reply (low ratings first, and those that mention health or care details), reply drafts that thank or invite a call and never confirm the reviewer is a patient or client, and a check of any proposed reply for wording that would disclose a visit, care, records, a date or a name. One named person posts; the agent never does. Reviewer names are masked before results reach the model.

**Never posts, edits or deletes a review reply on any platform. Never sends a text, e-mail, letter or post; drafts wait for one named person. Never reports, flags or asks a platform to remove a review.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-review-replies demo
npx -y fairclinic-review-replies mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-review-replies demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Review Replies demo (fictional clinic and reviews, as of 2026-11-16)

▶ Check the files
  status: executed  decision: allow
  5 review(s), average 3.4. 3 without a reply (2 low-rated). 1 mention health or care details: replies must stay general.
    low_rating_no_reply  RV2 1 stars  mentions health details
    low_rating_no_reply  RV4 2 stars
    needs_reply          RV1 5 stars

▶ Write the worklist for the team
  status: executed  decision: allow
  Reviews to reply to written: 5 review(s), average 3.4. 3 without a reply (2 low-rated). 1 mention health or care details: replies must stay general. Files: fairclinic-out/reviews/reviews-to-reply.csv, fairclinic-out/reviews/reviews-to-reply.html.

▶ Agent tries review post itself
  status: blocked  decision: block
  reason: Never posts, edits or deletes a review reply on any platform.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `reviews_check` | Every review with its rating, a short excerpt and a status: low_rating_no_reply, needs_reply or replied, and whether it mentions health or care details. | runs |
| `reviews_check_reply` | Check reply wording for anything that would confirm the reviewer is a patient or client, mention care, records or bills, give dates, or name a reviewer or patient from the file. | runs |
| `reviews_write_report` | Write reviews-to-reply.csv (one row per item, with blank owner and decision columns for your team) and reviews-to-reply.html into out_dir (default fairclinic-out/reviews). | runs |
| `reviews_draft_reply` | Write drafts/reply-<hash>.md: a short public reply that thanks the reviewer or invites them to call, and never confirms they are a patient or client or repeats anything from the review. | asks first (Auto can be opted in) |
| `reviews_request_post` | After one named human click (even in Auto), record that the reviewed reply draft is approved in reply-requests.csv. | one named click, even in Auto (`binding_send`) |
| `reviews_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `reviews_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `reviews_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `reviews_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `review_post` | Never posts, edits or deletes a review reply on any platform. | refused |
| `message_send` | Never sends a text, e-mail, letter or post; drafts wait for one named person. | refused |
| `review_flag` | Never reports, flags or asks a platform to remove a review. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Online reviews (`reviews`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `review_id` (required) | text | Review ID, Review, ID, Review # | - |
| `platform` | text | Platform, Site, Source | - |
| `date` (required) | date | Date, Review Date, Posted, Created | Datum, Date, 日付, 日期 |
| `rating` (required) | number | Rating, Stars, Score | - |
| `reviewer_name` | text (masked) | Reviewer, Reviewer Name, Author, Name | - |
| `text` | text | Text, Review Text, Comment, Review Body | - |
| `replied` | text | Replied, Reply Date, Response Date, Owner Reply | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-review-replies inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-review-replies can remember facts about your setup so the next run does not have to be told again. `reviews_learn` only proposes a fact; it changes nothing until a named person accepts it with `reviews_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-review-replies memory list
fairclinic-review-replies memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-review-replies memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-review-replies demo
npx -y fairclinic-review-replies mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-review-replies": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-review-replies",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-review-replies -- npx -y fairclinic-review-replies mcp --root .`, or install the `fairclinic-review-replies` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-review-replies approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-review-replies approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-review-replies kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-review-replies tools                 # every tool, its policy and arguments
fairclinic-review-replies sources               # the columns each input is read from
fairclinic-review-replies inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-review-replies call reviews_check '{"reviews":"<reviews>"}'
fairclinic-review-replies eval                  # the private eval cases on the fictional fixtures
fairclinic-review-replies demo
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
