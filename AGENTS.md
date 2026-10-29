# Projektgedächtnis: m8e-calc

WP-07 verschiebt wissenschaftliche Vorschau, Ausführung und STO ausschließlich
in den lokalen Featureworker. Protokoll 1 validiert serialisierte Werte und
Environments; eine laufende Arbeit und ein neuester Vorschau-Nachfolger sind
die Obergrenze. Abbruch/Invalidierung terminieren den Worker tatsächlich.
Explizite Snapshots committen atomar gegen die transiente Environmentrevision;
Vorschauen dürfen weder Environment noch Verlauf schreiben. Kein synchroner
Fallback, keine zusätzliche eager Startlast. Vertrag und Prüfgrenzen:
[docs/SCIENTIFIC_MODE.md](docs/SCIENTIFIC_MODE.md), [docs/WP07.md](docs/WP07.md).

Aktuelle integrierte Produktabnahme: [docs/AP46.md](docs/AP46.md), nach
AP42–AP45 auf main `c95f183a`. Historische Ausgangslage: [docs/AP40.md](docs/AP40.md).
Live-Abnahme und
Releaseentscheidung: [docs/AP39.md](docs/AP39.md) (blockiert);
vorheriger Integrationsbericht: [docs/AP38.md](docs/AP38.md).
Paketnachweise behalten ihre historischen SHAs; PR-Head, geprüfter Produkt-SHA
und tatsächlich veröffentlichter Pages-SHA sind getrennte Identitäten.

## Auftrag und Scope

m8e-calc ist ein datenschutzfreundlicher Desktop-Browser-Taschenrechner. Die verbindliche Produktvision steht in `docs/PRODUCT_SPEC.md`, die Schichten in `docs/ARCHITECTURE.md`, die Paketfolge in `docs/ROADMAP.md`. AP1 legt die Toolchain an; AP2 liefert Theming und Design-Tokens gemäß `docs/DESIGN.md`. AP4 liefert die App-Hülle mit Registry, persistentem Verlauf, Einstellungen und i18n. AP5 liefert den reinen Rechenkern in `src/engine`; Vertrag und konservative Entscheidungen stehen in `docs/ENGINE.md`. AP6 liefert den Einfach-Modus in `src/features/simple` mit reinem Reducer, Engine-Anbindung und wiederverwendbaren Keypad-Bausteinen in `src/ui/keypad`. AP8 liefert den Wissenschaftlich-Modus mit lazy CodeMirror/KaTeX, persistenten Definitionen und AP4-Verlauf. AP9 ergänzt das Informatik-Panel in `src/features/scientific/programmer` mit BigInt-Kern in `src/engine/programmer`, opt-in Bitparser, IEEE-754 und Unicode. Details stehen in `docs/SCIENTIFIC_MODE.md`. AP10 liefert die reine Einheiten-Engine in `src/units`; Datenmodell, API, Quellen und Erweiterung stehen in `docs/UNITS.md`. Einheiten-Tests laufen im Engine-Node-Projekt. AP11 liefert den Umrechner in `src/features/convert` auf AP10 mit lokalisierten Eingaben, Einheitenraster, Paar-Persistenz und AP4-Ruheverlauf; Details in `docs/CONVERT_MODE.md`. AP13 liefert den Graphen-Modus in `src/features/graph`; Canvas/Worker, Plot-Sätze und Bedienung stehen in `docs/GRAPH_MODE.md`.

