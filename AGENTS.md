# Projektgedächtnis: m8e-calc

## Auftrag und Scope

m8e-calc ist ein datenschutzfreundlicher Desktop-Browser-Taschenrechner. Die verbindliche Produktvision steht in `docs/PRODUCT_SPEC.md`, die Schichten in `docs/ARCHITECTURE.md`, die Paketfolge in `docs/ROADMAP.md`. AP1 legt die Toolchain an; AP2 liefert Theming und Design-Tokens gemäß `docs/DESIGN.md`. AP4 liefert die App-Hülle mit Registry, persistentem Verlauf, Einstellungen und i18n. AP5 liefert den reinen Rechenkern in `src/engine`; Vertrag und konservative Entscheidungen stehen in `docs/ENGINE.md`. Die vier Modi bleiben bis zu ihren UI-Paketen Leerzustände.

## Arbeitsumgebung und Befehle

Node 24 LTS (`nvm use`), npm und das eingecheckte `package-lock.json` verwenden. Installation: `npm ci`.

| Befehl                        | Zweck                                                                  |
| ----------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                 | Vite-Entwicklungsserver                                                |
| `npm run build`               | TypeScript prüfen und Produktionsbuild nach `dist/`                    |
| `npm run preview`             | Produktionsbuild lokal ausliefern                                      |
| `npm run lint`                | ESLint und Prettier-Formatprüfung                                      |
| `npm run typecheck`           | Alle TypeScript-Projekte prüfen                                        |
| `npm run test`                | Vitest, Testing Library und Property-Tests                             |
| `npm run test:engine:bench`    | Parse + Eval typischer Ausdrücke; nach Warm-up jeweils unter 1 ms      |
| `npm run test:e2e`            | Playwright mit Chromium gegen den vorher erstellten Build              |
| `npm run screenshots:gallery` | Galerie und Overlays in Hell/Dunkel aufnehmen (Preview vorher starten) |
| `npm run check`               | lint + typecheck + test + build + Engine-Benchmark                     |

Einmalig für E2E: `npx playwright install chromium` (Linux-CI: `--with-deps`). Vor E2E `npm run build` ausführen. Formatieren: `npx prettier --write .`. `VITE_BASE_PATH` überschreibt den Standard `/m8e-calc/`; als absoluter Pfad mit führendem und abschließendem Slash setzen. Der Pages-Smoke prüft bewusst den Standardpfad.

## Architektur und Ordnerregeln

- `src/app`: Bootstrap, Hash-Routing und später App-Shell. Browseranbindung bleibt hier oder in UI-Adaptern.
- `src/ui`: wiederverwendbare, zugängliche Design-System-Komponenten; keine fachliche Rechenlogik.
- `src/styles`: CSS-Dateien, Custom Properties und zentrale Tokens. Kein Tailwind und kein UI-Framework.
- `src/engine`, `src/units`, `src/graph`: ausschließlich reines TypeScript (`.ts`), ohne React, DOM, Zustand oder Imports aus App/UI/Features/Shared/Styles. ESLint erzwingt Import- und Browserverbote; `tsconfig.domain.json` enthält keine DOM-Library und keine automatischen Umgebungstypen. Keine dynamischen Imports oder `require` zum Umgehen dieser Grenze. Domänen dürfen andere reine Domänenmodule importieren, niemals UI-Adapter.
- `src/features/{simple,scientific,convert,graph}`: Modus-spezifische UI und Adapter zu den reinen Domänen.
- `src/shared`: Zustand-Store, typisierte i18n-Dictionaries und allgemeine Hilfsfunktionen. UI-unabhängige Fachlogik gehört in die Domänen.
- `src/test`: gemeinsame Testinitialisierung; Unit-Tests neben dem geprüften Modul; `e2e/`: Browserprüfungen.
- `docs/`: Produkt, Architektur, Roadmap und Entscheidungen. Keine Planung ausschließlich im Chat.

Engine-Einstieg: `src/engine/index.ts`. Öffentlicher readonly AST und Result-API gemäß
`docs/ENGINE.md`; keine inkompatiblen AST-Änderungen ohne Vertragsänderung. Private
decimal.js-Konfiguration: 50 Stellen, Anzeige 15; Kontextstandard `rad`/`strict`.
Eigene Funktionen als Registry-Einträge. Eingabelokalisierung bleibt im UI-Adapter.
Engine-Tests laufen in einem separaten Vitest-Node-Projekt ohne UI-Testsetup.

Datenfluss: Benutzereingabe → reine UI-Funktion/Reducer → Domäne → Ergebnis → Store/React → Ansicht. Keine fachlichen Seiteneffekte beim Rendern. Hash-Routen: `#/simple`, `#/scientific`, `#/convert`, `#/graph`, technisches Design-Lab `#/design`; leerer Hash setzt den zuletzt genutzten Modus fort (Standard Einfach); unbekannter Hash zeigt Einfach. Keine serverseitigen Rewrites voraussetzen.

