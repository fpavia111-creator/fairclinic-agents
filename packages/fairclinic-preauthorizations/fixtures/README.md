# Fairclinic Pre-authorizations fixtures

Everything here is fictional: the practice, dentists, carriers (Example Dental PPO, Sample Mutual Dental, Demo Smile Plan, Test Dental Network), patients and ids. Measured as of 2026-11-16.

- `preauths.csv`: eleven pre-authorizations. Planted: no answer after 46 days (P302); approval running out in 15 days with nothing scheduled (P303); an approval that ran out in October (P304); a visit booked after the approval ends, approved at 60% of the request (P305); a denial (P306); a request never sent after 14 days (P307); a recent request still waiting (P308); approved and not scheduled (P309); done in time (P310); done after the approval ran out (P311). P301 is scheduled in time.
- `settings.json`: 30 days to answer, 30-day expiry warning, 5 days to send, reduced below 80%. `settings-typo.json` has a misspelt key.
