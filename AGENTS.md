# Projektgedächtnis: m8e-calc

## Auftrag und Scope

m8e-calc ist ein datenschutzfreundlicher Desktop-Browser-Taschenrechner. Die verbindliche Produktvision steht in `docs/PRODUCT_SPEC.md`, die Schichten in `docs/ARCHITECTURE.md`, die Paketfolge in `docs/ROADMAP.md`. AP1 legt die Toolchain an; AP2 liefert Theming und Design-Tokens gemäß `docs/DESIGN.md`. AP4 liefert die App-Hülle mit Registry, persistentem Verlauf, Einstellungen und i18n. AP5 liefert den reinen Rechenkern in `src/engine`; Vertrag und konservative Entscheidungen stehen in `docs/ENGINE.md`. AP6 liefert den Einfach-Modus in `src/features/simple` mit reinem Reducer, Engine-Anbindung und wiederverwendbaren Keypad-Bausteinen in `src/ui/keypad`. AP8 liefert den Wissenschaftlich-Modus mit lazy CodeMirror/KaTeX, persistenten Definitionen und AP4-Verlauf. AP9 ergänzt das Informatik-Panel in `src/features/scientific/programmer` mit BigInt-Kern in `src/engine/programmer`, opt-in Bitparser, IEEE-754 und Unicode. Details stehen in `docs/SCIENTIFIC_MODE.md`. AP10 liefert die reine Einheiten-Engine in `src/units`; Datenmodell, API, Quellen und Erweiterung stehen in `docs/UNITS.md`. Einheiten-Tests laufen im Engine-Node-Projekt. AP11 liefert den Umrechner in `src/features/convert` auf AP10 mit lokalisierten Eingaben, Einheitenraster, Paar-Persistenz und AP4-Ruheverlauf; Details in `docs/CONVERT_MODE.md`. AP13 liefert den Graphen-Modus in `src/features/graph`; Canvas/Worker, Plot-Sätze und Bedienung stehen in `docs/GRAPH_MODE.md`.

AP12 ergänzt `src/graph` mit Float64-Closure-Compiler, freien Parametern,
explizitem/parametrischem/polarem Sampling, numerischer Analysis und Viewport.
Vertrag und Toleranzen: `docs/GRAPH.md`. Registry-Einträge dürfen optional
`floatImpl` anbieten; der Graph-Compiler verwendet niemals Decimal pro Sample.
Graph-Tests laufen ebenfalls im Engine-Node-Projekt. `npm run test:graph:bench`
misst typische Kurven bei 2560×1440 (Ziel <4 ms, Regression <25 ms).
Implizite Marching-Squares-Kurven sind als Folge-Issue dokumentiert; AP13 nutzt die Engine mit lokalem Sampling-Worker.

AP14 liefert gemeinsame Komfortfunktionen in `src/app`: Palette, zentrale
Kürzel-Registry, bounded versionierte Permalinks, UI-Größe/Präsentation und
PWA-Build-Adapter ohne zusätzliche App-Abhängigkeit. Vertrag und Tastenkürzel:
`docs/COMFORT.md`. Settings-Version 4 migriert 0–3; Offline-Precache umfasst alle
lazy Chunks, Fonts und Worker. Domänen bleiben browserfrei.

AP21 trennt die stabile Fit-Abtastbasis vom gewünschten Viewport und von der
animierten Canvas-Ansicht. `fitBasis` ist im Plot-Satz optional (Version 1 bleibt
rückwärtskompatibel) und wird mit Verlauf/Permalink erhalten. Pan/Zoom setzen
sie neu; Resize/Aspektsperre erhalten sie. Fit-Vertrag und numerische Grenzen:
`docs/GRAPH.md`; Browseradapter und Messung: `docs/GRAPH_MODE.md`.

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
| `npm run test:engine:bench`   | Parse + Eval typischer Ausdrücke; nach Warm-up jeweils unter 1 ms      |
| `npm run test:e2e`            | Playwright mit Chromium gegen den vorher erstellten Build              |
| `npm run screenshots`         | Release-Bilder in `docs/img/` aus dem Build erzeugen (eigener Preview) |
| `npm run screenshots:gallery` | Galerie und Overlays in Hell/Dunkel aufnehmen (Preview vorher starten) |
| `npm run check`               | lint + typecheck + test + build + Engine-/Graph-Benchmarks             |

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
AP7 ergänzt wissenschaftliche Registry-Einträge, AST-Binder, komplexe Werte, CODATA-2022-Konstanten und Export. Eigene Anweisungen über die immutable `execute`-API mit JSON-serialisierbarem Environment; Details, reservierte Namen und Genauigkeitsgrenzen in `docs/ENGINE.md`. Eigene vertrauenswürdige Funktionen als Registry-Einträge. Eingabelokalisierung bleibt im UI-Adapter.
Engine-Tests laufen in einem separaten Vitest-Node-Projekt ohne UI-Testsetup.

