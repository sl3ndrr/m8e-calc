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

AP4 bindet den URL-Hash über `useSyncExternalStore` an die Shell. Die Registry (`src/app/modeRegistry.ts`) enthält pro Modus `id`, lokale Icon-Glyphe, `labelKey`, `React.lazy`-Komponente und transienten `historyAdapter`. Jeder Feature-Einstieg bildet einen eigenen Build-Chunk. `#/design` bleibt als lazy geladenes technisches Lab verfügbar. Leere URLs setzen den im App-Store gemerkten Modus fort (Standard `simple`); explizit unbekannte Routen wählen `simple`.

Die Shell nutzt Grid-Bereiche Rail/Bühne/Verlauf. Ab 1600 px ist die Rail standardmäßig aufgeklappt. Die root-Schrift skaliert mit `clamp(12px, min(0.833333vw, 1.481481vh), 32px)`: 16 px bei Full HD, 32 px bei 4K. Die Höhenbegrenzung hält Ultrawide-Elemente kompakt; zusätzliche Breite steht den Seitenbereichen zur Verfügung. Shapes und Typografie verwenden rem-Tokens. Die Bühne begrenzt ihren Inhalt und stellt einen Inline-Size-Container für modusinterne Container Queries bereit. Unter 1280 px bleiben die Bedienelemente erreichbar.

Moduswechsel benutzen Shared-Axis-Springs aus den zentralen Expressive-Tokens (`motion/react`). Ausgehende Inhalte sind während ihrer Exit-Animation inert und für Assistenztechnik verborgen. Der docked-Verlauf verändert die Grid-Spalte über `useSpring`. Reduced Motion verwendet für Modus-/Eintragswechsel nur Opacity; Layoutwechsel erfolgen sofort. Off verzichtet auf Animation. OS-Präferenzen begrenzen gespeichertes Full.

### Verlauf-API

`src/shared/historyStore.ts` persistiert unter `m8e-calc.history` mit Schema-Version 1. Ein Eintrag besteht aus `{ id, mode, ts, input, result, pinned, payload }`; Payloads sind JSON-Werte und werden beim Hinzufügen kopiert. `ts` sind Epoch-Millisekunden. Die globale Obergrenze ist 500, das einstellbare Limit 1–500. Pins werden bei gewöhnlicher Verdrängung bevorzugt erhalten; auch ausschließlich angeheftete Einträge überschreiten das Limit nicht. Die Ansicht zeigt nur den aktuellen Modus; Sichtbarkeit wird für alle vier Modi separat gespeichert. Version 0 migriert `timestamp` zu `ts`. Rehydration validiert Einträge und entfernt Duplikate; zukünftige Versionen und beschädigte Daten werden verworfen. Storage-Fehler lassen die Oberfläche im Speicher weiter funktionieren.

```tsx
const onRestore = useCallback((entry: HistoryEntry) => {
  // Die Feature-UI validiert entry.payload und setzt ihren Eingabezustand.
}, []);
const { entries, add, restore } = useModeHistory('simple', onRestore);
add({ input: '2 + 3', result: '5', payload: { expression: '2 + 3' } });
```

Der Hook registriert den Restore-Callback nur während der Lebenszeit des Features. Stabile Callbacks verwenden; Cleanup entfernt nur die eigene Registrierung. `restore(entry)` liefert false für einen fremden Modus oder ohne Adapter-Registrierung. Platzhalter registrieren keine Restore-Funktion und erzeugen keine Einträge. Eine verständliche Nachricht erklärt noch nicht unterstützte Wiederherstellung. Spätere Features müssen ihre Payload-Version selbst validieren.

`HistorySheet` ist ab 1440 px ein benanntes Aside, darunter ein React-Aria-Modal mit Fokuscontainment und Escape. Strg+H schaltet die Sichtbarkeit um; in Einstellungen ist das Kürzel ausgesetzt. Suche und lokale Tagesgruppen liegen in reinen Hilfsfunktionen. Pins, Einzel-Löschen, Clipboard und JSON/CSV/Markdown-Export sind implementiert. CSV-Zellen werden gequotet und Formeleingaben neutralisiert; Markdown escaped Tabellenzeichen. Alles-Löschen erhält eine Undo-Snapshot-Aktion ohne Ablaufzeit und führt sie mit inzwischen hinzugefügten Einträgen zusammen. Export umfasst den aktuellen Modus, unabhängig vom Suchfilter; Einstellungen können sämtliche Modi leeren.

### Einstellungen und i18n-Konvention

