# AP39 · Begrenzte CI-/Pages-Reparaturen

## Auftrag und Integrationsstand

Der Eigentümer beauftragte am 19.10.2026 ausdrücklich die Behebung der
aufgetretenen Probleme und den Merge von AP39. Der reine Dokumentations-PR
[#57](https://github.com/sl3ndrr/m8e-calc/pull/57) wurde nach erfolgreicher
CI `39210727047` als `5ee358c8fef67c3a6d2b704e47a2186076ff6631` integriert.
Die historischen roten main-/Live-Befunde in [AP39](AP39.md) bleiben erhalten.
Die hier beschriebenen Reparaturen werden getrennt in
[#58](https://github.com/sl3ndrr/m8e-calc/pull/58) geprüft und integriert.

Kein neuer Produktumfang, keine Dependency-/Lockfilemigration, kein geändertes
Rechenergebnis und keine Abschwächung von Performance-, Accessibility-,
Screenshot-, Timeout- oder Qualitätsgrenzen. AP34–AP36 bleiben vertagt.
Tag und GitHub Release sind nicht beauftragt.

## #56 · Deploy nach erlaubtem Vorgänger-Skip

Ausgangsbefund: [main 39145372222](https://github.com/sl3ndrr/m8e-calc/actions/runs/39145372222)
auf `3384c0d5a0470c0b0da6eb783851c4b40c4ad644`: alle Pflichtjobs und
Quality gate erfolgreich, Deploy Pages dennoch ohne Schritte übersprungen.
`currency-source` wird auf main absichtlich übersprungen. Der Aggregator
akzeptiert genau diesen Skip mit `always()`, Deploy besaß dagegen keine
explizite Statusfunktion und erbte die implizite `success()`-Prüfung.

GitHub dokumentiert die implizite Statusprüfung und die Weitergabe von Skips
über eine needs-Kette in den Primärquellen:
[Statusfunktionen](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions)
und [Jobabhängigkeiten](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs).

Der begrenzte tatsächliche
[GitHub-Diagnoselauf 39225532451](https://github.com/sl3ndrr/m8e-calc/actions/runs/39225532451)
auf Head `36224a20bc89fac4f16af1695bbf04d865de743b` reproduziert diese
Schedulerwirkung ohne Veröffentlichung:

- `skipped-source` wird absichtlich übersprungen.
- `aggregate` läuft mit `always()` und bestätigt diesen erlaubten Skip.
- `original-condition` mit bloßer Prüfung des erfolgreichen Aggregators:
  **skipped**, Job `117970819896`.
- `fixed-condition` mit `!cancelled()` und derselben Erfolgsprüfung:
  **success**, Job `117970817531`.
- `assert-skip-regression`: **success**, Job `117970858803`;
  beide tatsächlichen Jobresultate werden geprüft, kein Deploy aufgerufen.

Korrektur in `ci.yml`: explizit `!cancelled()`, weiterhin ausschließlich
upstream-main-Push und erfolgreiches Quality gate, zusätzlich explizit
erfolgreiches `pages-package`. Kein allgemeines `always()` für Veröffentlichung.
Der vorhandene zweite Kontext-/Aktualitätscheck direkt vor dem Deploy bleibt
unverändert. Rechte, Serialisierung, SHA-/Laufversuchs-/Fingerprintbindung,
TAR-Prüfsumme und der bestehende Pages-Aufruf bleiben erhalten.

`scripts/ci/deploy-condition.test.mjs` liest die tatsächliche YAML-Bedingung.
Es prüft den erlaubten Skip und lehnt Workflowabbruch, fehlgeschlagene,
abgebrochene, übersprungene oder fehlende direkte Voraussetzungen sowie
PR/workflow_run, fremden Ref und Fork ab. Es modelliert nur die dokumentierte
Status-Voreinstellung; der oben genannte echte GitHub-Lauf ist der gesonderte
Schedulerbeleg. Die bestehenden Tests für veraltetes main, fremde Artefakte,
falsche Bytes und Laufversuche bleiben aktiv.

Vor der Korrektur scheitern beide neuen Bedingungstests: erlaubtes main wird
abgewiesen und die Abbruchsperre fehlt. Nach der Korrektur bestehen sie.
Ein erfolgreicher echter main-/Pages-Lauf nach Merge bleibt der abschließende
Veröffentlichungsnachweis; seine konkrete Identität wird im PR/Issue nachgetragen.

## #55 · Unnötige globale DOM-Suche im ScientificMode-Test

Der historische Timeout in `ScientificMode.test.tsx:44` wird nicht rückwirkend
als Produktfehler oder als geklärte Runnerursache bezeichnet. Die unveränderte
isolierte CI-Baseline im
[Diagnoselauf 39225177895](https://github.com/sl3ndrr/m8e-calc/actions/runs/39225177895),
Job `117969594845`, bestand alle drei Fälle, brauchte für den betroffenen
Lebenszyklus aber bereits **3829 ms** des bestehenden **5000-ms-Limits**.

Eine einzelne lokale Vorher-/Nachher-Profilierung unter Node 24.19.0 mit
denselben aus regulärem CI-npm-ci stammenden Lockfile-Abhängigkeiten erfasst
Render, Editorbereitschaft, jede Rollensuche und jeden Klick getrennt.
Keine Auswahl des besten Versuchs und keine Test-Retries:

- Vorher: globale Suchen nach Auswerten/Variablen/Bearbeiten/Löschen
  478,206 / 262,524 / 432,323 / 433,806 ms; zusammen **1606,859 ms**.
  Der gesamte erste Fall dauert **3374 ms**.
- Nachher: dieselben Suchen in den zugehörigen Bedienbereichen
  23,455 / 96,587 / 22,706 / 19,870 ms; zusammen **162,618 ms**.
  Der gesamte erste Fall dauert **2019 ms**. Render- und Editorbereitschaft
  waren in dieser Probe sogar langsamer; die Suchersparnis wird getrennt belegt.

Die große wissenschaftliche Oberfläche enthält auch Konstanten und
Programmiererwerkzeuge. Globale Button-Rollensuchen prüfen unnötig deren
zugängliche Namen und Sichtbarkeit mit. Der Test verwendet jetzt `within`
für den vorhandenen Ausdrucksartikel, die benannte Bedienfeld-Radiogruppe
und die benannte Variablenregion. Der Editor wird weiterhin tatsächlich
asynchron erwartet. Ein fehlender Ausdrucksartikel erzeugt einen klaren Fehler.
Auch die Auswerten-Suche im Vorschau-/Fehlerfall bleibt im Ausdrucksartikel.

Alle bisherigen Interaktionen und Assertions bleiben erhalten: Definition
auswerten, Environment und persistierte History/LaTeX prüfen, Variablenfeld
öffnen, Definition bearbeiten und löschen; außerdem Debounce, Vorschau,
Divisionsfehler, englische Metadaten und Informatik-Panel. Keine Mocks für
Button-/Variablenverhalten, kein globales `hidden: true`, keine entfernten
Sichtbarkeitsprüfungen, kein Testsplit oder längeres Timeout.

Der anschließende uninstrumentierte lokale Lauf besteht **3/3** ohne Skips:
2229 / 3162 / 1370 ms. Die begrenzten Messungen belegen beseitigte Suchkosten,
keine universelle Laufzeitgarantie und keine exklusive historische Timeoutursache.
Die regulären finalen PR-/main-Gates müssen ihre eigenen Ergebnisse liefern.

## Beschädigte Projektregeln und Abschlussprüfung

`AGENTS.md` enthielt bereits auf main den wörtlichen Marker
`Li…738 tokens truncated…barer` statt der vollständigen Abschnitte AP20–AP25.
Das vorhandene Source-Artefakt bestätigt die Beschädigung unabhängig vom
angezeigten Tooltext. AP20/AP22/AP23/AP24 werden aus dem vollständigen
historischen Stand `de6b502b8f49e9f3d44064460e56f19f2f3682fc` wiederhergestellt;
AP25 wird aus seinem dokumentierten aktuellen Tastatur-/Buildvertrag ergänzt.
Die neueren AP27–AP37-Regeln und der AP39-Statusverweis bleiben erhalten.

Lokal bestanden: die neun Node-Vertragstestgruppen einschließlich der zwei
neuen Deploybedingungen und die drei gezielten ScientificMode-Fälle. Eine
vollständige lokale Check-Ausführung konnte nicht als abgeschlossen bestätigt
werden; maßgeblich sind die tatsächlich abgeschlossenen regulären PR-Gates.
Externe Quellenprüfungen bleiben blockierend. Keine neue Statusausnahme.

Der temporäre Diagnoseworkflow und alle lokalen Profilierungsmarker sind im
finalen Diff entfernt. Die lokalen Abhängigkeiten stammen aus dem bereits
vorhandenen CI-Artefakt `12173281943`, ZIP-SHA-256
`d74f05b358462e1e5b3e7b521047ee7fcdec6d942e98a786c39b47353d59905a`;
dieser Eingang wurde vor Nutzung geprüft, kein anderer Dependency-Stand importiert.
Der Versuch einer erneuten Export-Ausführung wurde durch automatische
Freigabeprüfung abgelehnt; danach wurde der Exportteil entfernt. Der spätere
Schedulernachweis führt keine Exporte aus. Finaler Head, Build-SHA, konkrete
Gates und Merge-/Pages-Nachweise stehen im Testabschnitt von PR #58.

## Weiterhin getrennte Live- und Eigentümerentscheidungen

Nach Merge die reguläre main-Kette bis zum erfolgreichen Deploy derselben
geprüften Bytes verfolgen. Kein manuelles Deployment oder Rerun auf Verdacht.
Erst danach einen tatsächlichen Live-/Build-Info-/Asset-/Workerabgleich versuchen.
Bleibt der Browserzugang gesperrt, bleiben die präzise AP39-Liste und #22 offen;
eine Umgebungs-Zugangssperre wird nicht als Websiteausfall behandelt.

Keine physische Screenreader-/GPU-/Langzeitabnahme durchgeführt. MIT-/Copyright-
Bestätigung und Releasefreigabe bleiben Eigentümerentscheidungen. Erfolgreicher
CI-/Pages-Abschluss allein bedeutet keine technische Live-Abnahme und erklärt
die ursprüngliche Timeoutursache vom 14.10. weiterhin nicht.
