# Roadmap

Aktuelle integrierte Produktabnahme: [AP46](AP46.md), main `c95f183a`
(21.10.2026), nach AP42–AP45. Reguläre main-CI und Pages desselben SHA
sind erfolgreich; Live-/Clientabnahme bleibt gemäß [AP39](AP39.md) blockiert.
[AP40](AP40.md) und [AP38](AP38.md) behalten ihre historischen Stände.

Die Pakete werden getrennt umgesetzt. Ein Haken bedeutet integriert (Merge auf `main`); manuelle Produkt-/Pages-Abnahmen sind separat dokumentiert und werden dadurch nicht als bestanden erklärt. Stand: 21.10.2026.

- [x] 1 Fundament — Toolchain, Struktur, Platzhalter, CI/Pages und Projektgedächtnis.
- [x] 2 Theming — Material 3 Expressive, Hell/System/Dunkel, Akzentwahl, Typography-/Shape-/Motion-Fundament und `#/design` (PR `feat/theming`, Details: `DESIGN.md`).
- [x] 3 Komponenten — Erweiterung des Design-Systems auf Basis der AP2-Tokens und Accessibility-Hardening.
- [x] 4 App-Shell/Verlauf — Registry und lazy Platzhalter, skalierende Desktop-Shell, persistenter Verlauf mit Suche/Pins/Undo/Export, Einstellungen und de/en/Auto (PR `feat/app-shell`; integriert).
- [x] 5 Engine-Kern — Parser, stabiler AST, decimal.js-Auswertung, Registry, Zahlenformat und Fehler mit Bereichen (PR `feat/engine-core`; Vertrag in `ENGINE.md`, integriert).
- [x] 6 Einfacher Rechner — herkömmlicher Funktionsumfang, reiner Reducer, Engine-Anbindung und Keypad/Display für AP8 (PR `feat/simple-calculator`; integriert).
- [x] 7 Engine wissenschaftlich — wissenschaftliche Registry, komplexe Zahlen, Σ/∫/d/dx, CODATA 2022, Environment und Export (PR `feat/engine-scientific`; Vertrag in `ENGINE.md`, integriert).
- [x] 8 Wissenschaftlicher Modus — Editor/Ergebnis, Tastenfeld, Konstanten und persistente Definitionen für Physik/Mathematik (PR `feat/scientific-mode`; Details in `SCIENTIFIC_MODE.md`, integriert). AP9 ergänzt den Informatik-Kontext.
- [x] 9 Programmierer-Panel — BigInt-Wörter, BitGrid, Basisanzeige, opt-in Parser, IEEE-754 und Unicode im AP8-Informatik-Kontext (PR `feat/programmer-panel`, integriert).
- [x] 10 Einheiten-Engine — 286 Einheiten in 32 Kategorien, Decimal-Umrechnung, Suche/Parser/Compound-Ausgabe und unabhängige Referenz-/Paartests (PR `feat/units-engine`; Vertrag in `UNITS.md`, integriert).
- [x] 11 Umrechner — AP10-Anbindung, lokalisierte Felder, Kartenraster, Schnelleingabe, persistente Paare und AP4-Ruheverlauf (PR `feat/convert-mode`; Vertrag in `CONVERT_MODE.md`, integriert).
- [x] 12 Graph-Engine — Float64-Compiler, Parameter, adaptive explizite/parametrische/polare Kurven, Analysis und Viewport (PR `feat/graph-engine`; Vertrag in `GRAPH.md`, integriert). Implizite Marching-Squares-Kurven sind separat in AP26/AP27 integriert.
- [x] 13 Graphen-Modus — 2D-Plotter und Interaktion auf AP12, Canvas/SVG-Adapter und Worker-Anbindung; keine Darstellung in AP12.
- [x] 14 Komfort — Command Palette, zentrale Tastenkürzel, versionierte Permalinks, UI-Größe/Präsentation und vorgezogenes PWA/Offline (PR `feat/comfort`; Vertrag und Kürzel in `COMFORT.md`, integriert); Verlauf mit Suche/Pins/Export sowie de/en und proportionale Desktop-Skalierung sind in AP4 vorgezogen.
- [x] 15 Hardening — weitere PWA-/Installations-/Browserabnahme, Datenschutz, Performance und Accessibility; Offline-Fundament in AP14 vorgezogen.
- [x] 16 Releasevorbereitung — PR #21 integriert: Dokumentation, Bildskript, Version 1.0.0, Changelog und Lizenzvorschlag. MIT-Bestätigung, Produktfreigabe, Tag und tatsächliches Release bleiben getrennt offen; siehe [RELEASE.md](RELEASE.md).
- [x] 17 Währungen (optional) — PR #23 integriert: explizites Opt-in, EZB/Frankfurter-v2-Provider, Cache und Offline-Fallback. Details in `UNITS.md`.