AP12 ergänzt `src/graph` mit Float64-Closure-Compiler, freien Parametern,
explizitem/parametrischem/polarem Sampling, numerischer Analysis und Viewport.
Vertrag und Toleranzen: `docs/GRAPH.md`. Registry-Einträge dürfen optional
`floatImpl` anbieten; der Graph-Compiler verwendet niemals Decimal pro Sample.
Graph-Tests laufen ebenfalls im Engine-Node-Projekt. `npm run test:graph:bench`
misst typische Kurven bei 2560×1440 (Ziel <4 ms, Regression <25 ms).
AP26 ergänzt einen separaten impliziten 2D-Domänenpfad (Issue #17); AP27 integriert diesen Pfad in AP13 mit lokalem Sampling-Worker, gemeinsamen
Budgets, Diagnosen und expliziten Sperren für nicht unterstützte 1D-Aktionen.
`ImplicitCurve`, `parseImplicitInput`, `compileImplicitCurve` und
`sampleImplicitCurveDetailed` sind additiv; `Curve` und `parseCurveInput` bleiben
bis AP27 unverändert. Adaptive gemeinsame Zellränder, Sattel-Decider, numerische
Grenzen und Integrationspunkt: `docs/GRAPH.md`.
`npm run test:graph:implicit:bench` prüft separate 2D-Budgets bei 1280×720 und ist
Teil von `npm run check`; der bisherige 1D-Benchmark bleibt unverändert.

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

Node `>=24.15.0 <25` (24 LTS), npm 11.19.0 und das eingecheckte `package-lock.json` verwenden. `.nvmrc` folgt 24 (`nvm install && nvm use`); CI prüft die Untergrenze 24.15.0 zusätzlich zur aktuellen gepflegten 24er-Version. Installation: `npm ci`.

| Befehl                        | Zweck                                                                  |
| ----------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                 | Vite-Entwicklungsserver                                                |
| `npm run build`               | TypeScript prüfen und Produktionsbuild nach `dist/`                    |
| `npm run build:gallery`       | Expliziter interner Galerie-Testbuild nach `dist-gallery/`             |
| `npm run preview:gallery`     | Separaten Galerie-Testbuild lokal ausliefern                           |
| `npm run test:e2e:gallery`    | Galerie-/Theming-/Controls-E2E auf Port 4174                           |
| `npm run preview`             | Produktionsbuild lokal ausliefern                                      |
| `npm run lint`                | ESLint und Prettier-Formatprüfung                                      |
| `npm run typecheck`           | Alle TypeScript-Projekte prüfen                                        |
| `npm run test`                | Vitest, Testing Library und Property-Tests                             |
| `npm run test:engine:bench`   | Parse + Eval typischer Ausdrücke; nach Warm-up jeweils unter 1 ms      |
| `npm run test:e2e`            | Playwright mit Chromium gegen den vorher erstellten Build              |
| `npm run screenshots`         | Release-Bilder in `docs/img/` aus dem Build erzeugen (eigener Preview) |
| `npm run screenshots:gallery` | Galerie und Overlays aufnehmen (Galerie-Preview auf Port 4174 starten) |
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

Datenfluss: Benutzereingabe → reine UI-Funktion/Reducer → Domäne → Ergebnis → Store/React → Ansicht. Keine fachlichen Seiteneffekte beim Rendern. Hash-Routen: `#/simple`, `#/scientific`, `#/convert`, `#/graph`, internes Design-Lab `#/design` nur in Entwicklung/Galerie; leerer Hash setzt den zuletzt genutzten Modus fort (Standard Einfach); unbekannter Hash zeigt Einfach. Keine serverseitigen Rewrites voraussetzen.

## Konventionen und verbindliche Regeln

1. **Datenschutz:** Keine externen Requests zur Laufzeit außer der ausdrücklich beauftragten AP17-Währungsumrechnung: `onlineRates` ist standardmäßig aus; ausschließlich der Schalter „Online-Kurse laden“ erteilt Zustimmung. Ohne Opt-in weder Währungskategorie noch Requests. Nur `https://api.frankfurter.dev/v2/providers/ecb/rates` ist über CSP freigegeben; keine Beträge, kein Verlauf, keine Credentials und kein Referer werden übertragen. Importierte Einstellungen erteilen keine Netzwerkzustimmung. Assets lokal ausliefern, Fonts selbst hosten; bis dahin Systemfonts. Keine CDNs, Analytics oder entfernten Rechenservices. Entwicklungs- und CI-Paketdownloads sind davon getrennt.
2. **i18n:** Alle UI-Texte einschließlich Titel, ARIA-Beschriftungen und Fehlermeldungen über i18n-Schlüssel, niemals hartkodiert. `de` ist Fallback, Auto erkennt `navigator.language`; `en` vollständig pflegen. Die vollständige Schlüsselmenge wird aus `src/shared/i18n/de.ts` inklusive Core abgeleitet; `MessageKey` des jeweiligen i18n-Einstiegs begrenzt Aufrufer auf seine vorhandenen Texte. Neue Texte in beiden Dictionaries ergänzen. Technische Fehler für Entwickler dürfen außerhalb sichtbarer UI stehen.
3. **Tokens:** Keine Farbwerte in Komponenten oder Feature-CSS; Farben ausschließlich über `--md-sys-color-*`. Formen und Bewegung ausschließlich über Shape- und Motion-Tokens (`--md-sys-shape-*`, `--md-sys-motion-*`). Tokenwerte zentral in `src/styles`. `prefers-reduced-motion` respektieren. AP2 liefert zentrale Farbrollen, Typografie, Shape- und Spring-Tokens; `npm run tokens` regeneriert `src/styles/tokens.css`. Neue Icons erfordern Font-Subsetting gemäß `docs/DESIGN.md`; AP3 liefert die Komponenten; AP4 nutzt die Registry in `src/app/modeRegistry.ts`, `useModeHistory(mode, onRestore)` und versionierten Verlauf (maximal 500); öffentliche API und Beispiele stehen in `docs/COMPONENTS.md`. Neue Modus-UI verwendet die Bausteine aus `src/ui`; direkte öffentliche Komponentenimporte erhalten Lazy-Grenzen, `index.ts` bleibt für Galerie und Kompatibilität verfügbar.
4. **Tests und Logik:** Jede Logik bekommt Tests. UI-Logik als reine Funktionen/Reducer, getrennt von Komponenten. Komponenten orchestrieren Rendering und Browseradapter. Vitest mit getrennten vollständigen UI-/Engine-Läufen (`test:ui` / `test:engine`) für Logik, Testing Library für UI-Verhalten, fast-check für sinnvolle Eigenschaften, Playwright für Integration im Browser. Keine Rechenengine als Nebenaufgabe hinzufügen.
5. **Barrierefreiheit:** Vollständige Tastaturbedienung, sichtbarer Fokus, semantisches HTML und geeignete ARIA-Beschriftungen; Text- und Fokuskontrast prüfen. Animationen dürfen Bedienung nicht blockieren.
6. **Scope-Disziplin:** Nur das beauftragte Paket umsetzen. Restpunkte als Liste **„Offen / Folge-Issues“** in die PR-Beschreibung aufnehmen. Folgepakete in der Roadmap dokumentieren.
7. **PR-Konventionen:** Branch `feat/<paket>` (AP1: `feat/foundation`), Conventional Commits. PR-Beschreibung enthält **Was / Warum / Test / Screenshots** (bei UI) sowie **Offen / Folge-Issues**. Bei Architektur- oder Konventionsänderungen `docs/` und `AGENTS.md` aktualisieren. Keine Änderungen direkt auf `main`, außer der einmaligen Initialisierung des zuvor leeren Repositories.
8. **Definition of Done:** `npm run check` grün, CI einschließlich Chromium-Smoke grün, Doku aktuell. Ein konfigurierter Workflow ist kein Beleg für einen erfolgreichen Lauf. Pages-Erreichbarkeit nach Merge getrennt anhand des Deployments prüfen.

TypeScript: `strict` und `noUncheckedIndexedAccess` bleiben aktiv. Explizite Typen an Modulgrenzen, keine pauschalen `any`- oder Non-null-Assertions. React 19, Zustand, npm; Flat ESLint mit typescript-eslint, react-hooks und jsx-a11y, Prettier. Dateinamen: Komponenten PascalCase, Funktionen/Module camelCase; CSS separat. Lockfile bei Abhängigkeitsänderungen aktualisieren.

## CI und GitHub Pages

`ci.yml` ist der einzige Orchestrator für PRs und Pushes auf `main`. Er baut
mit `npm run check` einmal `dist/` (Ziel `normal`), versiegelt alle Dateien mit
SHA-256 und reicht genau dieses Artefakt an Browser, AP28-Performance, Galerie,
Hardening, AP29 und Release-Prüfungen weiter. `qa.yml`, `ap29.yml` und
`release-assets.yml` sind ausschließlich wiederverwendbare Workflows.
Der abschließende `Quality gate` verlangt explizit Erfolg aller Pflichtjobs;
`failure`, `cancelled`, fehlende Jobs oder unerwartetes `skipped` sperren die Freigabe.
Verträge, tatsächliche Checknamen und Nachweise: [docs/AP31.md](docs/AP31.md).

Der frühere unabhängige `pages.yml` ist entfernt. Nur der Job `Deploy Pages`
nach erfolgreichem Gate auf einem aktuellen `main`-Push aus `sl3ndrr/m8e-calc`
erhält `pages: write` und `id-token: write`. Standard bleibt `contents: read`.
PRs/Forks bekommen keine Veröffentlichungsrechte; keine `workflow_run`-Übernahme.
Das Pages-TAR enthält dieselben geprüften Bytes inklusive Vite-Manifest;
Fingerprint, Lauf, Commit und Ziel müssen passen. Main-Läufe und Deployments
werden serialisiert; direkt vor Veröffentlichung wird der aktuelle main-SHA
abgeglichen. Ein fehlgeschlagenes Gate verändert das bisherige Deployment nicht.

In Repository Settings → Pages muss **GitHub Actions** als Quelle eingestellt
sein. Hostingpfad: `/m8e-calc/`. Ohne gesonderten Auftrag weder mergen noch
Regeln, Tags, Releases oder Live-Deployments ändern. Nach späterem Merge ist
die erste reale main-/Pages-Kette einschließlich Live-/Workerabgleich separat
zu verifizieren; PR-CI-Erfolg belegt sie nicht.

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

## AP23 · Internes Designlab

`npm run build` erzeugt ausschließlich die Anwender-App in `dist/`.
`npm run dev` aktiviert das interne Lab; `npm run build:gallery` ist der explizite
Galerie-Testbuild in `dist-gallery/`, Preview mit `npm run preview:gallery` auf
Port 4174. Niemals Galerie nach `dist/` bauen oder als Pages-Artefakt hochladen.
`npm run test:e2e:gallery` führt die vollständigen Lab-/Theming-/Controlsprüfungen
separat aus. Normale E2E, PWA, Bundle und Releasebilder prüfen weiter `dist/`.
Der Compile-Schalter ist keine Anwenderoption. Neue Demoimporte bleiben hinter
dieser Grenze; gemeinsam benötigte UI-Komponenten erhalten direkte Imports.
Nachweise, Messdefinitionen und Reproduktion: [docs/AP23.md](docs/AP23.md).

## AP24 · Dependency-Wartung

Paketmatrix und Verfahren: [docs/AP24.md](docs/AP24.md). Node 24 und die passende
24er-Typenlinie beibehalten. ESLint und `@eslint/js` gemeinsam auf der mit allen
Plugins kompatiblen Linie halten; keine Peer-Overrides oder Abschaltung von
Accessibility-Regeln. Dependabot gruppiert Patch/Minor nach Toolchain und
Runtime; visuell sensible Pakete und unabhängige Majors erhalten eigene PRs.
Security-Updates bleiben aktiv. Neue Lockfiles regulär mit Node 24/npm erzeugen,
anschließend frisches `npm ci`, `check` und die betroffenen CI-/QA-Gates ausführen.
Fontquellen-Updates regenerieren die eingecheckten Subsets nicht automatisch;
Font-Regeneration und visuelle Referenzänderungen erfordern gezieltes Review.

## AP25 · Produktabnahme

Die vorhandenen AP18–AP24-Regressionen, Desktop-/Browsermatrix und PWA-Fälle
werden wiederverwendet; historische SHA-/Bildbelege bleiben ihrem Build
zugeordnet. Ein sichtbarer, aktiver CodeMirror-Vorschlag ist Voraussetzung vor
Tab; erhaltener Tooltiptext allein belegt keine Bereitschaft. Die Standard-
Completion-Keymap liegt unter den Rechneraktionen: Escape leert, Enter wertet
aus, auch bei offenen Vorschlägen. Galerieprojekte verwenden eigene Browserprofile.
`build-info.json` enthält passiv CI-Commit und Buildziel; ohne `GITHUB_SHA`
steht der Commit auf `null`. Kein App-Request und keine sichtbare Entwickler-UI.
Historische Abnahme: [docs/AP25.md](docs/AP25.md); aktuelle Live-Grenzen und
Releaseentscheidung: [docs/AP39.md](docs/AP39.md).

## AP27 · Implizite Graphintegration

Der Featuretyp `PlotCurve` vereinigt `Curve` und AP26-`ImplicitCurve`; der reine
1D-Domänenvertrag bleibt unverändert. `parsePlotInput` nutzt ausschließlich den
vorhandenen `detectedKind`-Dispatcher und die tatsächliche AP26-API. Worker-
Protokoll 2 ist validiert, enthält gemeinsame 2D-Budgets und Diagnosen; kein
synchrones 2D-Fallback. PNG übernimmt die dargestellten akzeptierten Polylinien.
Implizite Analysis/Trace/Table sind explizit gesperrt; Fit verwendet die stabile
AP21-Basis ohne rekursive Suche. Speicherung bleibt textbasiert in Plot-Version 1
und Link-Umschlag v=1; keine Datenmigration. Vertrag/Nachweise: [docs/AP27.md](docs/AP27.md).

## AP28 · Graphperformance

Drag-Sampling im Canvasadapter verwendet eine feste 90-ms-Frist, die weitere
Moves nicht nach hinten verschieben. Jeder Move entwertet weiterhin veraltete
Antworten; direktes Sampling räumt die Frist auf. Dirty-Rendering, AP21-Fit,
Workerprotokoll und deterministische Domänenbudgets bleiben erhalten.
`playwright.ap28.config.ts` prüft begrenzte Referenz-/Panfenster und absichtlich
langsame Draw-/Main-Thread-Fälle, allein und ohne Retries. Die bestehenden
55-FPS-/16,67-ms-Grenzen gelten weiter; Canvas-Aufrufzeit ist kein Nachweis für
60 physische Bilder pro Sekunde. Vergleich, Rohmessungen, Runner und tatsächlich
abgeschlossene Gates: [docs/AP28.md](docs/AP28.md).

## AP29 · Passive Buildnachweise

Der Worker routet nur GET innerhalb derselben Origin/Base: App-Fallback
nur für Base und `index.html`, sonst Cache-first ausschließlich für exakte
Precache-Pfade. `build-info.json` wird vor jedem Cachezugriff separat mit
`cache: 'no-store'` abgerufen, für Fetch und Navigation; kein Offlineersatz.
Die Datei bleibt außerhalb des Precache und wird nie automatisch von der App
angefordert. `npm run test:e2e:provenance` baut getrennte Produktionsfixtures
und prüft kontrollierte Clients, A/B-Abgleich, Offlinefehler sowie bestehende
Comfort-/Updatefälle in Chromium/Firefox/WebKit. Vertrag und tatsächliche
Belege: [docs/AP29.md](docs/AP29.md). Servernachweis und aktive Appversion
getrennt prüfen; Live-Abnahme erst am konkreten Pages-Deploy dokumentieren.

## AP30 · Startpfad

`src/shared/i18n.ts` bindet nur die typisierten Startwörterbücher `coreDE/coreEN`.
Bestehende Lazy-Modi/-Dialoge importieren `src/shared/i18n/extended.ts` statisch;
dieser Einstieg enthält alle Schlüssel aus `de.ts` einschließlich Core. Keine
asynchrone Übersetzung oder globale Wörterbuchregistrierung. Beide Einstiege
verwenden dieselbe Locale und Formatierungslogik. Neue Schlüssel in beiden
Sprachen pflegen; Starttexte in Core, übrige in `de.ts/en.ts`. Core-Aufrufer können
nur vorhandene Core-Schlüssel verwenden. Einfach importiert konkrete reine
Engine-Module; das öffentliche Engine-Barrel bleibt verfügbar. Der Reloadadapter
berücksichtigt auch den gemeinsamen `extended`-Chunk. Messung und Belege:
[docs/AP30.md](docs/AP30.md); `scripts/qa-bundle.mjs` bleibt unverändert.

## AP31 · CI-/Pages-Freigabe

Pipelineänderungen benötigen die tatsächlichen PR-Gates auf dem finalen Head.
`scripts/ci/gates.test.mjs` prüft die Sperrpfade ohne Deployment und ohne Änderungen
an Produkt-/Performancegrenzen. Artefakte nur über die ID des Buildjobs desselben
Laufs laden; weder Namen fremder Läufe noch PR-Artefakte für main übernehmen.
Ein Teil-Rerun mit älterem Build-Artefakt darf wegen abweichender Laufversuchsnummer
scheitern; in diesem Fall den vollständigen Workflow neu ausführen. Historische
Paket-Evidence bleibt bedingt und darf nicht pauschal als Required Check eingetragen
werden. Externe Release-Links bleiben ein blockierender Quellen-/Dokumentationscheck.
Der Provider-Sondercheck bleibt auf `feat/currency` zusätzlich bindend; nur
außerhalb dieses Branches akzeptiert der Aggregator sein erwartetes `skipped`.

## AP32 · Merge-Schutzstatus

Ruleset `25003991` ist durch den Eigentümer aktiviert und danach lesend bestätigt:
PR-Pflicht mit 0 Zustimmungen, ausschließlich `Quality gate` von GitHub Actions
(App-ID `15368`), strikte Aktualität zum Defaultbranch, Lösch-/Force-Push-Schutz
und leere Bypassliste. Der Admin-Schritt ist erledigt. Die tatsächliche
Erzeugung von `Quality gate` auf aktuellen Dependabot-PRs #33/#37/#39 ist
in AP40 belegt: App `15368`, jeweils rot und `blocked`. Der frühere rote PR #48
bleibt gesonderter Sperrnachweis. Klassische Admin-Regeleinsicht bleibt begrenzt.
Teil-Reruns mit Build-Artefakten älterer Versuche scheitern absichtlich am
Proof-Kontext. Quellenfehler und neue 4K-Abweichungen separat bearbeiten.
Befund, reale Läufe und Abschlussgrenzen: [docs/AP32.md](docs/AP32.md).

Die Farbauswahl hält den Popover-Rahmen auch beim kalten Lazy-Import geöffnet;
Suspense ersetzt nur den Inhalt durch einen zugänglichen Ladedialog. Escape
muss während des Ladens schließen, der fertige Dialog fokussiert „Iris“ erst
nach dem Mount des Inhalts. Kontrollierte Modulverzögerung in
`e2e/accent-picker.spec.ts` prüft Kaltstart und Wiederöffnen in drei Engines.

## AP37 · Dokumentationsquellen

Externe Release-Links bleiben blockierend. Der Checker sichert Diagnosen auch
bei Fehlern in `test-results/release-docs.json`; ein Versuch, 30 Sekunden je URL,
keine automatischen Wiederholungen. Nur die bestehenden exakten ISO-/HHS-403-
Entscheidungen gelten als manuell geprüft, niemals als bestandener HTTP-Test.
Vertrag, Quellenzuordnung und Ausführungsgrenzen: [docs/AP37.md](docs/AP37.md).

## AP34 · jsdom-Testumgebung

jsdom 30.1.3 ersetzt 27.4.0; der Node-Vertrag wird innerhalb 24 auf
`>=24.15.0 <25` angehoben. 24er-Typen und die Produktabhängigkeiten blieben bei AP34 erhalten;
Vitest wurde anschließend separat durch AP35 auf 5.0.5 migriert. Reguläre Lockfile-Erzeugung mit Node 24/npm 11.19.0;
`Node 24 minimum` ist Bestandteil des gemeinsamen Quality gate. UI und Engine
laufen vollständig getrennt; reale Browser bleiben für Layout, Fokus und
Pointerinteraktion maßgeblich. Entscheidung, Vergleich und Grenzen:
[docs/AP34.md](docs/AP34.md). #59 ist integriert, #36 danach geschlossen.

## AP35 · Vitest-Projektgrenzen

Vitest 5.0.5 behält zwei unabhängige Inline-Projekte: ausdrücklich
`extends: false` und `sharedViteServer: false`. App-Buildplugins gehören
nicht in diese Projekte. UI verwendet jsdom und das bestehende Testsetup;
Engine/Units/Graph verwenden Node ohne UI-Setup. `clearMocks: false` und
`restoreMocks: false` erhalten den bisherigen lokalen Mock-Lebenszyklus.
Vollständige Auswahl, Titelzuordnung und Nachweise: [docs/AP35.md](docs/AP35.md).

## AP42 · Gemeinsame Buttons

Der native Button bleibt stabiles Klickziel und trägt den nativen Fokusring.
Press skaliert eine gemeinsame Oberfläche mitsamt Inhalt mit zentralen Button-Press-Tokens;
keine Radiusinterpolation, kein Flexwachstum verbundener Buttons. Paint-Rollen
über `--ui-button-background/border/shadow`, Formen weiterhin über Shape-Tokens.
Selected setzt vorhandene Form-Endpunkte direkt. AP19-Recorder und AP36-Fälle
prüfen gemeinsame Buttons zusätzlich zum Keypad; Vertrag/Nachweise: [docs/AP42.md](docs/AP42.md).

## AP43 · Stetige Parameterkurven

`CurvePresentation` trennt Funktion/Reveal von akzeptierten Cachepfaden;
`SamplingQueue` hält einen laufenden und einen ersetzbaren Folgeauftrag.
Nur kompatible Parametersnapshots derselben Generation/Ansicht dürfen
Zwischenfortschritt darstellen. Navigation/Struktur einschließlich A → B → A
entwertet alte Aufträge. Aktuell sind ausschließlich die vollständig passenden,
tatsächlich gerenderten neuesten Daten; PNG und Diagnosen beachten Pending.
AP21/AP27/AP28, deterministische Budgets, Dirty-Rendering und Idle bleiben
bindend. Vertrag, Latenzgrenzen und tatsächliche Nachweise: [docs/AP43.md](docs/AP43.md).

## AP44 · Einstellungsaktionen

Die normale Shell behält ThemeSwitch; AccentPicker liegt unter Einstellungen →
Erscheinungsbild, die Installation unter App nur mit Browserprompt. `usePwa`
bleibt zentral in App; SettingsDialog erhält nur `PwaInstallation`. SettingsDialog
und AccentPanel bleiben lazy. Stabile Akzent-Refs stellen den Fokus nach kaltem
Overlaywechsel und verbrauchtem Prompt wieder her, ohne zusätzliche Fokusfalle.
Navigation, Kaltstart, Offlinezugriff und echter Tabzoom: [docs/AP44.md](docs/AP44.md).

## AP45 · Gemeinsame Overlaybewegung

Die verbindliche kurze Matrix steht in [docs/AP45.md](docs/AP45.md).
App-/Accent-Controller übergeben Open an React Aria und entfernen geschlossene
Overlays nicht vor ihrer Exitphase. Exit-Inhalte sind inert/pointerdurchlässig;
Motion-/OS-Cancel darf keinen geschlossenen Scope zurücklassen. Overlay-Opacity
und Controls-Farben verwenden Effects Fast; Selected-Radien bleiben diskret,
Sliderpositionen folgen direkt. AP20/AP36/Galerie bleiben die Prüfinfrastruktur.

## AP46 · Integrierte Abnahme

Bestehende native AP19/AP20/AP36-Recorder bleiben die Bewegungsnachweise;
Graphparameterfälle prüfen mindestens zehn Sekunden reales Playback und sichern
Zwischenbilder sowie vollständige Pause-Signaturen. AP46 liest für die gezielte
main-Abnahme das versiegelte Artefakt 12356744938 aus Lauf 39628007681, mit festem
ursprünglichem Kontext/Fingerprint vor und nach den Tests. Dieser reine
Abnahmeverbraucher hat keine Veröffentlichungsrechte und liefert niemals Bytes
an den regulären Freigabe-/Deploypfad. Dessen strikte Same-Run-Bindung bleibt
unverändert. PR-Head, main-/Produkt-SHA und aktive Live-Clientfassung weiterhin
trennen; die letzte bleibt bei einer Umgebungssperre ausdrücklich unbekannt.

## AP47 / AP48 · Reparatur der Abnahme

[docs/AP47.md](docs/AP47.md) trennt den kontrollierten Canvas-Kontexthinweisvergleich,
WebKit-Messlast und den Unit-/Browser-Overlayvertrag. Der sichtbare Graphcanvas
verwendet den Standardkontext mit alpha=false; kein desynchronized-Hinweis.
WebKit-Frameproben laufen im regulären Browserjob isoliert mit einem Worker,
alle Grenzen unverändert. Rohproben auch bei frühem Fehler sichern.
Unit-Vorbereitung und React-Abschluss ersetzen keinen kalten Produktionspfad:
History-Exit → Settings wird mit zurückgehaltenem Modul und echtem Fokus in
drei Engines geprüft. Merge ist durch den neuen Nutzerauftrag ausschließlich
nach grüner finaler Pflicht-CI und relevanten Zusatzprüfungen autorisiert;
die reale main-/Pages-Kette danach separat prüfen. Keine Tags/Releases/manuellen Deploys.

AP46s historischer Artefaktverbraucher checkt denselben festgelegten c95-SHA
für Galerie, Helper und Producerprüfung aus. Bei späteren Produktreparaturen
niemals neuen PR-Quellcode als unveränderten c95-Quellcode ausgeben oder die
Gleichheitsprüfung lockern. Neue Produktbuilds werden separat in ihrer eigenen
aktuellen CI abgenommen.

## AP49 · Begrenztes feines Gitterraster

[docs/AP49.md](docs/AP49.md) bindet den festen Original-/Kandidatenvergleich.
Nur dichte große, deckende periodische Feingitter mit regulärem DPR bis 1,5
verwenden eine begrenzte native Rasterzelle; volle Quellabmessungen erhalten
WebKit-Coverage. Andere Fälle behalten die ursprünglichen nativen Pfade.
Keine DPR-/Geometrie-/Samplingverringerung. Quellenfläche und Perioden bleiben
begrenzt; cacheweise WeakMap-Wiederverwendung ändert keine Idle-Steuerung.
Die normale Drei-Engine-Pixelregression prüft Hell/Dunkel, Phasen, Resize und
native DPR-Rückfälle. Maßgeblich bleiben alle ursprünglichen Performancegates
und die abschließende Produkt-CI; ein insgesamt roter kontrollierter Vergleich
mit nachgewiesen rotem Original darf nicht als grüner Workflow bezeichnet werden.

## WP-04 · Label in Name

[docs/ACCESSIBILITY_LABEL_IN_NAME.md](docs/ACCESSIBILITY_LABEL_IN_NAME.md)
trennt die historischen PR-65-Nachweise von der lokalen Übernahme auf aktuellem
main. Sichtbarer Text einschließlich Zahl, Kürzel, Definition, Einheit, Zähler
und Badge gehört in den zugänglichen Aktionsnamen. Die lokalisierte Anzeige aus
WP-02 bleibt von kanonischem Bearbeitungsquelltext getrennt. Die Produktions-
und Galerieregression aktiviert `label-content-name-mismatch` ausdrücklich,
ohne andere Regeln auszuschalten. Aktueller Prüfstatus: [docs/WP04.md](docs/WP04.md).
