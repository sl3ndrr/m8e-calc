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

## WP-02 · Verlustfreies Bearbeiten von Definitionen · 28.10.2026

Lokal umgesetzt auf `feat/audit-wp-02`, Codecommit
`e6034bd0353d0f6022a55be2448535dfeac911db`, tatsächliche Basis nach WP-01
`56cc9b03b6d04e2a26a4c8816137437aef6c92f3`. Kanonischer Quelltext mit voller
Decimal-Präzision ist von der lokalisierten Anzeige getrennt. Unverändertes
Bearbeiten erhält skalare Werte unabhängig von Editor-/Programmereinstellungen;
Funktionsbestätigung führt keinen Körper aus und erhält den AST. Listen bleiben
sichtbar/einfügbar, Bearbeiten ist mit de/en-Erklärung deaktiviert. Die WP-01-
Persistenzschutzmechanismen bleiben erhalten; Fachverträge und Regressionen sind
aktualisiert, keine Abhängigkeits-/Lockfile-/Baselineänderung.

Der strikte Engine-/Modell-Typcheck, die ergänzende originale Node-Probe sowie
Syntax-/Format-/Diffprüfungen bestehen. **Die Pflichtabnahme bleibt blockiert:**
npm 11.19.0 und `npm ci` scheitern an Registry-HTTP-403; check, Vitest, Build und
beide Produktionsbrowserauswahlen starten ihre Prüfer nicht. Keine Freigabe für
diesen lokalen Diff. PR #80 ist inzwischen gemergt und seine PR-CI grün; die
main-CI der Basis ist wegen Gallery/Quality gate rot, Pages skipped. Diese
Vorgängernachweise sind keine WP-02-Abnahme. Exakte Identitäten, Befehle,
Hypothesen, Ergebnisse, Runtimegrenzen und Offen / Folgearbeiten: [WP02.md](WP02.md).

WP-02-Fortsetzung: [Draft-PR #81](https://github.com/sl3ndrr/m8e-calc/pull/81)
ist veröffentlicht. Seine erste Pflicht-CI und AP22 scheitern an zwei neuen
Paneltests: Gruppierte Festkommaausgabe wird fälschlich im auto-Modus erwartet.
Korrekturcommit `fe4a1101d3e18614b07a6db0b23a49a44b26a8cd` wählt für diese Fälle
explizit fixed und ergänzt zwei exakte de/en-auto-Fälle. Bestehende Wert-,
ARIA-, Tastatur-, Listen- und Seiteneffektprüfungen bleiben erhalten; Produkt und
Schutzmechanismen unverändert. Ergänzende lokale Prüfungen bestehen erneut,
reguläre Installation/Tests bleiben lokal durch Registry-403 blockiert. Neuer
veröffentlichter Head und tatsächlicher CI-Abschluss werden im PR separat
festgehalten; kein Erfolg des neuen Diffs aus dem roten Originallauf abgeleitet.
Befund, Jobs und Befehle stehen im [WP02-Bericht](WP02.md).

Auf dem ersten WP-02-Korrekturhead bestehen inzwischen check auf beiden Node-
Versionen (539 UI/1702 Domänentests), die vier Paneltests und AP22. Die regulären
Browser decken einen weiteren neuen Testaufbaufehler auf: Direkter Klick auf das
native Radioinput wird von dessen sichtbarem Label abgefangen. Commit
`09eb146878c3adb55dbbaea69cafdde77c9f7b78` verwendet im kompakten Testpfad die
bestehende Fokus-/Leertastenbedienung und ergänzt Fokus-, Auswahl- und
Panelsichtbarkeitsassertions. Fachliche Assertions und Fristen bleiben erhalten;
Produkt unverändert. Der neue Head benötigt seinen eigenen vollständigen
CI-Nachweis, dokumentiert in PR #81. Einzelheiten und lokale Grenzen: [WP02](WP02.md).
