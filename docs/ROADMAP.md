# Roadmap

Die Pakete werden getrennt umgesetzt. Ein Haken bedeutet integriert (Merge auf `main`); manuelle Produkt-/Pages-Abnahmen sind separat dokumentiert und werden dadurch nicht als bestanden erklärt. Stand: 18.10.2026.

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
- [x] 12 Graph-Engine — Float64-Compiler, Parameter, adaptive explizite/parametrische/polare Kurven, Analysis und Viewport (PR `feat/graph-engine`; Vertrag in `GRAPH.md`, integriert). Implizite Marching-Squares-Kurven folgen separat.
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
Implizite Kurven (#17), Touch-Pinch und physische GPU-/Screenreader-Abnahme bleiben Folgearbeit.

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
      CSV-Export, neue Rechenfeatures und implizite Kurven bleiben Folgepakete.

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
      Live-Abnahme und spätere Prüfung genau des AP25-Pages-Deploys bleiben separat.

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
      PR #47 ist integriert (`9180b26`). Umsetzung und tatsächliche Läufe: [AP31.md](AP31.md). Erste reale main-/Pages-
      Kette und Live-Abnahme bleiben separat zu prüfen; keine Regeländerung oder
      automatische Veröffentlichung in diesem Paket.

- 32 Verbindlicher PR- und Qualitätsschutz — `feat/ap32-merge-protection`,
  PR #48: Ruleset `25003991` durch den Eigentümer aktiviert und lesend bestätigt.
  PR-Pflicht ohne fremde Zustimmung, `Quality gate` von GitHub Actions und
  strikte Zielbranchaktualität sind verbindlich. Roter PR #48 belegt die Sperre;
  aktueller Dependabot-Lauf bleibt offen. Der gezielte Iris-/Galeriefix und
  seine Kaltstartregressionen gehören zum späteren Eigentümerauftrag.
  Vorher/Nachher und reale Läufe: [AP32.md](AP32.md). Status: Schutz aktiviert,
  Restverifikation offen; Dokumentationsintegration über PR #48.

- 33 Dependency-Entscheidungen — `feat/ap33-dependency-decisions`, PR #49:
  aktuelle Registry-Verträge und Originalfehler für #33/#34/#37/#39 getrennt
  dokumentiert; Node 24 und 24er-Typen bleiben erhalten. Entscheidungen,
  Wiederaufnahmebedingungen und Schließempfehlungen: [AP33.md](AP33.md).
  Tracking: [#31](https://github.com/sl3ndrr/m8e-calc/issues/31) (ESLint),
  [#32](https://github.com/sl3ndrr/m8e-calc/issues/32) (Runtime/Material und
  übrige AP24-Migrationen), [#50](https://github.com/sl3ndrr/m8e-calc/issues/50)
  (TypeScript 7). Status: zur Prüfung, keine Migration integriert.
  AP34–AP36 und spätere Migrations-PRs bleiben eigenständig.

