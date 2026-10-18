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

### AP5-Rechenkern

`src/engine/index.ts` exportiert Parser, stabilen readonly AST, Auswerter,
Funktionsregistry und Zahlenformatierung. [ENGINE.md](ENGINE.md) enthält EBNF,
Präzedenz, Result-API, Fehlercodes mit UTF-16-Bereichen und numerische Grenzen.
Der Kern verwendet private decimal.js-Kopien (50 Stellen, 80 Schutzstellen für
Winkelreduktion); die globale Konfiguration bleibt unabhängig. Anzeige und
lokalisierte Zahleneingaben haben eigene reine Hilfsfunktionen. Kontext enthält
Variablen, ans, Winkel-/Prozentmodus und zusätzliche Registry-Einträge. Graph und
LaTeX können den AST später direkt verwenden. UI-Adapter und Modusinhalte folgen
ihren Paketen. Die Engine hat ein eigenes Vitest-Node-Projekt ohne DOM-Testsetup;
alle bestehenden UI- und Chromium-Prüfungen bleiben im Gesamtcheck.

## Datenfluss

AP4 bindet den URL-Hash über `useSyncExternalStore` an die Shell. Die Registry (`src/app/modeRegistry.ts`) enthält pro Modus `id`, lokale Icon-Glyphe, `labelKey`, `React.lazy`-Komponente und transienten `historyAdapter`. Jeder Feature-Einstieg bildet einen eigenen Build-Chunk. `#/design` ist ausschließlich in Entwicklung und im expliziten Galerie-Testbuild verfügbar. Im normalen Build fällt die Route auf Einfach zurück; der Lab-Import wird beim Bauen entfernt. Leere URLs setzen den im App-Store gemerkten Modus fort (Standard `simple`); explizit unbekannte Routen wählen `simple`.

Die Shell nutzt Grid-Bereiche Rail/Bühne/Verlauf. Ab 1600 px ist die Rail standardmäßig aufgeklappt. Die root-Schrift skaliert mit `clamp(1rem, min(0.833333vw, 1.481481vh), 2rem)`: 16 px bei Full HD, 32 px bei 4K. Die Höhenbegrenzung hält Ultrawide-Elemente kompakt; zusätzliche Breite steht den Seitenbereichen zur Verfügung. Shapes und Typografie verwenden rem-Tokens. Die Bühne begrenzt ihren Inhalt und stellt einen Inline-Size-Container für modusinterne Container Queries bereit. Unter 1280 px bleiben die Bedienelemente erreichbar.

Moduswechsel mounten die neue Bühne direkt und animieren den Eintritt mit den zentralen Expressive-Tokens über native DOM-Animationen. Die alte Bühne wird einschließlich ihrer Worker und Listener sofort abgebaut. Der docked-Verlauf verändert die Grid-Spalte über einen nativen skalaren Spring. Reduced Motion verwendet beim Moduswechsel nur Opacity; Layoutwechsel erfolgen sofort. Off verzichtet auf Animation. OS-Präferenzen begrenzen gespeichertes Full. Komplexe Animationen innerhalb lazy geladener Modi verwenden weiterhin `motion/react`.

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

Hash-Routing benötigt keine Pages-Rewrites. Vite erzeugt Assets relativ zum Base-Pfad `/m8e-calc/`, überschreibbar über `VITE_BASE_PATH`. Pages erhält ausschließlich `dist/`. Keine externen Requests zur Laufzeit außer explizit aktivierten EZB-Währungskursen (AP17); Fonts sind selbst gehostete, subsettete Variable-Fonts mit Preloads. Tokens liegen zentral in `src/styles`, generiert mit `npm run tokens`. AP2 liefert das Material-3-Expressive-Fundament und zwei Theme-Komponenten; weitere Komponenten folgen in AP3. Das Inline-Bootstrap in `index.html` wird von Vite vor App-JavaScript eingefügt und stellt den passenden Modus mit validiertem Farbcache vor dem ersten Paint her.

`tsconfig.app.json` prüft Browsercode, `tsconfig.node.json` Tooling/E2E und `tsconfig.domain.json` reine Domänen. `tsc -b` prüft alle drei. ESLint/Prettier, Vitest und Produktionsbuild laufen über `npm run check`; Playwright prüft danach Base-Pfad, alle Hash-Routen, Tastaturfokus, Laufzeitfehler und externe Requests.

## Deployment und Betrieb

