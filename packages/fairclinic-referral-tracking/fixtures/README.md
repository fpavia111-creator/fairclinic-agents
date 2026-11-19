# Fairclinic Referral Tracking fixtures

Everything here is fictional: the practice, the specialists, the referring doctor (Dr. Mara Referring), the patients and amounts. As of 2026-11-16.

- `referrals-out.csv`: four referrals sent. Planted: no report back after 46 days (Sample Oral Surgery) and after 93 days (Sample Orthodontics). One report came back; one referral is recent.
- `referrals-in.csv`: five referrals received. Planted: a website referral never seen after 46 days; a patient referred by Dr. Mara Referring, seen, with no thank-you recorded. A client referral is recent; two are fine.
- `settings.json`: 30 days for a report, 21 days for a first visit. `settings-typo.json` has a misspelt key.