## Konventionen und verbindliche Regeln

1. **Datenschutz:** Keine externen Requests zur Laufzeit. Assets lokal ausliefern, Fonts selbst hosten; bis dahin Systemfonts. Keine CDNs, Analytics oder entfernten Rechenservices. Entwicklungs- und CI-Paketdownloads sind davon getrennt.
2. **i18n:** Alle UI-Texte einschließlich Titel, ARIA-Beschriftungen und Fehlermeldungen über i18n-Schlüssel, niemals hartkodiert. `de` ist Fallback, Auto erkennt `navigator.language`; `en` vollständig pflegen. `MessageKey` wird aus `src/shared/i18n/de.ts` abgeleitet, neue Texte in beiden Dictionaries ergänzen. Technische Fehler für Entwickler dürfen außerhalb sichtbarer UI stehen.
3. **Tokens:** Keine Farbwerte in Komponenten oder Feature-CSS; Farben ausschließlich über `--md-sys-color-*`. Formen und Bewegung ausschließlich über Shape- und Motion-Tokens (`--md-sys-shape-*`, `--md-sys-motion-*`). Tokenwerte zentral in `src/styles`. `prefers-reduced-motion` respektieren. AP2 liefert zentrale Farbrollen, Typografie, Shape- und Spring-Tokens; `npm run tokens` regeneriert `src/styles/tokens.css`. Neue Icons erfordern Font-Subsetting gemäß `docs/DESIGN.md`; AP3 liefert die Komponenten; AP4 nutzt die Registry in `src/app/modeRegistry.ts`, `useModeHistory(mode, onRestore)` und versionierten Verlauf (maximal 500); öffentliche API und Beispiele stehen in `docs/COMPONENTS.md`. Neue Modus-UI verwendet die Bausteine aus `src/ui/index.ts`.
4. **Tests und Logik:** Jede Logik bekommt Tests. UI-Logik als reine Funktionen/Reducer, getrennt von Komponenten. Komponenten orchestrieren Rendering und Browseradapter. Vitest für Logik, Testing Library für UI-Verhalten, fast-check für sinnvolle Eigenschaften, Playwright für Integration im Browser. Keine Rechenengine als Nebenaufgabe hinzufügen.
5. **Barrierefreiheit:** Vollständige Tastaturbedienung, sichtbarer Fokus, semantisches HTML und geeignete ARIA-Beschriftungen; Text- und Fokuskontrast prüfen. Animationen dürfen Bedienung nicht blockieren.
6. **Scope-Disziplin:** Nur das beauftragte Paket umsetzen. Restpunkte als Liste **„Offen / Folge-Issues“** in die PR-Beschreibung aufnehmen. Folgepakete in der Roadmap dokumentieren.
7. **PR-Konventionen:** Branch `feat/<paket>` (AP1: `feat/foundation`), Conventional Commits. PR-Beschreibung enthält **Was / Warum / Test / Screenshots** (bei UI) sowie **Offen / Folge-Issues**. Bei Architektur- oder Konventionsänderungen `docs/` und `AGENTS.md` aktualisieren. Keine Änderungen direkt auf `main`, außer der einmaligen Initialisierung des zuvor leeren Repositories.
8. **Definition of Done:** `npm run check` grün, CI einschließlich Chromium-Smoke grün, Doku aktuell. Ein konfigurierter Workflow ist kein Beleg für einen erfolgreichen Lauf. Pages-Erreichbarkeit nach Merge getrennt anhand des Deployments prüfen.

TypeScript: `strict` und `noUncheckedIndexedAccess` bleiben aktiv. Explizite Typen an Modulgrenzen, keine pauschalen `any`- oder Non-null-Assertions. React 19, Zustand, npm; Flat ESLint mit typescript-eslint, react-hooks und jsx-a11y, Prettier. Dateinamen: Komponenten PascalCase, Funktionen/Module camelCase; CSS separat. Lockfile bei Abhängigkeitsänderungen aktualisieren.

## CI und GitHub Pages

`ci.yml` prüft PRs und Pushes auf `main`: `npm ci`, lint, typecheck, test, build und Playwright-Smoke. `pages.yml` prüft auf `main` ebenfalls den Build einschließlich Checks/Smoke, lädt ausschließlich `dist/` hoch und deployt über GitHub Pages. Deployment nutzt `pages: write`, `id-token: write`, die Umgebung `github-pages` und eine Concurrency-Gruppe. In Repository Settings → Pages muss **GitHub Actions** als Quelle eingestellt sein. Hostingpfad: `/m8e-calc/`. Im PR nicht mergen; Deployment wird erst durch den Merge ausgelöst.
