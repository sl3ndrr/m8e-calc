# Qualitätsbericht

Aktuelle Live-Abnahme: [AP39](AP39.md) (blockiert; #22 offen).
Vorheriger Integrationsbericht: [AP38 · Status](AP38.md).
Historische Produktabnahme vom 17.10.2026: [AP25](AP25.md).
Die nachfolgenden Messwerte sind historische AP15-Nachweise, keine erneute
Abnahme von AP18–AP24 oder des aktuellen Pages-Deploys.

Der wiederkehrende 4K-Graphbefund wird separat in [AP28.md](AP28.md) untersucht:
Canvas-Aufrufdauer, rAF, Workerlast und Software-Komposition sind getrennte
Messgrößen. AP28 erhält die 55-FPS-/16,67-ms-Grenzen und ergänzt feste Referenzen
mit absichtlichen Verlangsamungen; frühere grüne Läufe ersetzen den finalen
PR-HEAD-Nachweis nicht.

Historische AP30-Startpfadmessung vom 18.10.2026 nach integriertem AP28/AP29, getrennte Artefakt-/
Precachegrößen und Mess-SHA: [AP30 · Startbudget](AP30.md). Die historischen
Reserveangaben unten werden dadurch nicht als aktuelle Messung übernommen.

## AP15 Hardening

Stand: 14.10.2026. PR: [#20 · feat/hardening](https://github.com/sl3ndrr/m8e-calc/pull/20).
Ausgangsstand: `67d9c9688d1cc7169a73262b21e738ff09c8bcda`.
Der erste Commit des PR enthält ausschließlich den ursprünglichen Befund. Es wurden keine Produktfunktionen ergänzt.

## Messverfahren

Vorher und Nachher werden mit Node 24 auf Ubuntu gegen den Produktionsbuild mit
`/m8e-calc/` als Base gemessen. Der QA-Workflow baut den Ausgangsstand erneut in
einem separaten Worktree und verwendet dieselben Messskripte. Rohwerte und
Browser-Traces stehen als Actions-Artefakte bereit (14 Tage Aufbewahrung).

Lighthouse: je drei Desktop-Läufe pro Modus, 1920×1080, jeweils Performance,
Accessibility, Best Practices und CLS. Zielwerte gelten für den Median je Modus;
Einzellauf-Minima werden ebenfalls ausgewiesen. Ein kalter Einfach-Lauf erreichte
in einem früheren Hardening-Lauf nur 73 (TBT 664 ms); die übrigen zwei Einfach-Läufe 100. Das bleibt
ein dokumentiertes P2-Risiko, auch wenn das Median-Gate bestanden ist. Der zusätzliche Reporter prüft
jeden Hash-Modus separat, da LHCI Hash-URLs sonst zusammenfasst.
JS: Summe der gzip-9-Größen des Entry, seiner statischen Imports und des
Einfach-Modus einschließlich seiner statischen Imports; Limit **200.000 Byte**.
Service Worker und später geladene Modi gehören nicht zu diesem Startpfad.

Kontrast: 16 Seeds × 4 Varianten × 3 Kontraststufen × hell/dunkel, einschließlich
aller neun Surface-Hintergründe, Text-/Container-/Fixed-/Inverse-Rollen sowie
Fokus- und Outline-Rollen. Alle Textpaare müssen 4,5:1 erreichen, UI-Paare 3:1.
Dekorative Separatoren, Schatten und deaktivierte Steuerelemente sind keine
Text- oder interaktiven Kontrastrollen. Graph-Kurven besitzen zusätzliche eigene
Kontrasttests. axe läuft ohne Regel-Ausschlüsse in allen vier Modi und zusätzlich
im Informatik-Panel, jeweils hell/dunkel mit Iris, Teal und Coral.

Browser: Chromium mit bestehender Gesamtsuite; Firefox und WebKit mit derselben
neuen Hardening-Suite. Tastaturtests verwenden echte Tab-/Shift+Tab-/Enter-/Escape-
Ereignisse, einschließlich Dialog-Fokusfallen und Fokusrückgabe, Befehlspalette,
Berechnungen, Schnelleingabe und Graph-Editor. Die Zoom-Prüfung verwendet den
1920×1080-Desktop bei 960×540 CSS-Pixeln (200%-Reflow) und verhindert das bisherige
Herunterskalieren der Schrift unter 1rem. Browser-Menüzoom ist separat manuell abzunehmen.

Visuell: 24 PNG-Referenzen, vier Modi × 1920×1080 / 2560×1440 / 3840×2160 ×
hell/dunkel. Feste deutsche Locale, Seed, Eingaben und Motion-off; Fonts geladen,
Caret verborgen, Animationen deaktiviert. Verglichen wird mit `toHaveScreenshot`
und maximal 0,1% abweichenden Pixeln.

Runtime: Event Timing während getippter Editor-Eingaben (16-ms-Meldeschwelle),
CLS, CDP-Heap nach GC, DOM-/Listenerzahlen und aktive rAF-/Resize-/MutationObserver.
Fünf vollständige Zyklen einschließlich Graph-Editor wärmen Modul-/Editor-Caches
vor; danach folgen 20 Zyklen aller vier Modi im selben Dokument. Die Messung ist
ein Labor-Proxy für INP, kein gemessener Feld-INP oder mathematischer Leak-Beweis.
Initiale/Editor-CLS und zusätzliche CLS nach dem Warm-up sind Gates; absichtliche
Hash-Moduswechsel während des Warm-up werden gesondert protokolliert (zuletzt
0 im letzten Lauf, ohne weitere Zunahme während der gemessenen 20 Zyklen).

## Vorher / Nachher

| Prüfung                    | Vorher                                                    | Nachher                                                                                                                         |
| -------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Gesamtcheck                | 50 Dateien, 1.978 Tests; grün                             | 55 Dateien, 1.990 Tests; vollständiger CI-Gesamtcheck grün                                                                      |
| Initiales JavaScript       | 313.108 Byte gzip                                         | 197.632 Byte gzip (−36,9%; Budget bestanden)                                                                                    |
| CodeMirror / KaTeX / Graph | eigene Chunks; schwere Shell-Imports trotzdem eager       | alle drei außerhalb des initialen Importgraphen                                                                                 |
| Textkontrast-Minimum       | 4,577:1                                                   | 4,577:1                                                                                                                         |
| UI-Kontrast-Minimum        | 2,920:1; 64 Outline-Unterschreitungen                     | 3,035:1; 0 Fehler bei 36.480 Prüfungen                                                                                          |
| axe-Matrix                 | keine vollständige Matrix                                 | 0 Verstöße in Chromium, Firefox und WebKit; jeweils 30 Ansichten                                                                |
| npm audit                  | 1 niedrig: KaTeX, GHSA-238p-pmpm-9mq7                     | KaTeX 0.18.10; 0 Schwachstellen im vollständigen Audit                                                                          |
| Browser                    | 81 bestehende Chromium-Tests; kein Firefox/WebKit-Projekt | 144 QA-Prüfungen grün (102 Chromium inkl. Ressourcen, 21 Firefox, 21 WebKit); reguläre CI: 102 Chromium inkl. Graph-Performance |
| Screenshot-Regression      | Aufnahmen ohne Referenzvergleich                          | 24 deterministische Referenzen visuell geprüft und im unabhängigen CI-Vergleich bestanden                                       |
| Ressourcen nach 20 Zyklen  | nicht systematisch erhoben                                | Listener/DOM/Observer/rAF jeweils +0; Heap nach vollständig warmem Graph-Editor +613.564 Byte                                   |
| Editor-Interaktion         | nicht erhoben                                             | 104 ms Event Timing; Editor-CLS 0; keine CLS-Zunahme nach Warm-up                                                               |
| CSP                        | fehlt                                                     | Meta-CSP; Normalbetrieb ohne Verletzungen, injiziertes Script in allen drei Browsern blockiert                                  |

### Lighthouse

Vorher/Nachher: Median aus drei Läufen je Modus im selben [QA-Lauf 38591852830](https://github.com/sl3ndrr/m8e-calc/actions/runs/38591852830). Nachher-Code: `a10564bbc3fed161308b28fae69bef5f809cec29`. Accessibility/Best Practices sind in jedem Einzellauf 100; CLS in allen zwölf Läufen exakt 0.

| Modus            | Vorher P / A / BP | Vorher CLS | Nachher P / A / BP | Minimum P (Einzellauf) | Nachher CLS |
| ---------------- | ----------------- | ---------- | ------------------ | ---------------------- | ----------- |
| Einfach          | 99 / 100 / 100    | 0,001674   | 100 / 100 / 100    | 99                     | 0           |
| Wissenschaftlich | 96 / 96 / 100     | 0,002459   | 98 / 100 / 100     | 98                     | 0           |
| Umrechner        | 99 / 100 / 100    | 0,001674   | 99 / 100 / 100     | 99                     | 0           |
| Graphen          | 99 / 100 / 100    | 0,001674   | 99 / 100 / 100     | 99                     | 0           |

## Erledigte Funde

| ID    | Priorität | Befund und Behebung                                                                                                                                                                                                                                                                                                            |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| QA-01 | P1        | Render-/Chunk-Fehler konnten die App entfernen. Fehlergrenze pro Modus mit freundlichem lokalisiertem Reset; Shell bleibt benutzbar. WebKit benötigt vor dem Reload ein Cache-Refresh des fehlgeschlagenen lokalen Chunks. Globale Fehler/rejected Promises werden als zusammengefasste Snackbar ohne Eingabedetails gemeldet. |
| QA-02 | P1        | Pages hatte keine CSP. Build erzeugt Meta-CSP vor Assets mit SHA-256-Hashes des finalen Bootstraps, `default-src 'none'`, kein Script-inline/eval, ausschließlich lokale Laufzeitquellen. KaTeX bleibt `trust: false`; Quellensuche ergab keine Nutzer-HTML-Sinks.                                                             |
| QA-03 | P1        | Startbudget verletzt. Shell-/Palette-/History-/Settings-/Akzentpanel-Imports getrennt, Permalink-Dekodierung von schweren Domänen entkoppelt, React-Aria-Locale-Daten auf de/en begrenzt. Startanimationen nutzen die zentrale Spring-Kurve mit nativen APIs; Motion bleibt für tatsächlich verwendete spätere Komponenten.    |
| QA-04 | P1        | Outline unterschritt 3:1 auf dunklen Surfaces. Nur diese Rolle wird gegen alle Surface-Hintergründe korrigiert; vollständige Rollenmatrix ist ein CI-Gate.                                                                                                                                                                     |
| QA-05 | P1        | Wissenschaftliche Vorschau hatte einen unzulässigen ARIA-Namen; sichtbare Tastennamen und Beschriftungen wichen ab. Rolle und Namen korrigiert; Informatik-, Hilfe-, Copy- und Verlauf-Beschriftungen geprüft.                                                                                                                 |
| QA-06 | P1        | Root-vw-Skalierung verringerte Schrift beim Zoom. 1rem-Untergrenze und Reflow-Tests für alle Modi; bei angedocktem Verlauf entfällt die doppelte Modusbeschriftung im Toolbar, damit Bedienelemente und Arbeitsfläche Platz behalten.                                                                                          |
| QA-07 | P2        | PWA-Worker-/updatefound-Handler wurden nicht entfernt. Vollständige Abmeldung und Unit-/Ressourcentests; rAF wird beim Settling und Unmount beendet.                                                                                                                                                                           |
| QA-08 | P2        | JS-Animation akzeptierte `linear()` ohne Erkennung. `CSS.supports` plus `ease-out`-Fallback; View Transitions bereits optional, corner-shape bereits hinter `@supports`, reguläre Radien bleiben erhalten.                                                                                                                     |
| QA-09 | P2        | Ergebnisse/Fehler wurden teilweise außerhalb dauerhafter Live-Regionen eingesetzt. Persistente Regionen für wissenschaftliches Ergebnis/Vorschau, Graph-Analyse/Trace und Feldfehler. Interaktiver Graph-Canvas hat eine benannte Application-Rolle für den eigenen Tastaturbereich.                                           |
| QA-10 | P2        | Keine Browser-/Screenshot-/Lighthouse-/Ressourcen-Gates. Reproduzierbare Projekte und Messskripte ergänzt. Kritische lokale Fonts sind bereits gesubsettet/preloaded; Font-Readiness und reservierte Editorhöhe verhindern späte Größenänderung. Platz des asynchron angebotenen PWA-Installationsbuttons wird reserviert.     |
| QA-11 | P2        | KaTeX-Auditbefund. Auf 0.18.10 aktualisiert; vollständiges Audit einschließlich Entwicklungsabhängigkeiten als Gate.                                                                                                                                                                                                           |
| QA-12 | P3        | Ungenutzter Modus-Platzhalter und zugehörige CSS-Regeln entfernt; unnötiges `@types/katex` nach Umstellung auf KaTeX mit eigenen Typen entfernt; verbleibende direkte Dependencies haben Laufzeit-, Test- oder Font-Generierungsverwendungen.                                                                                  |
| QA-13 | P1        | Fehlgeschlagene verschachtelte Editor-/Formelimporte blieben trotz Remount abgewiesen. `ModeLoadError` auch für diese Imports; Cache-Refresh und Reload beim Reset. Gezielte 503-Prüfungen für Modus, Editor und Formelrenderer.                                                                                               |
| QA-14 | P1        | Gemeinsame Dialogfehler lagen außerhalb der Modusgrenzen. Äußere App-Fehlergrenze mit freundlicher Seite, fokussiertem Reset, globaler Snackbar und lokalem Cache-Refresh. Gezielte Settings-503-Prüfung.                                                                                                                      |

Defekter JSON-/Theme-Cache, unbekannte zukünftige Versionen, verweigerter Storage
und Quota-Fehler werden in jedem Modus geprüft. Bestehende Migrationstests bleiben
erhalten. Zusätzlich 500 deterministische Fuzz-Fälle (Seed 15015) für Editor-
Einfügeadapter, Schnelleingabe und Permalink-Hülle; vorhandene Parser-/Engine-
Property-Tests laufen im Gesamtcheck weiter.

## Verbleibende Risiken / Folgeabnahme

| Priorität | Status / Risiko                                                                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1        | Live-Abnahme und #22 bleiben offen. Aktueller Kandidat und letzter tatsächlich bestätigter Pages-SHA stehen zentral in [AP38](AP38.md); AP39 prüft genau den veröffentlichten Kandidaten. Die alten AP15-/AP25-Deploywerte sind historische Nachweise. |
| P2        | Physischer Screenreader, echter Browser-Menüzoom bis 200%, 4K/GPU und langfristige Nutzung werden durch Headless-Checks nicht vollständig nachgewiesen.                                                                                                |
| P2        | CSP benötigt `style-src 'unsafe-inline'` für CodeMirror, React Aria und DOM-Animationen. Script-Regeln bleiben strikt. Meta-CSP kann `frame-ancestors` nicht durchsetzen; Pages stellt hier keine frei konfigurierbaren Header bereit.                 |
| P2        | Event Timing und Heap-Schwellen sind Laborindikatoren; reale INP-Verteilung und sehr lange Sitzungen bleiben gesondert zu beobachten.                                                                                                                  |
| P3        | Historisch hatte AP15 nur rund 2,4 kB Reserve. AP30 verbesserte den Startpfad; spätere Messung und verbleibende endliche Reserve stehen in [AP38](AP38.md). Die vollständige statische Importmenge bleibt Prüfgrundlage.                               |

Ein früherer kalter Lighthouse-Einzellauf des Einfach-Modus lag bei Performance 73
(TBT 664 ms), die beiden anderen bei 100. Median-Gate und alle anderen Modi sind
grün; der finale Einfach-Minimalwert beträgt 99. Der frühere lange Starttask ist
im Rohbericht erhalten und bei der
Pages-Abnahme erneut zu prüfen. Die PWA precacht weiterhin alle Modi/Fonts/Worker
für Offline-Nutzung im Hintergrund. Dieses zusätzliche Transferbudget gehört
nicht zum ausgewiesenen statischen JS-Startgraphen.

Für den nächsten freigegebenen Stand nach Merge: Deploy-SHA notieren, vier Kernabläufe und Fehlerpfade, Palette,
Verlauf/Undo/Export, Dialogfokus, Hell/Dunkel/Seeds, Reload/Offline und Assetpfade
in allen drei Browsern manuell prüfen. Tatsächliche Abweichungen als Issues mit
Priorität, Browser/Version, Deploy-SHA, Schritten, Erwartung und Screenshot erfassen.

## Prüfnachweise

Der [CI-Lauf 38591852662](https://github.com/sl3ndrr/m8e-calc/actions/runs/38591852662)
führt `npm ci` und `npm run check` mit unveränderten Testlimits aus.
Der [QA-Lauf 38591852830](https://github.com/sl3ndrr/m8e-calc/actions/runs/38591852830)
enthält den fixierten Vorher-Stand, Nachher-Messungen, Browser- und Screenshotprüfungen.
Beide Läufe sind vollständig grün: 55 Unit-/Komponententestdateien, 1.990 Tests,
102 reguläre Chromium-E2E, 144 QA-Browserprüfungen und 24 Screenshot-Vergleiche.
Die 102 regulären und 102 QA-Chromium-Prüfungen überschneiden sich; sie sind
nicht als 204 unterschiedliche Tests zu zählen.

Ressourcenartefakt: nach fünf Warm-up-Zyklen und 20 gemessenen Zyklen
Heap 12.635.168 → 13.248.732 Byte, DOM-Nodes 415 → 415, Listener 299 → 299,
aktive rAF/Observer jeweils 0 → 0. Event-Timing-Maximum im Editor 104 ms;
Initial-/Editor-/Steady-state-CLS jeweils 0. Rohartefakte im QA-Lauf:
`qa-before`, `qa-after`, `qa-browsers` (`qa/runtime.json`) und `qa-visual`.

Bei der lokalen Wiederherstellung wurden Dependencies aus einem älteren
CI-Artefakt verwendet (KaTeX 0.16.47 statt Lockfile 0.18.10); dieser lokale Lauf
ersetzt keinen Release-Check. Drei wissenschaftliche UI-Tests überschritten dort
das 5-s-Limit und bestanden isoliert mit 15 s. Maßgeblich ist der erfolgreiche
CI-Gesamtcheck nach sauberem `npm ci` mit unveränderten Standardlimits.

## Reproduktion

```sh
npm ci
npm run check
node scripts/qa-bundle.mjs
node scripts/qa-contrast.mjs
npm audit
npx playwright install --with-deps chromium firefox webkit
npx playwright test --project=chromium --project=firefox --project=webkit --project=qa-performance
npx playwright test --project=qa-visual
npx --yes --package @lhci/cli@0.15.1 lhci autorun
node scripts/qa-lighthouse.mjs
```

Referenzen nur nach visueller Prüfung mit `--update-snapshots` erneuern. Das ist
keine Möglichkeit, eine unbeabsichtigte Darstellungsänderung freizugeben.
