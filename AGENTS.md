# Arbeitsregeln für m8e-calc

## Befehle

- Node `>=24.15.0 <25`, npm 11.19.0, `npm ci` mit dem eingecheckten Lockfile.
- `npm run dev` startet Vite. `npm run build` erstellt `dist/`, `npm run preview` liefert den Build aus.
- `npm run lint`, `npm run typecheck`, `npm run test` und `npm run build` sind einzeln ausführbar. `npm run check` umfasst sie und die Engine- und Graphbudgets.
- Vor `npm run test:e2e -- --project=chromium` bauen und `npx playwright install chromium` ausführen. Unter Linux bei Bedarf `--with-deps` verwenden.
- `npm run tokens` regeneriert die zentralen CSS-Tokens. `npm run screenshots` erzeugt die Release-Bilder aus dem Produktionsbuild.
- Pipeline-Verträge separat mit `node --test scripts/ci/*.test.mjs` prüfen.

## Architektur-Invarianten

- `src/engine`, `src/units` und `src/graph` enthalten browserfreies TypeScript. Domänen dürfen reine Domänenmodule importieren. React, DOM, Zustand, App, Features, Shared und UI bleiben außerhalb. Die Domain-TSConfig und ESLint prüfen diese Grenze.
- Rechnen und Konvertieren bleiben lokal. Die CSP erlaubt Verbindungen zur eigenen Origin. Fonts, Assets und Worker werden lokal ausgeliefert. Der Service Worker versorgt auch die lazy geladenen Modi.
- Modus-UI und Workeradapter liegen in `src/features`. Die Shell lädt schwere Modi und Editoren bei Bedarf. `dist/` ist das Produktionsziel. `dist-gallery/` ist der separate interne Build.
- Vorschauen dürfen keinen persistenten Fachzustand ändern. Versionierte Einstellungen, Verläufe und Permalinks brauchen explizite Migration oder Validierung.
- Texte einschließlich Fehlermeldungen und ARIA-Namen in Deutsch und Englisch ergänzen. Komponenten wiederverwenden. Farben, Form und Bewegung über zentrale Tokens steuern und reduzierte Bewegung respektieren.

## Änderungen und Prüfungen

- Kleine, thematische Conventional Commits auf einem eigenen Branch. PRs dokumentieren Änderung, Grund und ausgeführte Prüfungen. Bei UI-Änderungen Bilder oder Browser-Artefakte ergänzen.
- Typstrenge, Barrierefreiheit, Tests, Referenzbilder und Budgets an ihrer fachlichen Bedeutung messen. Bei Änderungen an Mathematik, Persistenz oder Workerprotokollen die betroffenen Verträge und Regressionen mitpflegen.
- Bei blockierter lokaler Toolchain die Prüfungen auf dem eigenen Branch über einen Entwurfs-PR ausführen. Status nur für die tatsächlich geprüfte Revision melden.
- Der `Quality gate` verlangt Erfolg seiner definierten Jobs. Pages erhält nur das geprüfte Produktionsartefakt aus einem aktuellen Push auf `main` im Ursprungsrepo. Merge, Release, Tag und Deployment erfordern einen Auftrag.

[Architektur](docs/ARCHITECTURE.md) · [Engine](docs/ENGINE.md) · [Einheiten](docs/UNITS.md) · [Graphen](docs/GRAPH.md) · [Release](docs/RELEASE.md)
