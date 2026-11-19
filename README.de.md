# Fairclinic-Agenten für Zahnarztpraxen und Tierarztpraxen

*Von Claude übersetzt; Prüfung durch Muttersprachler steht aus. Die englische [README](README.md) ist maßgeblich.*

Zweiunddreißig kleine MCP-Agenten für die Verwaltung einer Zahnarzt- oder Tierarztpraxis. Jeder erledigt **eine Aufgabe**, etwa offene Versicherungsfälle nach Alter ordnen, eine 835-Datei mit den Buchungen abgleichen, nie terminierte Behandlungen finden oder das Betäubungsmittelbuch mit dem Bestand vergleichen. Sie lesen Dateien, die die Praxis bereits exportiert (Dentrix, Eaglesoft, Open Dental, Curve, Denticon; AVImark, Cornerstone, ezyVet, Covetrus Pulse, Shepherd; Zahlungsavis, Kartenabrechnungen, Bank, Lohn, Bewertungen), maskieren Namen von Patienten, Tieren und Kunden, bevor ein Ergebnis das KI-Modell erreicht, schreiben Arbeitslisten auf Ihrem Rechner und warten auf eine namentlich genannte Person, bevor etwas abgerechnet, gesendet, eingereicht, erstattet oder bezahlt wird.

MIT-Lizenz · Node 20 oder neuer · nur lokale Dateien · keine Zugangsdaten · keine Abhängigkeiten · nur fiktive Testdaten

Zahnärztliche Unterlagen sind geschützte Gesundheitsdaten: Vor der Übergabe einer Datei wird mit dem Einrichter ein Auftragsverarbeitungsvertrag (Business Associate Agreement) unterzeichnet.

## Ausprobieren

```bash
npx -y fairclinic-claims-aging demo
npx -y fairclinic-controlled-drugs demo
```

Jeder Agent hat eine `demo`, ein `eval` und einen MCP-Server (`npx -y <agent> mcp --root <ordner>`). Deutsche Exporte (Spaltennamen, `1.234,56`, `03.11.2026`, Windows-1252) werden gelesen; Berichte mit `--lang de` auf Deutsch.

## Die Agenten

**Zahnärztliche Versicherung:** `fairclinic-claims-aging` (offene Fälle, Fristen), `fairclinic-era-posting` (835 gegen Buchungen), `fairclinic-preauthorizations` (Vorabgenehmigungen), `fairclinic-ppo-fees` (Honorare gegen PPO-Sätze), `fairclinic-ppo-writeoffs` (Abschreibungen).
**Zahnärztliche Patienten und Leistung:** `fairclinic-unscheduled-treatment`, `fairclinic-recall-gaps`, `fairclinic-patient-balances`, `fairclinic-membership-plans`, `fairclinic-provider-production`, `fairclinic-hygiene-production`, `fairclinic-lab-cases`, `fairclinic-sterilization-logs` (nur Lücken im Protokoll, nie eine Konformitätsaussage).
**Tierarzt, Leistungen und Apotheke:** `fairclinic-missed-charges`, `fairclinic-reference-labs`, `fairclinic-estimate-variance`, `fairclinic-boarding-grooming`, `fairclinic-staff-discounts`, `fairclinic-controlled-drugs` (Betäubungsmittelbuch gegen Zählung), `fairclinic-inventory-expiry`, `fairclinic-pharmacy-margins`.
**Tierarzt, Kunden:** `fairclinic-vaccine-reminders`, `fairclinic-wellness-plans`, `fairclinic-pet-insurance-claims`, `fairclinic-client-balances`.
**Beide:** `fairclinic-card-deposits`, `fairclinic-payroll-production`, `fairclinic-credential-expiry`, `fairclinic-referral-tracking`, `fairclinic-review-replies`, `fairclinic-no-shows`, `fairclinic-supply-costs`.

## Was sie nie tun

Nichts bei Versicherern, Tierversicherern, Behörden oder der DEA einreichen; kein Geld erstatten, belasten oder überweisen; nichts im Praxissystem ändern; keine Briefe, Nachrichten oder Antworten auf Bewertungen senden (Entwürfe warten auf den Klick einer namentlich genannten Person); keine Diagnosen, Behandlungsempfehlungen oder Aussagen darüber, ob eine Vorschrift erfüllt ist.

Prüfungen, Zahlen und offene Punkte: [REVIEW-ver1.md](REVIEW-ver1.md). Musterberichte: [sample-reports](sample-reports/index.html). Keine medizinische, rechtliche, steuerliche oder Compliance-Beratung.
