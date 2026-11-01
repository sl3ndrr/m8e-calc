# WP-09 · Reparaturabnahme vom 01.11.2026

**Der gebündelte Sicherheitskandidat ist an der sauberen npm-ci-Installation
gescheitert und wird nicht übernommen.** Der vollständige Audit bleibt
unverändert blockierend. Die tatsächlichen Eltern-APIs sind jetzt zugeordnet;
ein allgemeiner API-Bruch aller Eltern ist nicht die belegte Fehlerursache.
Der freigegebene JSX-A11y-Kompatadapter mit begrenzten Overrides erzeugt ein
Lockfile, das npm 11.19.0 im frischen Checkout mit EUSAGE zurückweist.
Die bindende Stoppregel greift; es folgen keine weiteren Reparaturversuche.
Merge, Release, Tags und Deployment benötigen eine neue ausdrückliche Freigabe.

## Quellen und Identitäten

Ausgang ist weiterhin main einschließlich WP-08,
`9b5b3736d8fdeb2d2706658e04bfc357883c3134`, Commitzeit 30.10.2026,
22:31:58 UTC / 23:31:58 Europe/Berlin. Der bei Auftragsbeginn aktuelle PR-Head
war `64054a721d222588b7ca368e107593c1d1dcd62d` vom 31.10., 16:41:54 UTC.
Der im Auftrag genannte `32b9bbd` ist ein historischer Produktnachweis.
Arbeitsbranch bleibt `feat/audit-wp-09`; Veröffentlichung erfolgt ausschließlich
als Fast-forward mit erwarteter vorheriger Head-SHA. Kein historischer
Audit-Checkout, neuer PR, neues Issue oder Eingriff in Repositoryregeln.

Gelesen wurden AGENTS, README, CONVERT_MODE, DESIGN, COMPONENTS, AP19, AP42,
WP04, WP09, IMPLEMENTATION_STATUS, AP24 und die einschlägigen QA-/AP31-/AP46-/
AP47-/AP49-Verweise. Der vollständige Repositorybaum enthält nur die zentrale
AGENTS.md. Historische Mergeaufträge werden nicht als aktuelle Freigabe benutzt.

Git-Clone und npm-Registryzugriff liefern lokal erneut HTTP 403; insbesondere
der Abruf der verbindlichen npm-Version 11.19.0 scheitert. Lokal verfügbar:
Node 24.22.1, npm 11.9.0. Die ausgewählten Quelldateien sind eine lesende
Arbeitskopie, kein vollständig installierter Git-Checkout. Reguläre Installation,
Builds und Browser laufen deshalb auf den tatsächlichen GitHub-Checkouts.
Die lokale Pixelanalyse liest ausschließlich die heruntergeladenen CI-Bilder.

## Erhaltene Produktreparaturen und abgeschlossene Prüfungen

Die im bestehenden PR korrigierten Zahlen-, Label-, Kategorienfokus-, Kontrast-,
Fokusflächen- und Panelprobleme bleiben erhalten. Vollständige Werte und
WP-04-Namen, getrennte Scroll-/Copyaktionen, Home/End, eigenständiger Swapplatz,
AP42-Pressoberflächen, zentrale Tokens sowie die browserfreien Domänen bleiben
unverändert. In diesem Reparaturnachtrag war kein weiterer Produktdiff erforderlich.