Settings-Version 2 ergänzt Sprache (`auto/de/en`), Dezimaltrennzeichen (`auto/comma/point`), Gruppierung und Verlaufslimit. Version 0/1 wird migriert; Theme-Bootstrap erkennt auch Version 2 vor dem ersten Paint. Export enthält `{ version, settings }`; Import prüft Schema und vorhandene Felder vor einer Zustandsänderung. Alles-Zurücksetzen löscht Einstellungen, Verlauf/Sichtbarkeit und zuletzt verwendeten Modus nach Bestätigung im Dialog.

`src/shared/i18n/de.ts` ist die Schlüsselquelle. `Dictionary` verlangt alle Schlüssel und Pluralformen in `en.ts`; fehlende Übersetzungen brechen den Typecheck. Neue Aufrufer verwenden `t(key, params)` mit der aktiven Sprache; `t(key, locale, params)` bleibt für vorhandene Komponenten verfügbar. Platzhalter heißen `{name}`; Pluraltexte enthalten `one` und `other` und verwenden `Intl.PluralRules`. Datums-/Zeit- und Zahlenformatierung erfolgt über `Intl`, Dezimaltrennzeichen und Gruppierung über `formatNumber(value, locale, preferences)`. Auto wählt Englisch für `en-*`, sonst Deutsch. Sprache setzt `html.lang`, Dokumenttitel und React-Aria-`I18nProvider` und wird über Settings persistiert. UI-Texte und ARIA-Namen werden ausschließlich als Schlüssel gepflegt.

Für Folgepakete: Benutzereingabe → reine UI-Funktion/Reducer → Domäne → typisiertes Ergebnis/Fehler → Store/Ansicht. Fehler werden in der UI über i18n angezeigt. DOM-Zugriffe und Seiteneffekte bleiben in Adaptern. Domänen können ohne Browser getestet und später bei Bedarf in Worker eingebunden werden.

## Routing, Build und Hosting

Hash-Routing benötigt keine Pages-Rewrites. Vite erzeugt Assets relativ zum Base-Pfad `/m8e-calc/`, überschreibbar über `VITE_BASE_PATH`. Pages erhält ausschließlich `dist/`. Keine externen Requests zur Laufzeit; Fonts sind selbst gehostete, subsettete Variable-Fonts mit Preloads. Tokens liegen zentral in `src/styles`, generiert mit `npm run tokens`. AP2 liefert das Material-3-Expressive-Fundament und zwei Theme-Komponenten; weitere Komponenten folgen in AP3. Das Inline-Bootstrap in `index.html` wird von Vite vor App-JavaScript eingefügt und stellt den passenden Modus mit validiertem Farbcache vor dem ersten Paint her.

`tsconfig.app.json` prüft Browsercode, `tsconfig.node.json` Tooling/E2E und `tsconfig.domain.json` reine Domänen. `tsc -b` prüft alle drei. ESLint/Prettier, Vitest und Produktionsbuild laufen über `npm run check`; Playwright prüft danach Base-Pfad, alle Hash-Routen, Tastaturfokus, Laufzeitfehler und externe Requests.

## Deployment und Betrieb

CI läuft bei PRs und Pushes auf main. Pages baut bei Push auf main, prüft vor Upload und deployt mit OIDC in `github-pages`. In GitHub Settings → Pages ist die Quelle GitHub Actions zu aktivieren. Nach Merge den Workflow und die URL `https://sl3ndrr.github.io/m8e-calc/` prüfen. Ein grüner PR-Smoke belegt die lokale Auslieferung des Produktionsbuilds, nicht bereits ein öffentliches Deployment.

Wöchentliche Dependabot-Updates werden getrennt für npm und GitHub Actions gruppiert. Architektur- und Konventionsänderungen müssen in dieser Datei und `AGENTS.md` dokumentiert werden.

## AP4-Verifikation

Die Shell-Browserprüfungen warten auf den aktiven Modus, vollständige Opacity und die Zielbreite des angedockten Panels. Neben Dokument- und Container-Überläufen werden Panel-Grenzen im Viewport geprüft. Reproduzierbare Referenzaufnahmen: [Full HD](screenshots/app-shell-1920.png), [QHD](screenshots/app-shell-2560.png), [4K](screenshots/app-shell-3840.png) und [Ultrawide](screenshots/app-shell-3440.png). `e2e/app-shell.spec.ts` erzeugt sie erneut; CI bewahrt zusätzliche Browser-/Galerie-Artefakte auf.
