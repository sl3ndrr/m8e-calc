# Architektur

## Schichten

| Schicht            | Ordner                                           | Verantwortung / Abhängigkeiten                                                                                       |
| ------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Einstieg und Shell | `src/main.tsx`, `src/app`                        | React-Bootstrap, Browseradapter und Hash-Routing; orchestriert Features und Shared.                                  |
| Präsentation       | `src/ui`, `src/styles`                           | Zugängliche Komponenten und zentrale CSS-Tokens. Keine fachliche Engine.                                             |
| Features           | `src/features/{simple,scientific,convert,graph}` | Modus-UI, reine UI-Funktionen/Reducer und Adapter zu Domänen/Store. In AP1 nur reserviert.                           |
| App-Dienste        | `src/shared`                                     | Zustand und typisierte i18n (`de` Standard, `en`); allgemeine Utilities.                                             |
| Domänen            | `src/engine`, `src/units`, `src/graph`           | Reines TypeScript, keine React-/DOM-/Store-Abhängigkeit; künftig Berechnung, Umrechnung und Graphdaten. In AP1 leer. |
| Verifikation       | Tests neben Modulen, `src/test`, `e2e`           | Verhalten, Eigenschaften und Produktionsbuild im Browser.                                                            |

Domänen dürfen reine Domänenmodule verwenden. Imports in App, UI, Features, Shared oder Styles sind verboten. ESLint sperrt React, DOM-Globals, Zustand, dynamische Imports, `require` und TS-Import-Ausdrücke; `.tsx` wird in Domänen abgelehnt. Ein eigenes TypeScript-Projekt ohne DOM-Library und automatische Umgebungstypen ergänzt diese Grenze. Neue Aliase dürfen die Importregel nicht umgehen und müssen dort ergänzt werden.

## Datenfluss

Im Fundament: URL-Hash → reine Funktion `parseHash` → Modus der Ansicht → aktive Navigationsbeschriftung. `useSyncExternalStore` bindet `hashchange` an React an. Alle vier Routen zeigen dieselbe Platzhalterseite. Ungültige/leere Hashes wählen Einfach, ohne zusätzliche Navigation.

Der App-Store hält die Sprache; der separate Settings-Store persistiert Theme, Akzent, Schema-Variante, Kontrast und Motion mit validierter Migration (Version 1). `src/app/theme.ts` ist der Browseradapter für Media Queries, CSS-Rollen, Theme-Meta und View Transitions. Details stehen in `docs/DESIGN.md`. Store-Sprache → typisierte i18n-Schlüssel → Texte, Dokumenttitel und `lang`. Es gibt keinen Verlauf und keine Rechenzustände. `#/design` ergänzt die technischen Hash-Routen für das Design-Lab; unbekannte Hashes zeigen weiterhin Einfach.

Für Folgepakete: Benutzereingabe → reine UI-Funktion/Reducer → Domäne → typisiertes Ergebnis/Fehler → Store/Ansicht. Fehler werden in der UI über i18n angezeigt. DOM-Zugriffe und Seiteneffekte bleiben in Adaptern. Domänen können ohne Browser getestet und später bei Bedarf in Worker eingebunden werden.

## Routing, Build und Hosting

Hash-Routing benötigt keine Pages-Rewrites. Vite erzeugt Assets relativ zum Base-Pfad `/m8e-calc/`, überschreibbar über `VITE_BASE_PATH`. Pages erhält ausschließlich `dist/`. Keine externen Requests zur Laufzeit; Fonts sind selbst gehostete, subsettete Variable-Fonts mit Preloads. Tokens liegen zentral in `src/styles`, generiert mit `npm run tokens`. AP2 liefert das Material-3-Expressive-Fundament und zwei Theme-Komponenten; weitere Komponenten folgen in AP3. Das Inline-Bootstrap in `index.html` wird von Vite vor App-JavaScript eingefügt und stellt den passenden Modus mit validiertem Farbcache vor dem ersten Paint her.

`tsconfig.app.json` prüft Browsercode, `tsconfig.node.json` Tooling/E2E und `tsconfig.domain.json` reine Domänen. `tsc -b` prüft alle drei. ESLint/Prettier, Vitest und Produktionsbuild laufen über `npm run check`; Playwright prüft danach Base-Pfad, alle Hash-Routen, Tastaturfokus, Laufzeitfehler und externe Requests.

## Deployment und Betrieb

CI läuft bei PRs und Pushes auf main. Pages baut bei Push auf main, prüft vor Upload und deployt mit OIDC in `github-pages`. In GitHub Settings → Pages ist die Quelle GitHub Actions zu aktivieren. Nach Merge den Workflow und die URL `https://sl3ndrr.github.io/m8e-calc/` prüfen. Ein grüner PR-Smoke belegt die lokale Auslieferung des Produktionsbuilds, nicht bereits ein öffentliches Deployment.

Wöchentliche Dependabot-Updates werden getrennt für npm und GitHub Actions gruppiert. Architektur- und Konventionsänderungen müssen in dieser Datei und `AGENTS.md` dokumentiert werden.