CI läuft bei PRs und Pushes auf main. Pages baut bei Push auf main, prüft vor Upload und deployt mit OIDC in `github-pages`. In GitHub Settings → Pages ist die Quelle GitHub Actions zu aktivieren. Nach Merge den Workflow und die URL `https://sl3ndrr.github.io/m8e-calc/` prüfen. Ein grüner PR-Smoke belegt die lokale Auslieferung des Produktionsbuilds, nicht bereits ein öffentliches Deployment.

Wöchentliche Dependabot-Updates werden getrennt für npm und GitHub Actions gruppiert. Architektur- und Konventionsänderungen müssen in dieser Datei und `AGENTS.md` dokumentiert werden.

## AP4-Verifikation

Die Shell-Browserprüfungen warten auf den aktiven Modus, vollständige Opacity und die Zielbreite des angedockten Panels. Neben Dokument- und Container-Überläufen werden Panel-Grenzen im Viewport geprüft. Aktuelle Shell-/Modusansichten bei 2560×1440: [Hell](img/simple-light.png) und [Dunkel](img/simple-dark.png), reproduzierbar mit `npm run screenshots`. `e2e/app-shell.spec.ts` prüft zusätzlich Full HD, 4K und Ultrawide; CI bewahrt die jeweiligen Browser-/Galerie-Artefakte auf.

Die axe-Prüfung des Einstellungsdialogs wartet auf das Ende seiner Einblendung
(`data-entering` entfernt) und prüft anschließend den vollständigen Textkontrast.

## AP6 · Einfacher Rechner

`src/features/simple/model.ts` ist eine reine Zustandsmaschine mit den Phasen
Eingabe, wartender Operator, Ergebnis und Fehler. Grundrechenarten werden sofort
von links nach rechts ausgewertet; sämtliche Berechnungen einschließlich Speicher
und unärer Funktionen laufen über die AP5-Engine mit `percentMode: 'calculator'`.
Wiederholtes `=` verwendet den letzten Operator und den effektiven rechten Wert
(`100+10%==` ergibt 120). C erhält den Speicher, CE erhält den wartenden Operator.
Eingaben sind auf 16 Ziffern begrenzt, die Engine rechnet weiterhin mit 50 Stellen;
Ergebnisse werden mit 15 Stellen und bei Überlänge wissenschaftlich angezeigt.

`format.ts` übernimmt ausschließlich lokalisierte Anzeige und das Einfügen einer
Zahl. Eingabe-Endnullen bleiben erhalten; Gruppierung und Dezimaltrennzeichen
folgen den Einstellungen. `keyboard.ts` bildet Tasten auf Reducer-Aktionen ab.
`SimpleMode` orchestriert Zwischenablage, Snackbar und `useModeHistory`. Der
Reducer liefert eine bestätigbare Liste abgeschlossener Berechnungen, sodass auch
gebündelte Tastatureingaben und StrictMode keine Verlaufseinträge verlieren oder
verdoppeln. Payload-Version 1 enthält die exakten Operanden **vor** `=` und wird
vor Wiederherstellung validiert; fremde/alte Payloads zeigen einen Eingabefehler.

`src/ui/keypad` exportiert `Keypad`, `KeypadKey` und `CalculatorDisplay` über
`src/ui`. Sie enthalten keine Rechenlogik und stehen AP8 zur Verfügung. Farbrollen,
Formen, Tastendruck, Operatorzustand, Zeichen-Slide und fließende Schriftgröße
verwenden die zentralen Tokens/Springs und berücksichtigen Reduced/Off sowie
OS-Präferenzen. Der Einfach-Modus übernimmt AP4s rem-Skalierung und docked/modal
Verlauf unverändert. Tastaturbefehle ruhen in Formularen, Overlays und inerten
Modusflächen. Browserprüfungen erzeugen vier Ansichten in `test-results`:
1920×1080 und 3840×2160, jeweils Hell/Dunkel.

Aktuelle Referenzaufnahmen bei 2560×1440: [Hell](img/simple-light.png) und
[Dunkel](img/simple-dark.png), erzeugt mit `npm run screenshots`. Der AP6-Reducer hat 102 Unit-Fälle;
die Gesamtprüfung umfasst 800 Unit-/Komponententests und 44 Chromium-E2E.

## AP8 · Wissenschaftlicher Modus

`src/features/scientific` trennt reine Einfüge-/Auswertungslogik, Browserpersistenz
und Rendering. CodeMirror/KaTeX werden lazy geladen; KaTeX-Fonts werden vom Bundler
lokal ausgeliefert. Das Environment bleibt JSON-serialisierbar und wird beim Laden
validiert. Vorschau und Wiederherstellung führen keine gespeicherten Anweisungen
automatisch aus. Bedienung, Payloads und Verifikation: [SCIENTIFIC_MODE.md](SCIENTIFIC_MODE.md).

