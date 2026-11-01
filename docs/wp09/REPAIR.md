# WP-09 · Reparaturabnahme vom 01.11.2026

**PR #88 ist wegen des vollständigen Toolchain-Audits weiterhin nicht
mergebereit.** Der kompatible reguläre Updateversuch wurde installiert und
vollständig geprüft; er beseitigt den Befund nicht. Der aktuelle Major-Kandidat
scheitert am tatsächlichen Peer-Vertrag. Die Untersuchung gehört zum
Reparaturauftrag; sie wird nicht als erledigtes Sicherheitsupdate oder allgemeine
Folgearbeit ausgegeben. Merge, Release, Tags und Deployment benötigen eine neue
ausdrückliche Freigabe.

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

## Sicherheitsmigration: untersuchte Varianten und exakter Hinderungsgrund

Die [normalisierte Registry-/Resolver-/Auditaufnahme](security-repair-evidence.txt)
enthält die vollständigen npm-explain-Abhängigkeitsketten, Metadaten und Exitcodes
aus dem erfolgreich abgeschlossenen Ermittlungsjob von Lauf 41239303423.
Originalartefakt 13056667640, ZIP-SHA256
`94b5212a8a4ffab17f05b20c03ecff26975303604b4d5a72199135ab3a13605b`.
Die Erhebung vom 01.11. in Lauf 41295979084 bestätigt dieselben veröffentlichten
Versionen; Artefakt 13079059619, SHA256
`ea68d6ec5724b153047a5577991e5e6a968ab749063426de1c70227fae827687`.

Der [offizielle Advisorydatensatz](https://github.com/advisories/GHSA-g3hv-75wg-m249)
bewertet `<11.0.1` als betroffen. Ein Advisory erzeugt zwölf moderate
Paketbefunde, keine hohen/kritischen. Gelockt sind Minimatch 3.1.5 und 10.2.6.
Das ist ein Befund der Entwicklungsabhängigkeiten; eine ausnutzbare
Rechner-Browserlücke wird daraus nicht behauptet.

- Reguläres `npm update eslint @eslint/js typescript-eslint eslint-plugin-jsx-a11y --package-lock-only --engine-strict`
  erzeugt ein normales Kandidatenlockfile. Die TypeScript-ESLint-Familie steigt
  von 8.71.2 auf 8.72.1. Frisches `npm ci --engine-strict`, vollständiges
  `npm ls --all` und `npm run check` bestehen; der vollständige Audit bleibt
  unverändert bei zwölf moderaten Befunden. Dieser wirkungslose Sicherheitsdiff
  wird nicht in das Produktlockfile übernommen.
- Reguläres gemeinsames Update von ESLint, JS, TypeScript-ESLint und JSX-A11y auf
  `latest` scheitert vor Installation mit `ERESOLVE`: ESLint 10.14.0 kollidiert
  mit dem Peerbereich von JSX-A11y 6.10.2 `^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9`.
  TypeScript-ESLint 8.72.1 und Hooks 7.1.1 erlauben 10; dieser eine bestätigte
  Peerblocker darf nicht durch Forced Resolution verdeckt werden.
- Auch bei aufgelöstem ESLint-Peerproblem wäre der Audit nicht behoben:
  ESLint 10.14.0 verlangt Minimatch `^10.2.6`, Config-Array 0.23.5 `^10.2.4`,
  TypeScript-ESTree 8.72.1 `^10.2.2`, JSX-A11y 6.10.2 `^3.1.2`.
  Die neuesten kompatiblen Minimatch-Linien bleiben 3.1.5 und 10.2.6;
  11.0.3 liegt außerhalb aller dieser Bereiche.
- Minimatch 11 wechselt den Matcher und entfernt unter anderem `makeRe`,
  `matchOne` und AST. JSX-A11y 6.10.2 verwendet einen aufrufbaren Defaultimport;
  Minimatch 11 bietet einen benannten `minimatch`-Export. Quellen:
  [Minimatch 11.0.3](https://github.com/isaacs/minimatch/blob/v11.0.3/README.md),
  [konkreter JSX-Aufrufer](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/v6.10.2/src/util/mayHaveAccessibleLabel.js).
  Der abschließende Ermittlungsjob installiert zusätzlich Minimatch allein mit
  regulärem Lockfile und prüft diese tatsächlichen API-Aufrufe. Das ist kein
  Major-Override des Projekts und kein Sicherheitsnachweis der alten Aufrufer.

PR #33 ist offen auf `f47d74ebfa5064846b765f98a40b114faa79b4fc` und bietet
ESLint 10.13.0/JS 10.0.1; der aktuelle, neuere Kandidat wurde unabhängig davon
geprüft. PR #73 ist offen auf `cd75a082595e73e9eb1f7dfbe42e365259873a36` und
bietet TypeScript-ESLint 8.72.0. Selbst die neuere geprüfte 8.72.1 löst den
Minimatch-Pfad nicht. Keiner der PRs wird aufgrund seines Titels oder alter
Checks übernommen.

Damit ist kein sicherer kompatibler regulärer Updatepfad veröffentlicht und
geprüft verfügbar. Erforderlich wären sichere kompatible Veröffentlichungen
oder tatsächlich migrierte Elternpakete einschließlich JSX-A11ys Peer-/API-
Vertrag. Ein Major-Override erfüllt diese Verträge nicht. Ein eigener Fork würde
zusätzlich die vollständige Matcher- und Accessibility-Regelparität beweisen
müssen; ein spekulativer Adapter wird nicht als Sicherheitsfix ausgegeben.
Keine Audit-Ausnahme, Schwellenänderung, Dependency-Auslassung, Regelabschaltung,
Downgrade oder `npm audit fix --force` wird verwendet.

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

Die zwei neuen WP09-Jobs verwenden ausschließlich `contents: read` und den
bestehenden CI-Orchestrator. Der Vergleich konsumiert die Producer-Artefakt-ID
desselben Laufs und derselben Attempt. Ermittlungs- und Ausgangsbuildartefakte
werden niemals als normale geprüfte Produktionsbytes veröffentlicht. Der rote
vollständige Audit und der bestehende Quality gate bleiben bindend.

Für die lokale Pixelanalyse nach Entpacken des Vergleichsartefakts:

```sh
python scripts/wp09-glyph-review.py extracted-baseline glyph-review.json
gzip -dc docs/wp09/baseline/measurements.json.gz | python -m json.tool
```

Offen bleibt der konkret belegte Sicherheitsblocker innerhalb WP-09. Ohne dessen
kompatiblen Fix und vollständige grüne CI des endgültigen Heads gibt es keine
Mergebereitschaft. Physische 4K-/GPU-/OS-Zoom-/Clipboard-/Screenreaderabnahme
bleibt gesondert offen. PR-CI, main-CI, Pages-Artefaktprüfung, tatsächlicher
Pages-Deploy und aktiver Liveclient sind getrennte Nachweise: Für diesen Diff
wurden kein Merge, main-Lauf, Deployment oder Live-/Workerabgleich durchgeführt.