Datenfluss: Benutzereingabe → reine UI-Funktion/Reducer → Domäne → Ergebnis → Store/React → Ansicht. Keine fachlichen Seiteneffekte beim Rendern. Hash-Routen: `#/simple`, `#/scientific`, `#/convert`, `#/graph`, technisches Design-Lab `#/design`; leerer Hash setzt den zuletzt genutzten Modus fort (Standard Einfach); unbekannter Hash zeigt Einfach. Keine serverseitigen Rewrites voraussetzen.

## Konventionen und verbindliche Regeln

1. **Datenschutz:** Keine externen Requests zur Laufzeit außer der ausdrücklich beauftragten AP17-Währungsumrechnung: `onlineRates` ist standardmäßig aus; ausschließlich der Schalter „Online-Kurse laden“ erteilt Zustimmung. Ohne Opt-in weder Währungskategorie noch Requests. Nur `https://api.frankfurter.dev/v2/providers/ecb/rates` ist über CSP freigegeben; keine Beträge, kein Verlauf, keine Credentials und kein Referer werden übertragen. Importierte Einstellungen erteilen keine Netzwerkzustimmung. Assets lokal ausliefern, Fonts selbst hosten; bis dahin Systemfonts. Keine CDNs, Analytics oder entfernten Rechenservices. Entwicklungs- und CI-Paketdownloads sind davon getrennt.
2. **i18n:** Alle UI-Texte einschließlich Titel, ARIA-Beschriftungen und Fehlermeldungen über i18n-Schlüssel, niemals hartkodiert. `de` ist Fallback, Auto erkennt `navigator.language`; `en` vollständig pflegen. `MessageKey` wird aus `src/shared/i18n/de.ts` abgeleitet, neue Texte in beiden Dictionaries ergänzen. Technische Fehler für Entwickler dürfen außerhalb sichtbarer UI stehen.
3. **Tokens:** Keine Farbwerte in Komponenten oder Feature-CSS; Farben ausschließlich über `--md-sys-color-*`. Formen und Bewegung ausschließlich über Shape- und Motion-Tokens (`--md-sys-shape-*`, `--md-sys-motion-*`). Tokenwerte zentral in `src/styles`. `prefers-reduced-motion` respektieren. AP2 liefert zentrale Farbrollen, Typografie, Shape- und Spring-Tokens; `npm run tokens` regeneriert `src/styles/tokens.css`. Neue Icons erfordern Font-Subsetting gemäß `docs/DESIGN.md`; AP3 liefert die Komponenten; AP4 nutzt die Registry in `src/app/modeRegistry.ts`, `useModeHistory(mode, onRestore)` und versionierten Verlauf (maximal 500); öffentliche API und Beispiele stehen in `docs/COMPONENTS.md`. Neue Modus-UI verwendet die Bausteine aus `src/ui`; direkte öffentliche Komponentenimporte erhalten Lazy-Grenzen, `index.ts` bleibt für Galerie und Kompatibilität verfügbar.
4. **Tests und Logik:** Jede Logik bekommt Tests. UI-Logik als reine Funktionen/Reducer, getrennt von Komponenten. Komponenten orchestrieren Rendering und Browseradapter. Vitest für Logik, Testing Library für UI-Verhalten, fast-check für sinnvolle Eigenschaften, Playwright für Integration im Browser. Keine Rechenengine als Nebenaufgabe hinzufügen.
5. **Barrierefreiheit:** Vollständige Tastaturbedienung, sichtbarer Fokus, semantisches HTML und geeignete ARIA-Beschriftungen; Text- und Fokuskontrast prüfen. Animationen dürfen Bedienung nicht blockieren.
6. **Scope-Disziplin:** Nur das beauftragte Paket umsetzen. Restpunkte als Liste **„Offen / Folge-Issues“** in die PR-Beschreibung aufnehmen. Folgepakete in der Roadmap dokumentieren.
7. **PR-Konventionen:** Branch `feat/<paket>` (AP1: `feat/foundation`), Conventional Commits. PR-Beschreibung enthält **Was / Warum / Test / Screenshots** (bei UI) sowie **Offen / Folge-Issues**. Bei Architektur- oder Konventionsänderungen `docs/` und `AGENTS.md` aktualisieren. Keine Änderungen direkt auf `main`, außer der einmaligen Initialisierung des zuvor leeren Repositories.
8. **Definition of Done:** `npm run check` grün, CI einschließlich Chromium-Smoke grün, Doku aktuell. Ein konfigurierter Workflow ist kein Beleg für einen erfolgreichen Lauf. Pages-Erreichbarkeit nach Merge getrennt anhand des Deployments prüfen.

TypeScript: `strict` und `noUncheckedIndexedAccess` bleiben aktiv. Explizite Typen an Modulgrenzen, keine pauschalen `any`- oder Non-null-Assertions. React 19, Zustand, npm; Flat ESLint mit typescript-eslint, react-hooks und jsx-a11y, Prettier. Dateinamen: Komponenten PascalCase, Funktionen/Module camelCase; CSS separat. Lockfile bei Abhängigkeitsänderungen aktualisieren.

## CI und GitHub Pages

