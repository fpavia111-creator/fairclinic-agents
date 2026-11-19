# Fairclinic PPO Fees fixtures

Everything here is fictional: the practice's fees, the plans (Example Dental PPO, Sample Mutual Dental), their fees and the patients.

- `office-fees.csv`: eight office fees.
- `ppo-schedules.csv`: the two plans' allowed amounts. Planted: Sample Mutual Dental allows 128 for an adult cleaning that the office bills at 120; Sample Mutual Dental allows 610 for a 1180 crown (a 48% write-off); Example Dental PPO lists D9110, which has no office fee; Sample Mutual Dental has no D2950.
- `allowed-paid.csv`: eleven lines the plans allowed in October. Planted: an Example Dental PPO crown allowed at 760 against its own 790; four Sample Mutual Dental cleanings capped at the office fee; a Sample Mutual Dental D2950 not in its schedule.
- `settings.json`: tolerance 0.5, deep discount above 45%. `settings-typo.json` has a misspelt key.
