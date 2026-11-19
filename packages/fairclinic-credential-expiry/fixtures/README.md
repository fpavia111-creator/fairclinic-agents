# Fairclinic Credential Expiry fixtures

Everything here is fictional: the practice, people, boards, the insurer and every number (none is a real licence or DEA registration). As of 2026-11-16. No patient data.

- `credentials.csv`: eight credentials. Planted: a dental licence that expired on 31 October (Dr. Ben Sample); a DEA registration expiring in 45 days with no renewal submitted (Dr. Ada Example); malpractice insurance expiring in 29 days; 18 of 30 CE hours with the licence renewing in 135 days (Dr. Ada Example); a radiation registration with no expiry date. Dr. Cora Example's DEA renewal has been submitted; her state licence and Hana Test's licence are fine (Hana's renewal is more than 180 days away, so CE is not checked yet).
- `settings.json`: 90-day warning, CE checked within 180 days. `settings-typo.json` has a misspelt key.