AP3: Komponentenbibliothek in `src/ui`, Zustandsmatrix im Design-Lab, Tastatur-/axe-Tests und reproduzierbare Galerie-Screenshots; Konventionen in `docs/COMPONENTS.md`. AP4 verwendet diese Bausteine für die Shell.

AP5 zieht die beauftragten reellen wissenschaftlichen Grundfunktionen und eine
erweiterbare Registry vor. AP6/AP8 binden die Result-API einschließlich Fehler-i18n
an die Modi an; AP7 ergänzt komplexe Zahlen, Listen und numerische Analysis.
AP12 nutzt den stabilen AST für den Graph-Kompilierer; AP7 liefert LaTeX und eigene Funktionsdefinitionen im Kern; deren UI folgt in AP8/AP14.

AP11 implementiert den Umrechner auf AP10; Verhalten, Persistenz und Testvertrag stehen in [CONVERT_MODE.md](CONVERT_MODE.md).

AP13: Graphen-UI mit Canvas 2D/HiDPI, lokalem Sampling-Worker, Parameterslidern,
Trace/Analysis, Tabellen/PNG und AP4-Plot-Satz-Verlauf. Vertrag: [GRAPH_MODE.md](GRAPH_MODE.md).
Implizite Konturen sind durch AP26/AP27 integriert (#17 geschlossen). Touch-Pinch
und physische GPU-/Screenreader-Abnahme bleiben Folgearbeit.

AP15: Hardening-Durchgang in `feat/hardening` / PR #20. Befund, Messverfahren,
Vorher-/Nachher-Werte und offene Produktionsabnahme: [QA_REPORT.md](QA_REPORT.md).
PR #20 ist gemergt; automatisierte Nachweise stehen im QA-Bericht. Die manuelle Pages-Prüfung und physische Restabnahmen bleiben separat offen.

## Integrationsnachweise

AP1–AP15 sind über die gemergten PRs #1, #3, #5–#10, #13–#16 und #18–#20 auf `main` integriert. AP16 und AP17 sind über #21 und #23 integriert. Die früheren Abnahmevorbehalte in den Paketbeschreibungen sind durch diesen Integrationsstand ersetzt; offene Qualitätsgrenzen bleiben im [QA-Bericht](QA_REPORT.md).

AP17 Folge-Issues: versionierte Währungs-Snapshots für Verlauf, Favoriten und Permalinks.

- [x] 18 UI-Bereinigung und dezentes Teilen — PR #25 ist auf main integriert:
      eine Modus-H1, kompakte Werkzeugzeilen und zugängliche Teilen-Aktion.
      Vertrag und Bildreproduktion in `COMFORT.md`.
- [x] 19 Vollständige Ziffernanzeige und konstante Rechentastenformen —
      `feat/ap19-calculator-rendering`; Clip-/Breitenkonzept, Browserregression
      und Animationsnachweise in [AP19.md](AP19.md). PR #26 integriert; manuelle Abnahme separat. Checkboxen und Designlab-Auslieferung bleiben getrennte
      Pakete; Graph-Fit bleibt AP21.

- [x] 20 Controls-Polish — PR #27 auf main integriert: gemeinsame Checkbox
      zentriert und dezent animiert; ThemeSwitch ohne Zusatzindikator.
      Tests und UI-Nachweise in [AP20.md](AP20.md).

- [x] 21 Stabiles Graph-Fit — PR #24 integriert (`bdc75289`),
      einschließlich Aspektsperre und erhaltener Fit-Basis.

- [x] 22 Graphzahlen und Wertetabelle — `feat/ap22-graph-values`: wählbare
      Anzeigerundung, lokalisierte Zahlenfelder/Koordinaten und bedarfsgerechte
      Tabellenberechnung auf integriertem AP21. Vertrag und Testnachweise in
      [GRAPH_MODE.md](GRAPH_MODE.md); PR #28 integriert.
      CSV-Export und neue Rechenfeatures bleiben Folgearbeit; implizite Konturen
      sind in AP26/AP27 integriert, ohne mehrwertige Wertetabelle.

- [x] 23 Internes Designlab — `feat/ap23-internal-design-lab`: vier Modi im
      normalen Build, internes Lab nur in Entwicklung/ausdrücklichem Galerie-Build,
      getrennte Testziele und Pages-Schutz. Nachweise in [AP23.md](AP23.md);
      PR #29 integriert. AP18 und AP20 sind in der Ausgangsbasis enthalten.

- [x] 24 Dependency-Wartung — `feat/ap24-dependency-maintenance` / PR #30:
      kompatible Updates aus #12, Vitest-4-Patch und getrennte Dependabot-Gruppen.
      Paketmatrix, Node-/Peer-Verträge, Prüfnachweise und Folgeaufgaben
      (ESLint 10, Motion 14, jsdom 30, Vitest 5, Node-Typen 26) in
      [AP24.md](AP24.md). #30 ist integriert; der ersetzte Update-PR #12
      wurde am 16.10.2026 nach diesem Merge geschlossen. Kein automatischer Merge/Release.

- [x] 25 Produktabnahme — PR #40 auf main integriert (`5b1c5a9`): gezielte Wiederverwendung der AP18–AP24-Regressionen,
      Browser-/PWA-Integration und belegter Produktionsstand; [AP25.md](AP25.md).
      Die historischen AP25-Messungen bleiben erhalten; Live-Abnahme des aktuellen
      Kandidaten gehört zu AP39, siehe [AP38](AP38.md).

- [x] 26 Implizite Kurven, Domäne (optional) — `feat/ap26-implicit-domain`:
      separater Float64-Compiler und adaptives Marching Squares mit gemeinsamen
      Zellrändern, asymptotischem Sattel-Decider, Diagnosen, Arbeitsgrenzen,
      Referenz-/Fuzztests und eigenem 2D-Benchmark. Vertrag und Grenzen in
      [GRAPH.md](GRAPH.md), Teilumfang von [Issue #17](https://github.com/sl3ndrr/m8e-calc/issues/17).
      Kein Bestandteil der AP21-Autofitkorrektur; keine UI-Aktivierung in AP26.
- [x] 27 Implizite Kurven, Integration — `feat/ap27-implicit-ui`: echte AP26-API,
      Worker/Canvas/UI, gemeinsame Budgets und Diagnose; begrenzter AP21-Fit,
      explizite Sperren für Analysis/Trace/Table, kompatible textbasierte Links.
      PR #42 integriert (`8eb32f1`); Vertrag und Nachweisstatus:
      [AP27.md](AP27.md). Der separate wiederkehrende 4K-FPS-Befund ist AP28 / #43.

- [x] 28 Graphperformance stabilisieren — PR #44 auf main integriert (`427d890`), `feat/ap28-graph-performance`,
      [Issue #43](https://github.com/sl3ndrr/m8e-calc/issues/43): feste Vergleichsfenster,
      Render-/rAF-/Worker-/Kompositionsdiagnose und begrenzte Drag-Samplingfrist.
      Grenzen von 55 FPS und 16,67 ms bleiben erhalten. Rohdaten, Regression-
      Kontrollen und tatsächliche CI-Abnahme: [AP28.md](AP28.md). Integration
      erfolgt; keine vorgezogene physische GPU-Abnahme.

- [x] 29 Buildnachweise unter aktivem Produktionsworker — PR #45 auf main integriert (`615a0cd`),
      `feat/ap29-build-provenance`, PR #45: begrenzter Dokument-Fallback,
      netzgebundene passive Provenienz und echte kontrollierte Browserregression
      mit zwei Builds/Offlinefehler. Vertrag/Nachweise: [AP29.md](AP29.md).
      Die Live-Abnahme des konkreten Pages-Deploys bleibt getrennt.

- [x] 30 Startbudget — `feat/ap30-startup-budget`, PR #46 integriert (`5f4f312`): direkte Engine-Imports
      für Einfach und typisierte synchrone i18n-Einstiege für Startpfad bzw.
      bestehende Lazy-Bereiche. Arbeitsziel ≤190.000 Byte gzip bei unveränderter
      Entry-/Einfach-Messdefinition; hartes Gate weiterhin <200.000 Byte.
      Vergleich mit integriertem AP28/AP29 und Abnahme: [AP30.md](AP30.md).

- [x] 31 CI-/Pages-Freigabepfad — `feat/ap31-ci-pages-gate`: ein gemeinsamer
      Qualitätsstatus für PR/main, ein normaler Produktionsbuild und durchgängige
      Commit-/Artefakt-/Fingerprintbindung bis Pages. Pflicht-QA einschließlich
      AP28/AP29, Galerie und Release-Quellenprüfung; bedingte Paketnachweise separat.
      PR #47 ist integriert (`9180b26`). Umsetzung und tatsächliche Läufe: [AP31.md](AP31.md).
      Erfolgreiche main-/Pages-Kette für `c95f183a` belegt: [AP46](AP46.md).
      Der frühere Quellenblocker bleibt historisch in [AP40](AP40.md).

- [x] 32 Verbindlicher PR- und Qualitätsschutz — `feat/ap32-merge-protection`,
      PR #48: Ruleset `25003991` durch den Eigentümer aktiviert und lesend bestätigt.
      PR-Pflicht ohne fremde Zustimmung, `Quality gate` von GitHub Actions und
      strikte Zielbranchaktualität sind verbindlich. Roter PR #48 belegt die Sperre;
      aktuelle Dependabot-PRs erzeugen den Pflichtcheck und sind bei Rot blockiert. Der gezielte Iris-/Galeriefix und
      seine Kaltstartregressionen gehören zum späteren Eigentümerauftrag.
      Vorher/Nachher und reale Läufe: [AP32.md](AP32.md). Status: Schutz und Dependabot-Sperre belegt ([AP40](AP40.md)); PR #48 integriert (`3384c0d`), einschließlich Iris-Fix.
      Klassische Admin-Regeleinsicht bleibt zugriffsbeschränkt.

- [x] 33 Dependency-Entscheidungen — `feat/ap33-dependency-decisions`, PR #49:
      aktuelle Registry-Verträge und Originalfehler für #33/#34/#37/#39 getrennt
      dokumentiert; Node 24 und 24er-Typen bleiben erhalten. Entscheidungen,
      Wiederaufnahmebedingungen und Schließempfehlungen: [AP33.md](AP33.md).
      Tracking: [#31](https://github.com/sl3ndrr/m8e-calc/issues/31) (ESLint),
      [#32](https://github.com/sl3ndrr/m8e-calc/issues/32) (Runtime/Material und
      übrige AP24-Migrationen), [#50](https://github.com/sl3ndrr/m8e-calc/issues/50)
      (TypeScript 7). PR #49 integriert (`2b13384`); keine Dependency-Migration.
      Der zur Freigabe nötige Quellenfix für #51 und die ereignisgebundene
      Live-Animationsmessung für #52 sind als eigene Korrekturcommits enthalten;
      #51/#52 sind nach grüner finaler PR-CI und Merge geschlossen.
      #33/#37/#39 bleiben offen; #34 ist wegen des Node-24-Vertrags geschlossen.

- [x] 34 jsdom-30-Testumgebung — `feat/ap34-jsdom30`, [PR #59](https://github.com/sl3ndrr/m8e-calc/pull/59):
      seit main `874c2443` integriert; 27.4.0 → 30.1.3, Node `>=24.15.0 <25`,
      getrennte UI-/Engine-Projekte und zusätzliche Untergrenzen-CI.
      Entscheidung und konkrete Nachweise: [AP34](AP34.md), Tracking #32.
      #36 ist nach Integration als ersetzt geschlossen.
- [x] 35 Vitest-5-Migration — `feat/ap35-vitest5`, [PR #60](https://github.com/sl3ndrr/m8e-calc/pull/60):
      eigenständig auf integriertem AP34, 4.1.12 → 5.0.5; explizite
      Projekt-/Plugintrennung und erhaltener Mock-Lebenszyklus.
      Vollständiger Vorher-/Nachher-Vergleich beider Projekte: gleiche
      462 UI-/1666 Engine-Tests, geänderte Anzeigetitel einzeln dokumentiert.
      Nachweise und finale Gates: [AP35](AP35.md). #60 ist seit 19.10.2026
      integriert (main `964f6b4e`); #38 danach als ersetzt geschlossen.
      Tracking #32/F4 erledigt.
- [x] 36 Motion-14-Migration — `feat/ap36-motion14`, [PR #61](https://github.com/sl3ndrr/m8e-calc/pull/61):
      eigenständig ab main `964f6b4e`, AP28/AP30/AP33/AP34/AP35 integriert;
      12.43.0 → 14.4.0 mit regulärem Lockfile, zwei lokalen Cleanup-Korrekturen
      und 69 echten Browser-/Unterbrechungsfällen. Abnahme, Messungen und Bilder:
      [AP36](AP36.md). Seit 19.10.2026 integriert (main `11865098`);
      #35 ist als ersetzt geschlossen, #32/F2 erledigt. PR-Abnahme grün,
      damalige main-CI wegen externer Quellen rot. Inzwischen enthält der belegte
      Pages-Deploy `c95f183a` auch Motion 14: [AP46](AP46.md).
- [x] 37 Dokumentationsquellen — PR #53 integriert (`177f329`): verständliche
      Quellenfehler und dauerhafter JSON-Bericht, unverändert blockierendes Gate.
      Historische Nachweise: [AP37](AP37.md), finaler Nachweis in [AP38](AP38.md).
- [x] 38 Statusdokumentation — PR #54 am 18.10.2026 integriert (`c79bf88`);
      damaliges main-Quality-gate rot, damals kein neuer Pages-Deploy. Historischer
      Integrationsbericht: [AP38](AP38.md).
- 39 Manuelle Live-Abnahme — ausgeführt bis zur belegten Zugangssperre;
  technische Abnahme blockiert, #22 bleibt offen. Historische Kandidaten und
  Messgrenzen bleiben erhalten. Reparatur #58 ist integriert, #55/#56 geschlossen;
  aktuelle main-/Pages-Identitäten stehen in [AP40](AP40.md). Echte Belege, konkrete
  Restprüfliste und Eigentümerentscheidungen: [AP39](AP39.md).

- 40 Aktuelle Ausgangslage — Dokumentationspaket auf `11865098`: integrierte
  Wartung, Quellenblocker, Dependabot-/Pages-Nachweise und konkrete offene
  Abnahmen in [AP40](AP40.md). Kein Produkt- oder Checkerumbau.

- 41 Live-Abnahme — in [AP40](AP40.md) für die kontrollierte Abnahme nach
  grünem main-/Pages-Nachweis vorgemerkt; nicht Teil des Button-Pakets.

- [x] 42 Gemeinsames Button-Feedback — `feat/ap41-button-feedback`, ab main
      `65ce593`: konstante rollenbezogene Press-Formen, stabile Klickziele und
      Fokusringe, zentrale 0,97-Spatial-Skalierung mit Effects-State-Layer und
      diskrete Selected-Formen. Erweitert
      AP19/AP36 statt einer zweiten Messinfrastruktur. Vertrag und tatsächlicher
      Prüfstatus und dauerhafte native Frame-/Bildbelege: [AP42](AP42.md),
      Umsetzung in [PR #63](https://github.com/sl3ndrr/m8e-calc/pull/63).
      Integriert durch #63 (`63fdc9c`); aktuelle gemeinsame Abnahme in AP46.

- [x] 43 Stetige Parameterkurven — `feat/ap43-graph-parameter-continuity`,
      ab main `63fdc9c`: einmaliger Full-Reveal pro sichtbarer gültiger Funktion,
      erhaltene Geometrie bei Pending, atomarer Ersatz und begrenzte
      koaleszierte Workeraufträge mit kompatiblem Zwischenfortschritt.
      PNG/Diagnosen behalten ehrliche Aktualität. Verträge, Framevergleich und
      tatsächlicher Prüfstatus: [AP43](AP43.md). AP42 ist bereits belegt;
      #43 bleibt ein eigener historischer Performancebefund.
      Integriert durch #64 (`aa8ed101`); aktuelle gemeinsame Abnahme in AP46.

  Historische AP43-Zwischenstände vor dem Merge (rote Läufe bleiben erhalten):
  Prüfstand `025ea1e`: fünf echte negative Vorher-Gegenproben,
  12/12 neue Chromiumfälle, check und bestehende 4K/Mixed-Gates bestanden.
  Framebelege sind dauerhaft gespeichert. Ein separater AP28-Vergleich auf
  `6662ec5` bleibt bei 48,00384 <55 FPS rot; Ursache/Performancefreigabe offen.
  Der abschließende PR-Head benötigt seine eigenen Pflichtchecks.
  `df91629`: zwölf neue Chromium-/Firefoxfälle und eigenständiger AP28-Lauf
  bestanden. WebKit-Messfenster/Slideranzeige werden korrigiert; vollständige
  CI bleibt zusätzlich am HTTP-502 eines historischen Quellenlinks blockiert.
  Der frühere rote AP28-Lauf ist samt Pan-/Hidden-Pan-Rohfenstern erhalten.
  `68b8c1d`: check und volle Chromium-/Firefoxmatrix bestanden, Quellencheck
  grün. AP28-Pflichtjob rot (48,98223 FPS), unabhängiger AP28-Lauf grün.
  WebKit erhält nach kaltem Seitenstart und einer nicht beobachtbaren
  Dialogsekunde eine gezielte Harnesskorrektur bei unveränderten Graphgates.
  Abschließender Prüfstand `dff1e16`: zwölf Fälle in Chromium und WebKit grün,
  volle Matrix 176 Chromium / 150 Firefox / 150 WebKit (zwei bestehende Skips),
  alter main bei allen fünf Kurventypen negativ. Aktuelle AP28-/4K-/Mixed-Gates
  grün; früheres Performance-Rot bleibt dokumentiert und #43 offen.
  Ein bestehender Galerie-Theme-Timeout blockiert die Gesamt-CI; kein Merge.

- [x] 44 Akzent und Installation in Einstellungen — `feat/ap44-settings-actions`,
      ab main `aa8ed101`: vorhandener AccentPicker unter Erscheinungsbild,
      Installation unter App ausschließlich mit Browserprompt; ThemeSwitch bleibt
      in der Shell. Zentraler PWA-Lifecycle und Lazy-Grenzen bleiben erhalten.
      Prüfstatus und Grenzen: [AP44](AP44.md).
      Integriert durch #67 (`26346af2`); die anschließende Overlaybewegung ist AP45.

- [x] 45 Gemeinsame Overlay-/Controls-Bewegung — `feat/ap45-overlay-motion`,
      ab main `26346af2` nach AP42/AP43/AP44. AP44 ist durch Einstellungsaktionen
      belegt, daher freie Nummer AP45. Symmetrische Effects-Übergänge,
      React-Aria-Exitpräsenz, gezielte Switch-/Segment-/Slider-Effects; keine
      Dependency-Migration und kein Graphsampling. Verbindliche Matrix,
      tatsächliche Prüfläufe und Geräte-Folgepunkte: [AP45](AP45.md).
      Integriert durch #68 (`c95f183a`); keine physische Abnahme daraus ableiten.

- [ ] 46 Integrierte Produktabnahme — `feat/ap46-integrated-acceptance`, #69:
      vorhandene Browser-/Framegates nach AP42–AP45, mindestens zehn Sekunden
      Parameterplayback, aktueller main-/Pages-/Clientabgleich und Issue-Empfehlungen.
      Bericht: [AP46](AP46.md), Reparaturen: [AP47](AP47.md). Keine neuen Bildbaselines.
      Neuer Nutzerauftrag: Merge erst nach grüner finaler Pflicht-CI und relevanten
      Zusatzprüfungen; keine Tags/Releases/manuellen Deploys.
      AP39-/AP41-Livepunkte bleiben bei Zugangssperre offen, #43 separat.

- [ ] 47 WebKit-/Collector-Diagnose und Canvas-Finalisierung — [#70](https://github.com/sl3ndrr/m8e-calc/issues/70),
      eigener 4K-Vertrag [#43](https://github.com/sl3ndrr/m8e-calc/issues/43).
      Belegter Kontexthinweis-Aufwand entfernt; WebKit-Frameprobe isoliert,
      frühe Fehlerrohwerte vollständig. Umsetzung in #69; finale CI maßgeblich.
      Originalgates und historische rote Läufe bleiben erhalten. [AP47](AP47.md).

- [ ] 48 History-Exit → Einstellungen — [#71](https://github.com/sl3ndrr/m8e-calc/issues/71).
      Unit-Vorbereitung/React-Abschluss und Fokusbereitschaft explizit;
      zusätzlicher kalter/warmer Produktionsbrowserfall während echten Exits.
      Umsetzung in #69, finale CI maßgeblich. Historische Ursache nicht erfunden;
      keine längeren Timeouts oder ersetzte Benutzerklicks. [AP47](AP47.md).
