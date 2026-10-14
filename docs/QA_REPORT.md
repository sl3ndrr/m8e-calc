# Qualitätsbericht · AP15 Hardening

Stand: 14.10.2026. Ausgangspunkt: `67d9c9688d1cc7169a73262b21e738ff09c8bcda`.
Keine neuen Produktfunktionen. Befund vor Änderungen erhoben.

## Messverfahren und Grenzen

Vorher: tatsächlicher erfolgreicher [CI-Lauf 38551606782](https://github.com/sl3ndrr/m8e-calc/actions/runs/38551606782),
Job 115810645754, Node 24, Ubuntu, Produktionsbuild mit Standard-Base.
Neue Prüfungen müssen auch gegen diesen festgehaltenen Ausgangsstand laufen.
Ein eingerichteter Test ist kein erfolgreicher Testlauf. Nicht erhobene Werte bleiben offen.

Die Arbeitsumgebung blockiert Git-Klonen und npm-Tarballs (HTTP 403,
`zustand-5.0.15.tgz`). Quellen werden über den GitHub-Connector gelesen.
Deshalb sind lokale Browser-/Lighthouse-/Audit-Werte zunächst nicht messbar.
Die vorhandenen CI-Ergebnisse sind belegte Ausgangswerte, keine erneute lokale Abnahme.

## Vorher / Nachher

| Prüfung | Vorher | Nachher |
| --- | --- | --- |
| Bestehender Gesamtcheck | grün; 50 Dateien, 1.978 Tests | ausstehend |
| Bestehende Browserprüfungen | 81 Chromium-E2E bestanden | ausstehend |
| Entry-JavaScript (Vite gzip, nur Entry) | 309,47 kB; Budget bereits dadurch verletzt | ausstehend |
| Editor / KaTeX | eigene lazy Chunks: 115,36 / 77,41 kB gzip | ausstehend |
| Initiales JS inkl. statischer Imports + Einfach-Modus | noch nicht separat gemessen; >309,47 kB | ausstehend |
| npm-Installationsaudit | 1 Schwachstelle, niedrig (CI-Installationsausgabe); vollständiges Audit offen | ausstehend |
| axe: 4 Modi × 2 Themen × 3 Akzente | keine vollständige Matrix vorhanden | ausstehend |
| Kontrast: 16 Seeds × 4 Varianten × 3 Stufen × 2 Themen | Test nutzt 5 Seeds und nur Teilmenge der Rollenpaare | ausstehend |
| Lighthouse Performance / Accessibility / Best Practices | nicht erhoben | ausstehend |
| Firefox / WebKit | keine Projekte konfiguriert | ausstehend |
| Visuelle Regression | PNG-Aufnahmen vorhanden; kein `toHaveScreenshot`-Vergleich | ausstehend |
| INP / CLS / Ressourcen über Moduswechsel | keine systematische Prüfung | ausstehend |
| CSP-Meta | fehlt | ausstehend |
| Modus-Fehlergrenzen / globale Fehler-Snackbar | fehlen | ausstehend |

## Priorisierter Befund

| ID | Priorität | Befund vor Änderung | Status |
| --- | --- | --- | --- |
| QA-01 | P1 | Unbehandelter Render-/Lazy-Fehler kann gesamte App entfernen; kein lokaler Reset | offen |
| QA-02 | P1 | Keine CSP für statisches Pages-Hosting | offen |
| QA-03 | P1 | Entry allein überschreitet 200 kB gzip. Shell importiert Palette, Konvertermodell und Permalink-Validatoren mit Graph-Domäne eager | offen |
| QA-04 | P1 | Kontrastmatrix erfasst weder alle Seed-Presets noch alle tatsächlich verwendeten Surface-/Text-Paare | offen |
| QA-05 | P1 | Keine abgesicherte vollständige Tastatur-/200%-/Browser-Matrix | offen |
| QA-06 | P2 | PWA-`updatefound`- und Worker-`statechange`-Listener werden beim Unmount nicht entfernt | offen |
| QA-07 | P2 | JS-Theme-Animation übergibt `linear()` ohne Feature-Erkennung; kann in älteren Browsern werfen | offen |
| QA-08 | P2 | Nur Screenshot-Erzeugung, keine deterministischen Regressionsvergleiche | offen |
| QA-09 | P2 | Graph-Analysemarker besitzen keine dauerhafte Live-Region | offen |
| QA-10 | P2 | Fehlende messbare Lighthouse-/JS-/INP-/CLS-/Leak-Budgets | offen |

## Offen / Folge-Issues

- P1: Alle Nachher-Werte durch tatsächlich abgeschlossene Läufe ersetzen.
- P1: Produktionsabnahme erst **nach Merge und erfolgreichem Pages-Deployment**:
  https://sl3ndrr.github.io/m8e-calc/ . PR nicht automatisch mergen (AGENTS.md).
  Vier Modi, Berechnungen/Fehler, Palette, Verlauf, Dialogfokus, Themes, Reload,
  Offline und lokale Assetpfade manuell prüfen; konkrete Abweichungen mit
  Browser, Deploy-SHA, Reproduktionsschritten und erwartetem Verhalten als Issues melden.
- P2: Physische GPU-/4K- und Screenreader-Abnahme bleibt von Headless-Messungen getrennt.
