# Implementierungsstatus

## WP-01 · Wissenschaftliche Persistenz · 27.–28.10.2026

Lokal umgesetzt auf `feat/audit-wp-01`, Codecommit
`b2e09dab2e028a336041171defc1664b560d64b0`, Ausgangs-main
`de0fcd0a0846f56226e148c14f7b3bf5d1cb387f`.

Strukturelle Environment-Validierung ohne Auswertung erhält normale Namen,
Programmer-Funktionskörper, alle Wertarten und die wissenschaftliche ans-Historie.
Kontextkonflikte liefern kontrollierte Fehler. Fehlerhafte, zu große oder nicht
lesbare Altbestände sperren automatische Schreibzugriffe; Original und zuletzt
speicherbarer Bestand bleiben erhalten. Eine de/en-Meldung erklärt die nur in der
Sitzung gültigen Änderungen und bietet ausdrückliches erneutes Laden mit
Fokusrückgabe an. Fachverträge und Engine-/Store-/UI-/Browserregressionen ergänzt.

Die isolierte Node-Probe bestätigt den ursprünglichen Datenverlust und besteht
mit dem Fix; Engine-Typprüfung, begrenzte Modell-/Store-Typprüfung, Syntax- und
Formatprüfungen bestehen. **Die verbindliche Abnahme ist blockiert:** npm 11.19.0
und `npm ci` scheitern an Registry-HTTP-403. `check`, Vitest, Produktionsbuild und
Playwright starten deshalb nicht. Keine PR-CI, main-CI, Pages- oder Live-Freigabe
für diesen Diff. Vollständige Identitäten, Befehle, Grenzen und Offen / Folgearbeiten:
[WP01.md](WP01.md).

Fortsetzung vom 28.10.: Auf Testcommit
`68be8302ca06dbf0e4e12e85f464a3796cdc4299` sind zusätzlich Store-Neuerzeugung
mit Funktions-/Parameterkonflikten und erfolgreicher Browser-Retry samt
Editorfokus, unverändertem Reparaturbestand und erneutem Reload abgedeckt.
Produktcode und Lockfile bleiben unverändert. Erweiterte Node-Probe und die
begrenzten Prüfungen bestehen erneut; die regulären Tests starten wegen der
erneut bestätigten Registry-403 weiterhin nicht. Keine neue Abnahmefreigabe.

Auf ausdrücklichen Folgeauftrag ist [Draft-PR #80](https://github.com/sl3ndrr/m8e-calc/pull/80)
erstellt. Die erste PR-CI konnte regulär installieren und scheiterte an
`prefer-const` für den verzögert initialisierten Fehlerreporter. Lokaler
Korrekturcommit `926c369f3e0337bb7f82eeff66468b787ff26eb3` verwendet dort
`const`; Regeln und Assertions bleiben unverändert. Die zusätzliche lokale Probe
und begrenzten Prüfungen bestehen; die vollständige CI des neuen PR-Stands
bleibt separat abzunehmen. Keine Merge-/Deployfreigabe.