`ci.yml` prüft PRs und Pushes auf `main`: `npm ci`, lint, typecheck, test, build und Playwright-Smoke. `pages.yml` prüft auf `main` ebenfalls den Build einschließlich Checks/Smoke, lädt ausschließlich `dist/` hoch und deployt über GitHub Pages. Deployment nutzt `pages: write`, `id-token: write`, die Umgebung `github-pages` und eine Concurrency-Gruppe. In Repository Settings → Pages muss **GitHub Actions** als Quelle eingestellt sein. Hostingpfad: `/m8e-calc/`. Im PR nicht mergen; Deployment wird erst durch den Merge ausgelöst.

## AP15 · Hardening

`docs/QA_REPORT.md` dokumentiert Befund, Vorher-/Nachher-Messungen und offene Risiken.
`qa.yml` ergänzt die bestehende CI um eine festgehaltene Baseline, vollständige
Seed-/Rollen-Kontraste, initiales JS (<200000 Bytes gzip inklusive Einfach-Modus),
Lighthouse CI (>=95), Chromium/Firefox/WebKit-Kernabläufe, Event Timing/CLS/Cleanup
und 24 Screenshot-Regressionen. Nur tatsächlich abgeschlossene Läufe als bestanden
bezeichnen. Baselines nach visueller Prüfung einchecken, nicht bei jedem Lauf ersetzen.

Permalink-Umschläge importieren keine Domänen zur Laufzeit. `readModeLink` erhält
den Restore-Validator des aktiven Features. Registry-Komponenten bleiben stabil;
Modusfehler werden lokal abgefangen und können zurückgesetzt werden.
Eine äußere App-Fehlergrenze schützt gemeinsame Shell-/Dialogkomponenten.
Fehlgeschlagene Editor-/Formelimporte benötigen ebenfalls Cache-Refresh und Reload;
ein Remount allein löst gecachte Importablehnungen nicht.
Zentraler CSP-Adapter: `scripts/cspPlugin.ts`; Hashes müssen den finalen Inline-Code abdecken.
Die vollständige Rollenmatrix prüft Text auf Surface-Ebenen; funktionale Outline-Ränder werden auf 3:1 korrigiert. Native Animationen auf dem Startpfad verwenden dieselben zentralen Spring-Tokens und räumen beim Unmount auf.

## AP16 · Release-Vorbereitung

`npm run screenshots` erzeugt die README-Bilder (2560×1440, hell/dunkel) und Social Preview (1280×640) aus dem Produktionsbuild. Anleitung: `docs/RELEASE.md`. Version 1.0.0 und Release Notes sind vorbereitet, nicht veröffentlicht. MIT in LICENSE ist ein Vorschlag und muss vor Veröffentlichung vom Eigentümer bestätigt werden. Keine automatischen Tags, Releases oder Merges.

## AP17 · Optionale Währungen

`src/units/currency.ts` liefert den reinen Decimal-Provider; `createUnitsEngine`
erhält explizite `DynamicRateProvider`-Instanzen ohne IO. Beschaffung und Cache
liegen in `src/features/convert/currency`. Vier Stunden automatische
Aktualisierung, manuelle Aktualisierung, zehn Sekunden Timeout, Offline-Fallback
und Kursdatums-Badge ab 48 Stunden. Details und Quellenprüfung: `docs/UNITS.md`.

## AP18 · UI-Bereinigung

Die Shell trägt die einzige Modus-H1; in Präsentation bleibt sie visuell
versteckt zugänglich. Feature-Regionen verwenden `mode.*` als Namen. Teilen
nutzt den gemeinsamen IconButton/Tooltip-Adapter bei unverändertem
Permalink-Vertrag; aktive Währungen bleiben ausgeschlossen. Details und
Bildreproduktion: `docs/COMFORT.md`.

## AP19 · Zahlen und Tasten

Zahlen verwenden gemessene Fontbreiten mit seitlicher Tintenreserve und einem
begrenzten Animationsviewport. Rechentasten behalten ihre rollenbezogene
Grundform auch bei Press/Active; gemeinsame Motion-/Shape-Tokens gelten auch
im wissenschaftlichen Tastenfeld. Konzept und reproduzierbare Browsernachweise:
[docs/AP19.md](docs/AP19.md).

## AP20 · Controls-Polish

Checkbox-Markierungen haben einen lokalen Größenvertrag; das generische
Iconsystem bleibt unverändert. ThemeSwitch behält drei Hauptsymbole und den
zugänglichen Live-Systemstatus. Reproduzierbare Zustands-/Zoom-/Motionprüfungen
und Nachweisstatus stehen in [docs/AP20.md](docs/AP20.md).


## AP22 · Graphzahlen

`src/features/graph/numbers.ts` formatiert gezielt Float64-Graphwerte und adaptiert
`parseLocalizedNumber` für einzelne numerische Felder. Keine pauschale Änderung
an Rechnerformaten oder Formelausdrücken. Rundung ist reiner Anzeigezustand;
Plot-Version 1, Settings und Permalinks bleiben unverändert. `ValueTable` trennt
Berechnungsmemo von Formatierung und wird nur geöffnet eingebunden. Vertrag,
Bestätigung und Arbeitsgrenzen stehen in `docs/GRAPH_MODE.md`.
