# WP-09 · Reparaturabnahme vom 01.11.2026

Der Sicherheitsfix aus PR #90 ist auf main übernommen und per Merge ohne
Rebase in WP-09 integriert. Der Integrationsschritt ändert keinen Produktcode,
keine bestehenden Tests, Assertions, Budgets oder Referenzbilder.
Die vollständige Pflicht-CI des endgültigen Heads und der Vergleich mit dem
zuletzt geprüften WP-09-Produktionsartefakt werden in PR #88 ausgewiesen.
Der Merge von PR #88, Release, Tags und Deployment benötigen weiterhin eine
neue ausdrückliche Freigabe.

## Quellen und Identitäten

Die historische Produktbasis ist main einschließlich WP-08,
`9b5b3736d8fdeb2d2706658e04bfc357883c3134`, Commitzeit 30.10.2026,
22:31:58 UTC / 23:31:58 Europe/Berlin. Der bei Auftragsbeginn aktuelle PR-Head
war `64054a721d222588b7ca368e107593c1d1dcd62d` vom 31.10., 16:41:54 UTC.
Der im Auftrag genannte `32b9bbd` ist ein historischer Produktnachweis.
Der Sicherheitsfix aus [PR #90](https://github.com/sl3ndrr/m8e-calc/pull/90)
liegt mit Merge-SHA `bf45ce8ab38df37112acbc5d908081007e9ec200` auf main;
die zugehörige [main-CI 41327790799](https://github.com/sl3ndrr/m8e-calc/actions/runs/41327790799)
ist vollständig erfolgreich. Der Integrations-Merge in WP-09 lautet
`42a9a55c8f7e1861656b27995dbc053e35ec1f8c` mit den Eltern
`b4d8a8836b292b52a472155ad733bbfaa5b25b8b` und dem genannten main-SHA.
Die Dokumentationsbereinigung ist in einem getrennten Commit enthalten.
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

## Archivierte Ausgangsmessung und ursprünglicher Swapverdacht

Der Ausgangsvergleichsjob wurde mit dem Rückbau entfernt und ist kein
lauffähiger Bestandteil der heutigen Pipeline. Alle 288 Bilder und Messwerte
bleiben im archivierten Artefakt **13080436579** erhalten. Unter
[docs/wp09/baseline](baseline/) bleiben die Messwerte, Bildhashes und
16 repräsentative Originalbilder archiviert. Diese Nachweise gehören ausschließlich zur
historischen Vergleichsmessung und werden nicht als aktueller Lauf ausgegeben.

Der frühere Umgebungsblocker ist geschlossen. Ein eigener isolierter Worktree
des oben genannten WP-08-Ausgangsstands wurde mit Node 24.22.2/npm 11.19.0,
frischem `npm ci --engine-strict` und `npm run build` nach seinem eigenen
`dist/` gebaut. Buildziel ist `normal`, Base `/m8e-calc/`; build-info nennt den
richtigen Ausgangs-SHA. Der damalige normale PR-Build und sein Proof wurden
vor und nach dem Vergleich unverändert verifiziert. Der zusätzliche
Ausgangsproof wurde separat gespeichert und gelangte nicht in den Deploypfad.

[Lauf 41295979084](https://github.com/sl3ndrr/m8e-calc/actions/runs/41295979084),
Head `d6f3f54e1c3b9fa7970aeaec1c217a8e3cdfd569`, tatsächlicher Kandidatenbuild
`fdfc4fb6da13b409f726cff1d5e78f7b7aa89038`: Der inzwischen entfernte Vergleichsjob lieferte damals
576 DOM-Proben und 288 native Viewportbilder. Davon sind 96 reguläre Bilder
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

## Übernommener Sicherheitsfix

Der Fix für GHSA-g3hv-75wg-m249 wurde mit [PR #90](https://github.com/sl3ndrr/m8e-calc/pull/90)
und Merge-SHA `bf45ce8ab38df37112acbc5d908081007e9ec200` auf main übernommen.
Lösung, Kandidatenhistorie, API-Matrix, Experimentstatus, Guard und
Entfernungsbedingungen stehen ausschließlich im
[Sicherheitsdokument](../security/GHSA-g3hv-75wg-m249.md).

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

Die temporären Sicherheits- und Ausgangsvergleichsjobs samt ihren
Runner-Skripten wurden entfernt; sie laufen nicht mehr in der Pipeline.
Die unten genannten Befehle lesen ausschließlich archivierte Vergleichsdaten.

Für die lokale Pixelanalyse nach Entpacken des Vergleichsartefakts:

```sh
python scripts/wp09-glyph-review.py extracted-baseline glyph-review.json
gzip -dc docs/wp09/baseline/measurements.json.gz | python -m json.tool
```

Die aktuelle Head-/Build-/CI-Identität und der Produktionsvergleich gegen
Artefakt 13079539752 (145 Dateien; build-info.json ausgenommen) stehen in
[PR #88](https://github.com/sl3ndrr/m8e-calc/pull/88). Historische Produkt- und
Bildnachweise behalten ihre ursprünglichen Identitäten. Physische
4K-/OS-Zoom-/Screenreader-/Clipboard-Abnahme ist nicht Teil dieses
Integrationsschritts und bleibt gesondert offen. Der Merge von PR #88,
Release, Tags und Deployment benötigen weiterhin eine neue ausdrückliche
Freigabe; dieser Schritt führt keine dieser Aktionen aus.