## AP10 · Einheiten-Engine

`src/units` liefert einen rein deklarativen Katalog und die browserfreie Decimal-API.
Alle Umrechnungen gehen über eine Kategorie-Basis; rationale Faktoren bleiben
Zähler/Divisor, Temperatur ist affin und Verbrauch reziprok. Energie/Drehmoment,
Aktivität/Energie-/Äquivalentdosis sowie beide Viskositäten sind dimensionsgerecht
getrennt. Suchauflösung meldet mehrdeutige Symbole; Formatierung nutzt die Engine.
AP17 ergänzt explizite DynamicRateProvider ohne IO in der Domäne; Zustimmung, Beschaffung und Cache liegen im Feature-Adapter. Datenmodell, Quellen und
Erweiterung: [UNITS.md](UNITS.md). Tests laufen im Engine-Node-Projekt ohne DOM.

## AP14 · Komfort und Offline

Gemeinsame Palette, Shortcut-Dispatch, Permalink-Validierung und PWA-Browseradapter
liegen in `src/app`, die begrenzte LZW-Kodierung in `src/shared/linkCodec.ts`.
Feature-Reducer bleiben lokale Zustandsquellen; Hashwechsel remounten eine Bühne
und ihre Initializer lesen ausschließlich validierte Modusdaten. Der Graph-Link
liest den aktuellen Canvas-Viewport beim Kopieren, auch während eines Übergangs.
Settings-Version 3 ergänzt UI-Größe und optionale Präsentationshistorie. Die
Root-Schrift multipliziert die vorhandene AP4-Fluidskalierung. Der Vite-Adapter
erzeugt einen inhaltsversionierten vollständigen Offline-Precache. Vertrag und
aktuelle Kürzeltabelle: [COMFORT.md](COMFORT.md).

## AP15 · Qualitätsgrenzen

Die Registry hält stabile Lazy-Komponenten. `ModeErrorBoundary` umschließt jeden
Modus innerhalb der Shell; ein Reset remountet nur den Modus. Fehlgeschlagene
Chunk-Downloads werden als `ModeLoadError` unterschieden und nach Reset mit einer
bereinigten Route neu geladen, da Browser abgewiesene Modulimporte cachen können.
Globale `error`-/`unhandledrejection`-Ereignisse liefern eine zusammengefasste,
lokalisierte Snackbar ohne Exception-/Eingabetext. Listener sind abmeldbar.

Die Palette lädt erst beim Öffnen. Der Permalink-Umschlag kennt nur Codec, Modus
und Typen; fachliche Restore-Validatoren verbleiben in den lazy geladenen Modi.
`readModeLink` verlangt den jeweiligen Validator vor jeder Zustandsübernahme.
Der Encoder akzeptiert typisierte Zustände und begrenzt die kodierte Größe;
Eingangsdaten werden ausschließlich nach fachlicher Validierung verwendet.

Der CSP-Buildadapter hasht Inline-Skripte nach Vites HTML-Transformationen und
setzt die Meta-Policy vor allen Assets. Skripte erlauben weder `unsafe-inline`
noch `unsafe-eval`; Verbindungen, Fonts, Worker und Manifest bleiben lokal.
Dynamische Styles benötigen `style-src 'unsafe-inline'` für CodeMirror,
React Aria und Motion; diese explizite Grenze steht auch im QA-Bericht.
Meta-CSP kann insbesondere `frame-ancestors` nicht ersetzen.

Die vollständige Kontrastmatrix belegt die vorhandenen Textrollen. Der funktionale
Outline-Rand erhält >=3:1 gegen sämtliche Surface-Ebenen.
Die Root-Schrift sinkt nicht unter die browserseitige Standardschriftgröße;
Full HD bleibt 16 px und 4K 32 px bei Standardpräferenzen. So verkleinert
Viewport-Skalierung den Text beim Zoomen nicht wieder.

Reproduzierbare Befehle und tatsächliche Messwerte stehen in [QA_REPORT.md](QA_REPORT.md).
Die QA-CI trennt den fixierten Vorher-Stand, Nachher-Messungen, funktionale
Browserprüfungen und die deterministischen Screenshot-Referenzen. Plattformgebundene
Clipboard-/CDP-Tests bleiben zusätzlich im vollständigen Chromium-Bestand;
die browserübergreifende QA prüft dieselben Kernabläufe ohne CDP/Clipboard-Rechte.

