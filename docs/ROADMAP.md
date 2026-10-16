# Roadmap

Die Pakete werden getrennt umgesetzt. Ein Haken bedeutet integriert (Merge auf `main`); manuelle Produkt-/Pages-Abnahmen sind separat dokumentiert und werden dadurch nicht als bestanden erklärt. Stand: 16.10.2026.

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
- [ ] 16 Release — Dokumentation, Bildskript, Version 1.0.0, Changelog und Lizenzvorschlag in `feat/release` vorbereitet. Review, MIT-Bestätigung, finale Checks, Pages-Abnahme und Veröffentlichung stehen aus; siehe [RELEASE.md](RELEASE.md).
- [ ] 17 Währungen (optional) — `feat/currency`: explizites Opt-in, EZB/Frankfurter-v2-Provider, Cache und Offline-Fallback. Abnahme über PR/CI; Details in `UNITS.md`.

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

AP1–AP15 sind über die gemergten PRs #1, #3, #5–#10, #13–#16 und #18–#20 auf `main` integriert. AP17 ist in `feat/currency` vorbereitet, noch nicht gemergt. Die früheren Abnahmevorbehalte in den Paketbeschreibungen sind durch diesen Integrationsstand ersetzt; offene Qualitätsgrenzen bleiben im [QA-Bericht](QA_REPORT.md).

AP17 Folge-Issues: versionierte Währungs-Snapshots für Verlauf, Favoriten und Permalinks.

- [x] 18 UI-Bereinigung und dezentes Teilen — PR #25 ist auf main integriert:
      eine Modus-H1, kompakte Werkzeugzeilen und zugängliche Teilen-Aktion.
      Vertrag und Bildreproduktion in `COMFORT.md`.
- [ ] 19 Vollständige Ziffernanzeige und konstante Rechentastenformen —
      `feat/ap19-calculator-rendering`; Clip-/Breitenkonzept, Browserregression
      und Animationsnachweise in [AP19.md](AP19.md). Abnahme über PR/CI,
      Merge steht aus. Checkboxen und Designlab-Auslieferung bleiben getrennte
      Pakete; Graph-Fit bleibt AP21.

- [ ] 20 Controls-Polish — `feat/ap20-controls-polish`: gemeinsame Checkbox
      zentriert und dezent animiert; ThemeSwitch ohne Zusatzindikator.
      Tests und UI-Nachweise in [AP20.md](AP20.md); Integration erst nach Merge.
