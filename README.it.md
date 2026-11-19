# Agenti Fairclinic per studi dentistici e cliniche veterinarie

*Tradotto da Claude; revisione da parte di un madrelingua in sospeso. Fa fede la [README](README.md) in inglese.*

Trentadue piccoli agenti MCP per l’amministrazione di uno studio dentistico o di una clinica veterinaria. Ognuno fa **un solo lavoro**: ordinare per anzianità le pratiche assicurative aperte, confrontare un file 835 con le registrazioni, trovare cure mai prenotate, confrontare il registro degli stupefacenti con il conteggio. Leggono i file che la clinica già esporta (Dentrix, Eaglesoft, Open Dental, Curve, Denticon; AVImark, Cornerstone, ezyVet, Covetrus Pulse, Shepherd; avvisi di pagamento, lotti di carte, banca, paghe, recensioni), mascherano i nomi di pazienti, animali e clienti prima che il modello di IA veda un risultato, scrivono elenchi di lavoro sul vostro computer e attendono una persona indicata per nome prima di fatturare, inviare, presentare, rimborsare o pagare qualsiasi cosa.

Licenza MIT · Node 20 o successivo · solo file locali · nessuna credenziale · nessuna dipendenza · solo dati di prova fittizi

Le cartelle odontoiatriche sono dati sanitari protetti: prima di ricevere qualsiasi file si firma un accordo di responsabile del trattamento (business associate agreement).

## Provare

```bash
npx -y fairclinic-claims-aging demo
npx -y fairclinic-controlled-drugs demo
```

Ogni agente ha `demo`, `eval` e un server MCP (`npx -y <agente> mcp --root <cartella>`). Si leggono esportazioni italiane (nomi di colonna, `1.234,56`, date giorno/mese); rapporti in italiano con `--lang it`.

## Gli agenti

**Assicurazione dentale:** `fairclinic-claims-aging`, `fairclinic-era-posting`, `fairclinic-preauthorizations`, `fairclinic-ppo-fees`, `fairclinic-ppo-writeoffs`.
**Pazienti e produzione dentale:** `fairclinic-unscheduled-treatment`, `fairclinic-recall-gaps`, `fairclinic-patient-balances`, `fairclinic-membership-plans`, `fairclinic-provider-production`, `fairclinic-hygiene-production`, `fairclinic-lab-cases`, `fairclinic-sterilization-logs` (solo lacune nei registri, mai un giudizio di conformità).
**Veterinaria, prestazioni e farmacia:** `fairclinic-missed-charges`, `fairclinic-reference-labs`, `fairclinic-estimate-variance`, `fairclinic-boarding-grooming`, `fairclinic-staff-discounts`, `fairclinic-controlled-drugs`, `fairclinic-inventory-expiry`, `fairclinic-pharmacy-margins`.
**Veterinaria, clienti:** `fairclinic-vaccine-reminders`, `fairclinic-wellness-plans`, `fairclinic-pet-insurance-claims`, `fairclinic-client-balances`.
**Entrambe:** `fairclinic-card-deposits`, `fairclinic-payroll-production`, `fairclinic-credential-expiry`, `fairclinic-referral-tracking`, `fairclinic-review-replies`, `fairclinic-no-shows`, `fairclinic-supply-costs`.

## Cosa non fanno mai

Non presentano nulla ad assicurazioni, assicurazioni per animali, autorità o alla DEA; non rimborsano, addebitano né pagano; non modificano il gestionale della clinica; non inviano lettere, messaggi o risposte pubbliche (le bozze attendono il clic di una persona indicata); non fanno diagnosi, non consigliano cure né stabiliscono se una regola è rispettata.

Controlli, numeri e punti aperti: [REVIEW-ver1.md](REVIEW-ver1.md). Rapporti di esempio: [sample-reports](sample-reports/index.html). Non è consulenza medica, legale, fiscale o di conformità.