Der Startpfad verwendet native DOM-Animationen und einen kleinen retargetbaren
Skalar-Spring. Ein Moduswechsel mountet den neuen Modus direkt und animiert dessen
Eintritt; alte Worker/Listener werden sofort abgebaut. Die lazy Modi behalten ihre
komplexen Motion-Animationen. Die Akzent-Popover-Inhalte sowie Verlauf und Settings
laden erst bei Bedarf. Beide vom Bootstrap geprüften Paletten werden bis zu einer
Farbänderung wiederverwendet; Material Color Utilities bleiben dadurch lazy.
Vor dem ersten React-Paint werden die drei bereits vorgeladenen lokalen Fonts
abgewartet; ein Fontfehler fällt auf die Systemschrift zurück. Die Editor-
Ladefläche reserviert die spätere Höhe. `localePlugin.ts` begrenzt ausschließlich
Upstream-Widget-Wörterbücher auf die beiden unterstützten Sprachen de/en.

Eine äußere `AppErrorBoundary` hält Fehler gemeinsamer Dialoge und der Shell
abfangbar; sie zeigt eine lokalisierte Fehlerseite und Snackbar, fokussiert den
Reset und lädt nach Cache-Refresh neu. `loadModeModule` kennzeichnet auch
fehlgeschlagene nested Editor-/Formelimporte als `ModeLoadError`; ein bloßes
Remount kann die von React.lazy und dem Browser gecachte Ablehnung nicht lösen.
Der Cache-Refresh umfasst die betroffenen Editor-/Formel- bzw. Shell-Chunks
und bleibt auf die eigene Origin begrenzt.

AP17: Settings-Version 4 migriert 0–3 ohne Netzwerkzustimmung; Import erteilt keine Zustimmung. CSP und alleiniger Request-Adapter sind in `UNITS.md` dokumentiert.

## AP18 · Überschriften und Teilen

`App` besitzt die einzige Modus-H1 und benennt damit `main`. Bei Präsentation
liegt dieselbe H1 visuell versteckt außerhalb der ausgeblendeten Shell-Toolbar.
Feature-Regionen verwenden lokalisierte Modusnamen, funktionale Überschriften
bleiben in ihren Features. `CopyLinkButton` nutzt IconButton/Tooltip und behält
seinen bestehenden Daten-/Callback-Vertrag sowie Snackbar-Rückmeldungen.

## AP23 · Buildgrenze

Normaler Build: `dist/`; interner Galerie-Testbuild: `dist-gallery/`.
Compile-Schalter, Modul-/Precache-Prüfung, getrennte Playwright-Ziele und
Messverfahren stehen in [AP23.md](AP23.md). Pages validiert unmittelbar vor
dem Upload das normale Buildziel und lädt ausschließlich `dist/` hoch.

## AP30 · Statische Importgrenzen

Einfach verwendet dieselben Parser-/Evaluator-/Zahlenfunktionen über direkte
Engine-Modulimporte. Der öffentliche `engine/index.ts`-Einstieg bleibt für
vollständige Verbraucher bestehen; Ausgabehelfer werden so nicht allein durch
gemeinsame Barrel-Verwendung mit Einfach zusammengefasst.

Der gemeinsame i18n-Einstieg importiert `coreDE/coreEN` für Shell, Einfach,
Verlauf, globale Rückmeldungen und Kürzel. `i18n/extended.ts` importiert die
vollständigen `de/en`-Dictionaries für bestehende Lazy-Modi und -Dialoge. Die
vollständige deutsche Schlüsselmenge ergibt sich weiterhin aus `de.ts` inklusive
Core; Englisch erfüllt denselben Typvertrag. Jeder Translator begrenzt seine
Schlüssel statisch. Die kleine gemeinsame Factory erhält Interpolation,
Pluralregeln und aktive Locale; Formatierungsfunktionen bleiben gemeinsam.
Keine Registrierung, kein Text-Fallback während eines Imports und keine neue
Interaktionsgrenze: Texte sind vor dem ersten Render des jeweiligen Lazy-Bereichs
da. de/en-Wechsel bleibt synchron. Fehler des gemeinsamen `extended`-Chunks
erreichen die bestehenden Mode-/App-Grenzen; Reload frischt ihn ebenfalls auf.

Precache umfasst weiterhin sämtliche erzeugten Chunks. Startgraph, geladene
Module, Gesamtartefakt und vollständiger Offline-Precache werden getrennt und
mit festem Ausgangs-SHA in [AP30.md](AP30.md) berichtet.
