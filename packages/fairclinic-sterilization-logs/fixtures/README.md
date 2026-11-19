# Fairclinic Sterilization Logs fixtures

Everything here is fictional: the clinic, sterilizers (Autoclave A, Autoclave B) and staff initials. 2 to 13 November 2026, as of 2026-11-16. No patient data.

- `cycle-log.csv`: seventeen cycles. Planted: cycle 106 with no initials; cycle 108 missing between 107 and 109; cycle 110 failed with no passing cycle after it that day. Cycle 104 failed and was rerun (105), which is fine.
- `spore-tests.csv`: four spore tests. Planted: 13 days between Autoclave B's tests while it was in use; a positive test on 12 November with no retest logged.
- `settings.json`: a 7-day spore interval (your own schedule) and 2 days to retest. `settings-typo.json` has a misspelt key.
