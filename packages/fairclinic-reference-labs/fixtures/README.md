# Fairclinic Reference Labs fixtures

Everything here is fictional: the animal hospital, the reference lab, pets, clients, tests and costs. November 2026.

- `lab-invoice.csv`: five send-out tests. `client-charges.csv`: client invoice lines.
- Planted: a thyroid test not charged (A-9002); a urinalysis with culture charged at 1.54 times cost (A-9003); a fecal PCR panel charged below cost (A-9004); a Lyme test charged with no test on the lab invoice (Olive). The lab calls the heartworm test "HW Ag" and the invoice "Heartworm antigen test": `settings.json` maps them.
- `settings.json`: test map, markup rule 2 times, 3 days either side. `settings-typo.json` has a misspelt key.
