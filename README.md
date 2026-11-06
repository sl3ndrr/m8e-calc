# m8e-calc

Lokaler Taschenrechner für Desktop-Browser mit vier Modi. Die App speichert Einstellungen und Verlauf im Browser und rechnet auf dem Gerät.

[Im Browser öffnen](https://sl3ndrr.github.io/m8e-calc/) · [Architektur](docs/ARCHITECTURE.md) · [Änderungen](CHANGELOG.md)

## Modi

- **Einfach** bietet Grundrechenarten, Prozentrechnung, Speicher und Tastaturbedienung.
- **Wissenschaftlich** unterstützt Ausdrücke, eigene Variablen und Funktionen, komplexe Zahlen, Analysis und ein Informatik-Panel.
- **Umrechner** konvertiert lokale Einheiten mit Favoriten, Verlauf und Schnelleingabe wie `3 ft 4 in to cm`.
- **Graphen** zeichnet explizite, vertikale, parametrische, polare und implizite Kurven. Für unterstützte Kurven gibt es Analysis, Trace und Wertetabelle mit CSV-Export. Der sichtbare Plot lässt sich als PNG exportieren.

Sprache, Darstellung und Akzentfarbe sind einstellbar. Der Präsentationsmodus ist über die Werkzeugleiste oder die Befehlspalette erreichbar. Die Palette öffnet sich mit Strg+K oder Cmd+K. Permalinks teilen einen Moduszustand, der im Link steht. Nach erfolgreichem Precache funktioniert die App offline.

## Ansichten

- Einfach [hell](docs/img/simple-light.png) und [dunkel](docs/img/simple-dark.png)
- Wissenschaftlich [hell](docs/img/scientific-light.png) und [dunkel](docs/img/scientific-dark.png)
- Umrechner [hell](docs/img/convert-light.png) und [dunkel](docs/img/convert-dark.png)
- Graphen [hell](docs/img/graph-light.png) und [dunkel](docs/img/graph-dark.png)

## Lokal entwickeln

Node `>=24.15.0 <25`, npm 11.19.0 und das eingecheckte Lockfile verwenden.

```sh
nvm install
nvm use
npm ci
npm run dev
```

`npm run check` prüft Lint, Format, Typen, Unit-Tests, den Produktionsbuild und die Engine- und Graphbudgets. Browserprüfungen brauchen den Build und installierte Playwright-Browser.

```sh
npx playwright install chromium
npm run build
npm run test:e2e -- --project=chromium
```

Die Arbeitsregeln stehen in [AGENTS.md](AGENTS.md). Fachverträge gibt es für [Engine](docs/ENGINE.md), [Einheiten](docs/UNITS.md) und [Graphen](docs/GRAPH.md). Die [Release-Anleitung](docs/RELEASE.md) beschreibt Screenshots und Pages.

## Technik und Lizenz

React 19, TypeScript, Vite, Zustand und CSS Custom Properties. Die Oberfläche orientiert sich an Material 3 Expressive. Roboto Flex, Roboto Mono, Material Symbols und KaTeX-Schriften werden lokal ausgeliefert.

[Lizenzdatei](LICENSE)

## Mitwirkende

[<img src="https://avatars.githubusercontent.com/u/267193182?s=64&v=4" width="32" height="32" alt="Codex-Profilbild">](https://github.com/codex)

[Codex](https://github.com/codex) hat zu diesem Projekt beigetragen.
