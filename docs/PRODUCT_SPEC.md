# Produktspezifikation: m8e-calc

## Ziel und Nutzungskontext

m8e-calc ist ein Taschenrechner für den Browser am Desktop. Die Oberfläche wird für große Monitore von Full HD bis 4K und Ultrawide optimiert: großzügige, gut lesbare Arbeitsflächen und effizient nutzbarer Platz statt einer vergrößerten mobilen Oberfläche. Das Produkt wird statisch über GitHub Pages unter `/m8e-calc/` gehostet; es benötigt weder Backend noch Routing-Rewrites.

Das visuelle Ziel ist Material 3 Expressive. Ansprechendes Design, gute Handhabung und schöne, verständliche Animationen sind zentrale Qualitätsmerkmale. Bewegung unterstützt Orientierung und Feedback; bei reduzierter Bewegung bleibt jede Funktion zugänglich. Tastaturbedienung, sichtbarer Fokus, semantische Beschriftungen und ausreichende Kontraste gehören zum Produkt.

## Vier Modi

| Modus            | Ziel und Umfang                                                  |
| ---------------- | ---------------------------------------------------------------- |
| Einfach          | Herkömmlicher Taschenrechnerumfang für alltägliche Berechnungen. |
| Wissenschaftlich | Werkzeuge für Studierende der Physik, Informatik und Mathematik. |
| Umrechner        | Große Auswahl von Einheiten mit nachvollziehbaren Umrechnungen.  |
| Graphen          | 2D-Plotter zur Darstellung und Untersuchung von Funktionen.      |

In jedem Modus kann der Berechnungsverlauf ein- und ausgeblendet werden. Moduswechsel erfolgen über Hash-Routen: `#/simple`, `#/scientific`, `#/convert`, `#/graph`. Leere Hashes setzen den zuletzt genutzten Modus fort (Standard Einfach), unbekannte Hashes führen zur Ansicht Einfach.

## Personalisierung

Ein 3-Wege-Schalter bietet **Hell / System / Dunkel**. Die mittlere Position folgt der Systemeinstellung einschließlich späterer Änderungen. Die Akzentfarbe ist frei wählbar; abgeleitete Farbtokens müssen lesbare Kontraste sichern. Die Oberfläche wird auf Deutsch und Englisch angeboten, Auto erkennt Englisch aus `navigator.language`, sonst gilt Deutsch als Fallback. UI-Größe (80–150 %), Präsentation, Command Palette, Permalinks und Offline-Nutzung sind in AP14 umgesetzt; Details in `COMFORT.md`.

## Geplante Zusatzfeatures

- Programmierer-Panel.
- Konstanten, Variablen und eigene Funktionen.
- Summen (Σ), Integrale (∫) und Ableitungen (d/dx).
- Komplexe Zahlen.
- Verlauf mit Suche, Pins und Export.
- Command Palette und Permalinks.
- PWA und Offline-Nutzung.
- UI-Skalierung, Deutsch und Englisch.
- Währungen optional in AP17; Datenquelle, Aktualisierung und Offline-Verhalten müssen vorab mit der Regel „keine externen Requests zur Laufzeit“ vereinbar festgelegt werden.

## Technische Leitplanken

Vite, React 19, TypeScript mit `strict` und `noUncheckedIndexedAccess`, npm und aktuelle Node-LTS (AP1: 24). Zustand für App-State. CSS-Dateien und Custom Properties ohne Tailwind oder UI-Framework. Domänen für Rechnen, Einheiten und Graphen sind reines TypeScript ohne React/DOM. Alle Assets werden lokal ausgeliefert; Fonts bei Verwendung selbst hosten. Keine externen Requests zur Laufzeit.

Qualitätssicherung: ESLint Flat Config (typescript-eslint, react-hooks, jsx-a11y), Prettier, Vitest, Testing Library, fast-check und Playwright mit Chromium. PR-CI und Pages-Deployment sind Teil des technischen Fundaments.

## Lieferumfang AP1: Fundament

AP1 liefert Projektstruktur, Toolchain, Hash-Routing zu einer gemeinsamen Platzhalterseite, minimale zentrale CSS-Tokens, i18n-Grundlage, Zustand-Grundlage, Tests, CI, Pages-Workflow und Projektgedächtnis. Es entsteht **keine Rechenfunktion**. Theming und Design-System folgen in AP2/AP3, die vollständige Shell und der Verlauf in AP4.

Akzeptanz: `npm run check` lokal und in CI grün, Chromium-Smoke lädt den Produktionsbuild unter `/m8e-calc/`, Doku aktuell. Nach Merge und erfolgreichem Pages-Deployment ist die Platzhalterseite am Pages-Pfad erreichbar.