Der vollständig abgeschlossene [Lauf 41239303423](https://github.com/sl3ndrr/m8e-calc/actions/runs/41239303423)
prüft Head `9f91a7b8bd2d756ddd093491dacd9c4768dea7ed`, Merge-/Build-SHA
`bccf8a383b94eb942312ba43dbc8d82bdd9ce367`. Beide vollständigen Checks bestehen:
641 UI- und 1744 Engine-/Units-/Graph-Tests, Lint/Format, Typen, Build und
Benchmarks. Chromium besteht 300 Tests; Firefox und WebKit je 248 bei jeweils
zwei bestehenden Clipboard-Skips. Visuals 24, separate Galerie 75 und Provenienz
36 bestehen ebenso wie Performance, Quellen und Pages-Artefaktprüfung.
AP22 41239303450 und AP28 41239303478 sind erfolgreich.

Normalartefakt 13056109538, ZIP-SHA256
`5baee19acc1918ff07525a79ab07f0544722a91936d265f4ebf64a445d921930`,
Fingerprint `797b6f01e8aafe0923a887b31904e4331cbee1229f22c75421ee5d871b40d70a`:
alle 145 Produktionsdateien sind lokal nach Größe und SHA-256 geprüft.
Der Startgraph misst 190763 Byte gzip bei unverändertem 200000-Byte-Budget.
Full audit scheitert mit zwölf moderaten Paketbefunden; QA-/Quality gate sind
deshalb rot. Deploy Pages ist übersprungen. Kein ausgeführter fehlgeschlagener
Pages-Deploy wird daraus abgeleitet.

Runtime: Build Node 24.22.2, Mindestversion 24.15.0; npm 11.19.0. Bestehende
QA-Verbraucher verwenden Node 24.22.1. Playwright 1.64.1 installiert Chromium
156.0.8078.4 (1248), Firefox 157.0 (1555), WebKit 27.2 (2370).
Chromium prüft die echte Clipboard-API; Firefox/WebKit behalten ihre explizite
Memory-Fixture und die beiden bestehenden Skips. Die zwei getrennten
Zeilen-/Panelgegenproben und ihre Wiederherstellungsassertions bestehen.

Nachfolgende Test-/Dokumentationscommits benötigen ihre eigene vollständige CI.
Die endgültige Head-/Merge-/Laufidentität mit deren tatsächlichem Abschluss
steht in [PR #88](https://github.com/sl3ndrr/m8e-calc/pull/88); die oben genannten
Ergebnisse bleiben ausdrücklich an 9f91a7b und seinen Build gebunden.

## Frische Ausgangsmessung und ursprünglicher Swapverdacht

Der frühere Umgebungsblocker ist geschlossen. Ein eigener isolierter Worktree
des oben genannten WP-08-Ausgangsstands wurde mit Node 24.22.2/npm 11.19.0,
frischem `npm ci --engine-strict` und `npm run build` nach seinem eigenen
`dist/` gebaut. Buildziel ist `normal`, Base `/m8e-calc/`; build-info nennt den
richtigen Ausgangs-SHA. Der geprüfte normale PR-Build und sein Proof werden
vor und nach dem Vergleich unverändert verifiziert. Der zusätzliche
Ausgangsproof wird separat gespeichert und gelangt nicht in den Deploypfad.

[Lauf 41295979084](https://github.com/sl3ndrr/m8e-calc/actions/runs/41295979084),
Head `d6f3f54e1c3b9fa7970aeaec1c217a8e3cdfd569`, tatsächlicher Kandidatenbuild
`fdfc4fb6da13b409f726cff1d5e78f7b7aa89038`: Der Vergleichsjob besteht mit
576 DOM-Proben und 288 nativen Viewportbildern. Davon sind 96 reguläre Bilder
und 96 kontrollierte sichtbarer/ausgeblendeter-Swap-Paare. Das temporäre
Ausblenden ändert nur `visibility`. Werte, native Input-Scrollpositionen,
Viewport, DPR und Layoutrechtecke bleiben dabei nachweislich exakt gleich.
Blur entfernt vor beiden Kontrollbildern den blinkenden Caret; das Ende der
bestehenden Animationen wird abgewartet. Die regulären Fokusprüfungen bleiben
davon unabhängig unverändert.

Matrix: 1280×900, 1920×1080 und 3840×2160; de/en; hell/dunkel; Full Motion mit
OS-Reduktion aus/an; echtes Chromium-Tabzoom 100/200 %. Die lokale AP19-
Erweiterung setzt und liest `chrome.tabs.getZoom`; die tatsächliche Fenstergröße
wird gesetzt, beide CSS-Viewportmaße halbieren sich und DPR wechselt von 1 auf 2.
Es wird weder CSS-Zoom noch Device-Metrics-/DPR-Emulation als Browserzoom
ausgegeben. Firefox-/WebKit-Menüzoom und physischer OS-Zoom sind nicht geprüft.
Die reguläre Drei-Engine-Matrix prüft 100 % sowie die bestehenden Reflowfälle.

Die sechs DOM-Stressfälle enthalten Null, Minuszeichen, kleine/große Exponenten,
50 signifikante Stellen und 1253 Zeichen zulässigen Quelltext. Die Pixelpaare
verwenden die negative 50-stellige Exponentzahl. Lange Einheiten-/Viskositätsnamen,
Währung, Swap, Favoriten, History, Offline und Lazy-Loading bleiben in den
regulären Produktionsregressionen enthalten.

**Ergebnis des ursprünglichen Verdachts:** Eine direkte Verdeckung von
Ziffern durch den deckenden Swap-Buttonkörper wird für diese Matrix nicht
bestätigt: kein untersuchter solider Ziffernpixel innerhalb seiner Bounds wird
übermalt. Der weiter gefasste Paintverdacht ist als Schatteneinfluss bestätigt:
in allen 48 Ausgangspaaren ändern sich insgesamt 5471 solide Ziffernpixel
außerhalb der Buttonbounds, maximal um 18 von 255 Kanalstufen. Das ist keine
verschwundene oder abgeschnittene Ziffer. Labelüberdeckung ist dagegen direkt
bestätigt: 2692 solide Labelpixel innerhalb der Buttonbounds werden übermalt,
4336 einschließlich Schatten, maximaler Kanalunterschied 216.

Beim Kandidaten verändern die Kontrollen keinen Ziffern- oder Labelpixel;
alle entsprechenden Farbänderungen sind null. In den größeren Inputrahmen
ändern sich insgesamt noch 144 Pixel ohne Textvordergrund; diese Rohwerte
werden nicht als verschwundene Ziffern ausgegeben. Feld-/Input-/Label-
Schnittflächen sind in allen 288 Kandidaten-DOM-Proben null. Zahlen bleiben
einzeilig, alle Panel-Scroll-/Clientbreiten sind begrenzt. Die Ausgangsprobe
zeigt dagegen Karten-/Labelüberschneidungen und in 240 von 288 Proben
mehrzeilige Zahlen. Keine dieser Aussagen wird mit dem später im PR separat
gefundenen intrinsischen Hauptpanelüberlauf gleichgesetzt.

Der Bildleser zählt exakte Farbwerte ohne geänderte Pixelgrenze und hält
sämtliche Farbänderungen separat fest. Er ist eine lokale Bildanalyse mit
Python/Pillow 12.3.0, kein Screenreader- oder physischer Monitorbeleg.
16 repräsentative unveränderte Originalbilder, alle Bildhashes, die vollständigen
normalisierten Messwerte und beide getrennten Proofs sind unter
[baseline/](baseline/) archiviert. Die vollständigen 288 PNGs stammen aus
Artefakt 13078664617, ZIP-SHA256
`d499d421709b7a66f21994201ef4409aefe584a414f6a190b82ae94a6f3f69cb`.
Der Kandidatenfingerprint lautet
`73b799fb2fe589a06275e2558d4ff0f1c69347ecbb5791afdec7b2b22c1cb3a2`.

## Sicherheitsreparatur: realer Kandidat und bindender Stopp

Die bereits bekannten regulären Updates, ESLint-10-Peerfehler und isolierten
Minimatch-API-Aufrufe wurden nicht erneut als Reparaturkandidaten getestet.
Die frühere pauschale Schlussfolgerung, ein Major-Override könne wegen
`makeRe`/`matchOne` die tatsächlichen Elternaufrufe nicht erfüllen, war zu weit:
Diese entfernten Methoden werden in den hier gefundenen Aufrufstellen nicht
verwendet. Die Matrix wurde aus dem installierten node_modules-Code erhoben,
nicht aus angenommenen alten API-Verträgen.

[API-Lauf 41302330031](https://github.com/sl3ndrr/m8e-calc/actions/runs/41302330031)
prüft den temporären Head `0eb4aedaafd068ee9919dddf13f0709632a3f822`.
Sein API-Job besteht; der gesamte Lauf scheitert an der Formatierung des
temporären Skripts. Derselbe Job führt `npm audit --json` mit dem unveränderten
Lockfile von main `9b5b3736d8fdeb2d2706658e04bfc357883c3134` aus:
Exit 1, zwölf moderate Paketbefunde aus GHSA-g3hv-75wg-m249. Damit ist auch
diese main-Basis unter dem heutigen Advisory rot. Ihr historisch grüner
WP-08-Lauf endete vor Veröffentlichung des Advisorys.

Minimatch 11.0.3 exportiert in CJS ein Objekt und in ESM benannte Exporte,
darunter `minimatch` und `Minimatch`; ein aufrufbarer Moduldefault fehlt.
`makeRe`, öffentliches `matchOne` und AST fehlen. Die tatsächlichen Aufrufe:

| Elternpaket                                 | Import im ausgefuehrten Pfad               | Benutzte API                             | minimatch 11.0.3           |
| ------------------------------------------- | ------------------------------------------ | ---------------------------------------- | -------------------------- |
| eslint 9.39.5                               | CJS require / Destrukturierung             | Minimatch, match(path, partial), pattern | ja                         |
| @eslint/config-array 0.21.2                 | CJS require                                | Minimatch, match(path)                   | ja (ESM-Default unbenutzt) |
| @eslint/eslintrc 3.3.7                      | CJS require + Interop                      | Minimatch, match(path), pattern          | ja (ESM-Default unbenutzt) |
| eslint-plugin-jsx-a11y 6.10.2               | Babel _interopRequireDefault(require(...)) | aufrufbarer Default (name, pattern)      | nein, Adapter erforderlich |
| @typescript-eslint/typescript-estree 8.71.2 | benannter CJS-Export                       | minimatch(path, pattern, { dot: true })  | ja                         |

Die programmatische Laufzeitprobe im
[Lauf 41304003499](https://github.com/sl3ndrr/m8e-calc/actions/runs/41304003499)
erzeugt `new ESLint()`, führt `lintFiles(['src/ui/Icon.tsx'])` aus und prüft
anschließend `require.cache`. Geladen sind
`@eslint/config-array/dist/cjs/index.cjs` sowie
`@eslint/eslintrc/dist/eslintrc.cjs` und `dist/eslintrc-universal.cjs`;
kein gefilterter Pfad enthält `dist/esm` oder endet auf `.mjs`.
Die fehlenden ESM-Default-Exporte sind für diesen ausgeführten Projektpfad
deshalb kein Blocker. Für JSX-A11ys zwei Utilities bleibt der aufrufbare
Default tatsächlich erforderlich.

`npm view eslint-plugin-jsx-a11y dist-tags versions --json` bestätigt in
Lauf 41303739662 weiterhin 6.10.2 als neueste stabile Version. Eine neuere
stabile Veröffentlichung mit migriertem Aufruf stand damit nicht zur
Auswahl; kein Prerelease wurde übernommen.

Der einmal getestete gebündelte Kandidat begrenzt `overrides` auf
`eslint`, `@eslint/config-array`, `@eslint/eslintrc`,
`@typescript-eslint/typescript-estree` und `eslint-plugin-jsx-a11y`.
Die ersten vier verlangen exakt 11.0.3; nur JSX-A11y erhält
`file:./tools/minimatch-compat`. Das lokale CJS-Paket verwendet den Alias
`"minimatch-11": "npm:minimatch@11.0.3"`, damit der verschachtelte
Minimatch-Override nicht erneut auf den Adapter selbst zeigt. Sein vollständiger
Matcher stammt aus 11.0.3; die Exportbrücke lautet:

```js
const mm = module.require('minimatch-11');
module.exports = Object.assign((...args) => mm.minimatch(...args), mm);
```

`module.require` erhält den CJS-Laufzeitvertrag ohne Änderung der bestehenden
Require-Lintregel. Die resultierende Funktion kopiert keine nicht aufzählbare
`__esModule`-Markierung. Dies ist die getestete Kandidatenquelle, **kein
übernommenes oder erfolgreich validiertes Paket**.

Node 24.22.2 und npm 11.19.0 erzeugen mit
`npm install --package-lock-only --engine-strict` regulär ein Lockfile (Exit 0).
Manifest, Lockfile und Adapter werden im Runner lokal committet; ein neuer
Worktree dieses Kandidaten ist vor der Installation nachweislich sauber.
Dort scheitert das unveränderte `npm ci --engine-strict` mit Exit 1:

```text
npm error code EUSAGE
npm error npm ci can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync.
npm error Missing: minimatch@ from lock file
```

Der lokale `file:`-Override erfüllt damit V1 nicht. Es wurde weder das
Lockfile manuell repariert noch mit Patch-Tools, Installationssonderflags,
Peerumgehung, Force, Downgrade oder einer Audit-Ausnahme weitergearbeitet.
Der Kandidat wird verworfen; package.json, package-lock.json und tools/
werden nicht in den Branch-Endstand übernommen.

| Pruefung | Tatsaechliches Ergebnis des gebuendelten Kandidaten                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------- |
| V1       | FEHLER: Resolver Exit 0; frisches npm ci im sauberen Checkout Exit 1 (EUSAGE). npm ls danach nicht ausgefuehrt. |
| V2       | Nicht ausgefuehrt: Installation scheiterte vor dem Full audit.                                                  |
| V3       | Vorher-ESLint als JSON Exit 0; Nachher und Gleichheitsvergleich nicht ausgefuehrt.                              |
| V4       | Vorher: JSX-A11y, type-aware Regel, Domain-files-Glob und ignores bestaetigt; Nachher nicht ausgefuehrt.        |
| V5       | Kandidaten-check, Produktionsfingerprint und Pflicht-CI fuer eine Reparatur nicht erreicht.                     |

Die Vorher-Gegenproben melden `jsx-a11y/alt-text`,
`jsx-a11y/label-has-associated-control`,
`@typescript-eslint/no-floating-promises` und `no-restricted-globals`
an ihren absichtlichen Verletzungen. Die Datei unter test-results/ bleibt
ignoriert. Da die Produktkonfiguration keine type-aware Regel aktiviert,
ergänzt ausschließlich die nicht committete Probe dieselbe temporäre
`no-floating-promises`-/Project-Service-Konfiguration für beide Zustände.
Die tatsächlichen JSX-A11y-Aufrufe liefern 21 Vorher-Aufrufe mit den Mustern
`input`, `meter`, `output`, `progress`, `select`, `textarea` und
dem Probe-Glob `Custom*`. Der vorgesehene Alt-/Neu-Paritätstest über genau
diese zweistelligen Aufrufe wird wegen des vorherigen npm-ci-Fehlers nicht
ausgeführt. Eine unveränderte Lintwirkung nach dem Override wird somit
ausdrücklich nicht behauptet.

Die zusätzliche Quellcodeprüfung bestätigt: In der installierten Version
3.1.5 existieren weder `firstPhasePreProcess` noch `optimizationLevel`;
in 10.2.6 existieren beide. Das korrigiert die bisherige Verallgemeinerung
über die 3er-Linie. Der npm-Advisorybereich bleibt `<11.0.1`; aus dem Fehlen
dieser beiden Namen wird keine Auditfreigabe oder Ausnahme abgeleitet.

Experimentbudget einschließlich der ersten API-Probe:

1. Push `0eb4aeda`, Lauf 41302330031: API-/main-Audit-Erhebung erfolgreich;
   gesamter Lauf wegen Prettier rot. Danach per Revert zurückgenommen.
2. Push `6bd3cdde`, Lauf 41303739662: vor dem Kandidaten abgebrochen,
   `fatal: invalid reference: a009721...` im flachen Checkout. Danach
   per Revert zurückgenommen.
3. Push `d425fc86`, Lauf 41304003499: expliziter Fetch und Vorher-Proben
   erfolgreich; der reale Kandidat scheitert beim frischen npm ci wie oben.
   Kein weiterer Experiment-Push; Rückbau per Revert, anschließend nur diese
   Dokumentationskorrektur und der finale Fast-forward.

Die gesondert freigegebene Bereinigung entfernt die beiden temporären
WP09-Sicherheits- und Ausgangsvergleichsjobs samt Runner-Skripten in genau
einem Revert-Commit. CI-Orchestrator und dessen AGENTS-Ergänzung werden auf
den main-Stand zurückgesetzt; Produktcode, Tests, Grenzen und Referenzbilder
bleiben erhalten. Archivierte Nachweise behalten ihre ursprünglichen
Identitäten. Weitere Sicherheitsreparaturen erfolgen ausschließlich in einem
separaten WP von main; die Stoppregel für PR #88 bleibt bestehen.

PR #33 (ESLint 10) und PR #73 (TypeScript-ESLint) bleiben getrennte
Updatevorhaben. Ihre bereits verifizierten regulären Kandidaten beseitigen
den Minimatch-Pfad nicht; alte grüne Checks werden nicht als heutige
Sicherheitsfreigabe übernommen. Es gibt keinen übernommenen Override.
Für einen später erfolgreich validierten Override gilt die Entfernungsbedingung:
entfernen, sobald eslint, @eslint/*, typescript-eslint beziehungsweise
JSX-A11y selbst Minimatch >=11.0.1 verlangen; anschließend ohne Override
mit `npm ls minimatch --all` ausschließlich sichere Kopien bestätigen.

Dem Auftraggeber stehen nach der Stoppregel drei Entscheidungen offen;
keine davon ist umgesetzt:

1. Eine befristete, ausschließlich auf dieses Advisory und dev-only begrenzte
   Audit-Ausnahme; dafür wäre eine neue ausdrückliche Freigabe erforderlich.
2. Ein eigener Sicherheitsfix als WP auf main, danach WP-09 rebasen.
3. Auf kompatible sichere Upstream-Veröffentlichungen warten.

Merge, Release, Tags und Deployment bleiben ausdrücklich ohne Freigabe.

## Reproduktion und Offen / Folgearbeiten

Die verbindlichen Befehle bleiben aus package.json und den Playwright-
Konfigurationen abgeleitet:

```sh
npm install --global npm@11.19.0
npm ci --engine-strict
npm run check
npm audit --json
npx playwright install --with-deps chromium firefox webkit
npx playwright test --project=chromium
npx playwright test --project=firefox --project=webkit
npx playwright test --project=qa-visual
npx playwright test --config=playwright.ap28.config.ts --reporter=list
npx playwright test --project=chromium-graph-performance --no-deps --workers=1
npm run build:gallery
npm run test:e2e:gallery
npm run test:e2e:provenance
```

Die CI-Workflows führen zusätzlich Bundle/Kontrast, Lighthouse, Quellen und
Pages-TAR-Roundtrip aus. Galerie verwendet ausschließlich `dist-gallery/` und
ihre eigene Konfiguration. Test-Retries, Fristen, Zahlen-/Pixelgrenzen,
Performancebudgets und bestehende Bildreferenzen sind unverändert.

Die früheren WP09-Hilfsjobs verwendeten ausschließlich `contents: read` und
waren vom normalen geprüften Produktionsartefakt getrennt. Sie sind nach der
gesondert freigegebenen Bereinigung entfernt. Der unveränderte vollständige
Audit und der bestehende Quality gate bleiben bindend.

Für die lokale Pixelanalyse nach Entpacken des Vergleichsartefakts:

```sh
python scripts/wp09-glyph-review.py extracted-baseline glyph-review.json
gzip -dc docs/wp09/baseline/measurements.json.gz | python -m json.tool
```

Der konkrete Reparaturkandidat scheitert an V1; der Sicherheitsblocker innerhalb
WP-09 ist nicht behoben. Ohne kompatiblen Fix und vollständige grüne Pflicht-CI
auf genau dem endgültigen Head gibt es keine Mergebereitschaft. Physische 4K-/GPU-/OS-Zoom-/Clipboard-/Screenreaderabnahme
bleibt gesondert offen. PR-CI, main-CI, Pages-Artefaktprüfung, tatsächlicher
Pages-Deploy und aktiver Liveclient sind getrennte Nachweise: Für diesen Diff
wurden kein Merge, main-Lauf, Deployment oder Live-/Workerabgleich durchgeführt.
