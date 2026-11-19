# Fairclinic Claims Aging fixtures

Everything here is fictional: the practice, the dentists (Dr. Ada Example, Dr. Ben Sample), the carriers (Example Dental PPO, Sample Mutual Dental, Demo Smile Plan, Test Dental Network), the patients and the claim numbers.

- `claims-outstanding.csv`: twelve claims as of 2026-11-16. Planted: a claim 74 days old with no follow-up (C1002); one followed up 6 days ago, so not due again (C1003); a Demo Smile Plan claim sent late, 2 days from its 90-day filing limit (C1004); a claim never sent 7 days after the visit (C1005); a denied claim (C1006); the same visit sent twice (C1007 and C1008); a paid primary claim with a second carrier and no secondary claim (C1009); a paid primary whose secondary was sent (C1010, C1011); a claim 348 days old, 15 days from the 365-day limit (C1012).
- `settings.json`: 30-day follow-up, 14 days between follow-ups, a 90-day filing limit for Demo Smile Plan. `settings-typo.json` has a misspelt key and is refused.
- `exports/dentrix-outstanding-claims.csv`: three claims in a Dentrix-style outstanding claims layout with US dates and a thousands separator.
- `exports/open-dental-claims.csv`: three claims from an Open Dental claim query with status letters (S sent, U unsent, R received).
