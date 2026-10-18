# Changelog

Aktueller belegter Integrations-/Freigabestand: [AP38](docs/AP38.md).

Alle wesentlichen Änderungen werden hier dokumentiert. Das Format folgt
[Keep a Changelog](https://keepachangelog.com/de/1.1.0/), die Versionierung
[Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Changed

- AP17–AP24 integriert: optionale Währungen mit explizitem Opt-in, kompakte
  Werkzeugleisten/Teilen, vollständige Ziffern, stabile Tasten und Checkboxen,
  Systemtheme ohne Zusatzicon, stabiles Graph-Fit, lokalisierte gerundete
  Tabellen, internes Designlab und Dependency-Wartung.
- AP25 integriert: browserübergreifende Produktregressionen und historische
  Abnahmebilder in [AP25](docs/AP25.md); manuelle Live-Abnahme bleibt AP39.
- AP26/AP27: implizite Konturen, Worker/Canvas, gemeinsame Budgets und Diagnosen,
  PNG und kompatible Textpersistenz; begrenztes Fit auf stabiler Basis.
  Keine implizite Analysis, Trace oder mehrwertige Tabelle und keine universelle
  Vollständigkeitsgarantie.
- AP28: begrenzte Drag-Samplingfrist und feste Performance-/Negativkontrollen.
- AP29: netzgebundener passiver Buildnachweis auch unter aktivem Produktionsworker.
- AP30: kleinerer Startgraph durch direkte Engine- und geteilte i18n-Imports.
- AP31/AP32: gemeinsamer CI-/Pages-Freigabepfad und aktivierter PR-Schutz;
  erfolgreiche Veröffentlichung der neuen Kette und Dependabot-Restprüfung offen.
- AP33: belegte Dependency-Entscheidungen bei unverändertem Node-24-Vertrag;
  getrennte Migrationen bleiben offen.
- AP37: verständliche, persistierte Quellencheck-Diagnosen bei unverändert
  blockierendem externen Gate. AP38 gleicht Produkt-/Release-Dokumentation ab.
  Keine neue Version, kein Release oder Tag daraus abgeleitet.

### Fixed

- Farbauswahl: stabiler Ladedialog und Iris-Anfangsfokus beim kalten Lazy-Import
  (PR #48). Quellenzuordnung und ereignisgebundene Live-Animationsmessung
  korrigiert (PR #49, #51/#52), ohne mathematische Erwartungswerte zu ändern.
- Wissenschaftlicher Editor: Esc leert und Enter wertet auch bei offenen
  Vorschlägen aus; die Standard-Completion-Belegung verdrängt diese
  Rechneraktionen nicht mehr. AP25 ergänzt gezielte Adapter-/Browserregressionen.

## [1.0.0] – Veröffentlichung vorbereitet, noch nicht veröffentlicht

AP16-Vorbereitungsstand. Seither integrierte, noch nicht als GitHub Release
veröffentlichte Änderungen stehen unter „Unreleased“. Ein erfolgreicher
Pages-Deploy ist davon getrennt. Vor tatsächlichem Tag/Release diese
Abschnitte zusammenführen und Datum/Versionsumfang ausdrücklich freigeben.

### Added

- Vier Modi: Einfach, Wissenschaftlich mit Informatik-Panel, Einheitenumrechner und interaktive 2D-Graphen.
- Lokaler Verlauf mit Suche, Pins, Wiederherstellung und JSON-Export.
- Deutsche und englische Oberfläche, Hell/System/Dunkel, Akzentwahl, UI-Größe und Präsentation.
- Befehlspalette, Tastenkürzel, Permalinks und PWA mit Offline-Cache.
- Release-Dokumentation sowie reproduzierbare Screenshots und Social Preview.
- MIT-Lizenzentwurf zur Bestätigung durch den Repository-Eigentümer.

### Changed

- Version von 0.1.0 auf 1.0.0 gesetzt; README und Roadmap auf den integrierten Stand gebracht.

### Fixed

- Das integrierte AP15-Hardening behebt Fehlerbehandlung, Kontraste, Fokus-/ARIA-Probleme und Ressourcen-Cleanup; Details und Messnachweise im [Qualitätsbericht](docs/QA_REPORT.md).

Dies ist die erste vorbereitete öffentliche Version. Die Release-Vorbereitung
ändert keine Produktfunktionen. Datum und Vergleichslinks werden beim tatsächlichen
Taggen ergänzt; ein Tag oder GitHub Release wird durch diesen PR nicht erstellt.

