# Roadmap

Die Pakete werden getrennt umgesetzt. Ein Haken bedeutet akzeptiert und integriert; Die Haken werden nach Abnahme und Merge gesetzt.

- [ ] 1 Fundament — Toolchain, Struktur, Platzhalter, CI/Pages und Projektgedächtnis.
- [ ] 2 Theming — Material 3 Expressive, Hell/System/Dunkel, Akzentwahl, Typography-/Shape-/Motion-Fundament und `#/design` (PR `feat/theming`, Details: `DESIGN.md`).
- [ ] 3 Komponenten — Erweiterung des Design-Systems auf Basis der AP2-Tokens und Accessibility-Hardening.
- [ ] 4 App-Shell/Verlauf — Registry und lazy Platzhalter, skalierende Desktop-Shell, persistenter Verlauf mit Suche/Pins/Undo/Export, Einstellungen und de/en/Auto (PR `feat/app-shell`; Abnahme vor Merge).
- [ ] 5 Engine-Kern — Parser, stabiler AST, decimal.js-Auswertung, Registry, Zahlenformat und Fehler mit Bereichen (PR `feat/engine-core`; Vertrag in `ENGINE.md`, Abnahme vor Merge).
- [ ] 6 Einfacher Rechner — herkömmlicher Funktionsumfang, reiner Reducer, Engine-Anbindung und Keypad/Display für AP8 (PR `feat/simple-calculator`; Abnahme vor Merge).
- [ ] 7 Engine wissenschaftlich — wissenschaftliche Registry, komplexe Zahlen, Σ/∫/d/dx, CODATA 2022, Environment und Export (PR `feat/engine-scientific`; Vertrag in `ENGINE.md`, Abnahme vor Merge).
- [ ] 8 Wissenschaftlicher Modus — Editor/Ergebnis, Tastenfeld, Konstanten und persistente Definitionen für Physik/Mathematik (PR `feat/scientific-mode`; Details in `SCIENTIFIC_MODE.md`, Abnahme vor Merge). AP9 ergänzt den Informatik-Kontext.
- [ ] 9 Programmierer-Panel — BigInt-Wörter, BitGrid, Basisanzeige, opt-in Parser, IEEE-754 und Unicode im AP8-Informatik-Kontext (PR `feat/programmer-panel`, Abnahme vor Merge).
- [ ] 10 Einheiten-Engine — 286 Einheiten in 32 Kategorien, Decimal-Umrechnung, Suche/Parser/Compound-Ausgabe und unabhängige Referenz-/Paartests (PR `feat/units-engine`; Vertrag in `UNITS.md`, Abnahme vor Merge).
- [ ] 11 Umrechner.
- [ ] 12 Graph-Engine — reine 2D-Graphberechnung.
- [ ] 13 Graphen-Modus — 2D-Plotter und Interaktion.
- [ ] 14 Komfort — Konstanten, Variablen/eigene Funktionen, Command Palette, Permalinks und zusätzliche UI-Skalierungswahl; Verlauf mit Suche/Pins/Export sowie de/en und proportionale Desktop-Skalierung sind in AP4 vorgezogen.
- [ ] 15 Hardening — PWA/Offline, Datenschutz, Performance, Accessibility und Browserrobustheit.
- [ ] 16 Release — Dokumentation, Abnahme und Veröffentlichung.
- [ ] 17 Währungen (optional) — erst nach Klärung einer datenschutzkonformen Datenstrategie ohne externe Laufzeitrequests.

AP3: Komponentenbibliothek in `src/ui`, Zustandsmatrix im Design-Lab, Tastatur-/axe-Tests und reproduzierbare Galerie-Screenshots; Konventionen in `docs/COMPONENTS.md`. AP4 verwendet diese Bausteine für die Shell.

AP5 zieht die beauftragten reellen wissenschaftlichen Grundfunktionen und eine
erweiterbare Registry vor. AP6/AP8 binden die Result-API einschließlich Fehler-i18n
an die Modi an; AP7 ergänzt komplexe Zahlen, Listen und numerische Analysis.
AP12 nutzt den stabilen AST für den Graph-Kompilierer; AP7 liefert LaTeX und eigene Funktionsdefinitionen im Kern; deren UI folgt in AP8/AP14.


AP11 implementiert den Umrechner auf AP10; Verhalten, Persistenz und Testvertrag stehen in [CONVERT_MODE.md](CONVERT_MODE.md).
