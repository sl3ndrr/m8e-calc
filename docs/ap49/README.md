# AP49 · Begrenzte 4K-Gegenproben und aktueller Abnahmestand

Diese Aufnahme ergänzt PR #69. Sie ist **keine Produktkorrektur und keine Freigabe**.
Der Diagnosebranch enthält wieder den Produkt-/Testbaum des PR-Heads efc029c2
und diese Belege; beide verworfenen Prototypen und ihr Pushworkflow sind aus
seinem aktuellen Baum entfernt. Die gebundenen historischen Commits/Läufe bleiben
unverändert verfügbar. Keine erneute FPS-Auswahl, kein Merge/Deploy.

## Aktueller Produktbefund

Head `efc029c2313d7f6938148331395e6a632149f577`, tatsächlicher Build
`9fafd3341995f7727e49a87c0721c62837c1c184`,
[CI 39662444234](https://github.com/sl3ndrr/m8e-calc/actions/runs/39662444234).

| Prüfung | Status | Gebundene Aussage |
| --- | --- | --- |
| npm run check / aktuelle und minimale Node-24-Version | bestanden | 488 UI / 1666 Engine in beiden vollständigen Läufen |
| Chromium / Firefox / WebKit | bestanden | 192 / 165 / 165; Firefox/WebKit je 2 bekannte Clipboard-Skips |
| 15 Langzeit-Playbackfälle / drei Engines | bestanden | 12,357–15,838 s; keine Blank-/Revealframes; jede der letzten zehn Sekunden mindestens drei gerenderte Signaturen |
| Kalter/warmer History→Settings-Handoff | bestanden | Nativer Klick während gehaltenem echtem Exit, kaltes Modul, Fokus und Wiederöffnen in drei Engines |
| Galerie / 24 bestehende Bildreferenzen / Kontrast und Fokus / Startbudget / PWA und Provenienz / Artefaktprüfung | bestanden | Pflichtjobs desselben Builds; überlappende Fallzahlen nicht addiert |
| 4K-Pan / Quality gate | fehlgeschlagen | Sichtbar 42,861 / 42,860 / 42,606 FPS; Grenze unverändert ≥55. Render-P95 0,5–0,6 ms misst nur Canvas-Aufrufe |
| Neuer main-/Pages-Deploy | nicht geprüft | Noch kein Merge; letztes erfolgreiches main/Pages bleibt c95f183a |
| AP39 aktive Livefassung / Worker / Update / Offline | blockiert | Exakte App-/build-info-Aufrufe nach erfolgreichem c95-Deploy: „Forbidden. Calls to this URL are not allowed.“ Kein Websiteausfall daraus ableitbar |
| Physische GPU / Screenreader / OS-Installation / Firefox- und Safari-Menüzoom | nicht geprüft | Headless ersetzt diese Prüfungen nicht |

Normalartefakt unabhängig geprüft: 143 Dateien / 3.250.197 Bytes, Fingerprint
`b55c982dfaaabc08a35153c5b09e7af32d331b6901563a61e80c4e3dbe5b8346`.
Pages-Paket desselben Laufs geprüft, **nicht veröffentlicht**.

## Genau zwei vorab festgelegte Gegenproben

1. [39667544366](https://github.com/sl3ndrr/m8e-calc/actions/runs/39667544366),
   Commit `da63eb3b1bb62785ce9832e3e90dd4b6d1944e20`,
   Artefakt 12378561070: Produktkontext, anschließend ausschließlich
   willReadFrequently=true. Beide nahe 60 FPS auf demselben AMD EPYC 7763.
   DoUpdateLayers 824,139 → 861,223 ms, je 66 Aufrufe. **Kein Nutzen belegt,
   Hinweis nicht übernommen.**
2. [39668712661](https://github.com/sl3ndrr/m8e-calc/actions/runs/39668712661),
   Commit `e61a3a69cf920c1e41aa32d5f528920f76fd4db0`,
   Artefakt 12378487659: bisherige Strokes, anschließend dieselben geometrischen
   Gitterlinien als gemeinsamer Fillpfad. Gleicher Runner, feste Originalfenster,
   3840×2160, DPR 1, gesunde/absichtlich langsame Referenzen unverändert.
   Sichtbar 58,068 / 58,542 / 58,542 → 46,455 / 47,686 / 45,863 FPS.
   DoUpdateLayers 955,765 → 1363,335 ms, je 66 Aufrufe.
   Zusätzlich exakter RGBA-Vergleich bei DPR 1/2 und gebrochenen Positionen:
   Unterschiede bis 27 Kanalstufen. **Langsamer und andere Rasterpixel;
   Prototyp nicht übernommen.**

Beide A/B-Paare jeweils einmal in fester Reihenfolge, ein Worker, keine Retries.
Node 24.21.0 / npm 11.19.0 / Chromium 156.0.8078.4 /
AMD EPYC 7763 / vier vCPU / Image 20261012.334.1 / Software-Canvas.
Die zweite Messung baut je Variante gesondert; build-info nennt den Diagnosecommit,
die genaue Renderer-Prüfsumme steht im Originalartefakt. Keine Behauptung, die
beiden Varianten seien identische Buildbytes. Kein Vergleich von FPS verschiedener
Runner als kausaler Nachweis. Die grüne erste Gegenprobe macht den roten
Pflichtlauf nicht grün.

Lesbare Metriken und Original-SHA256:
[canvas-hint.json](canvas-hint.json), [grid-raster.json](grid-raster.json).
Vollständige unveränderte Traces nur in den genannten CI-Artefakten; keine
komprimierten undurchsichtigen Traces in dieser Veröffentlichung.
Die Skia-Ereignisse lokalisieren wesentliche Kosten in der Pfadrasterung;
eine alleinige Runner-/physische GPU-Ursache ist dadurch nicht bewiesen.

## Echte Bilder des aktuellen PR-Builds

[Manifest und 15 Mitschnittzusammenfassungen](product-summary.json).
Bilder stammen unverändert aus CI 39662444234, Build 9fafd334; keine Baselines.
Die Bildlinks öffnen das Chromium-Originalartefakt; genaue Dateipfade und
SHA256 stehen im Manifest. Binärbilder werden hier nicht zusätzlich dupliziert.

| Bild | Aussage |
| --- | --- |
| [History-Exit / kalte Settings](https://github.com/sl3ndrr/m8e-calc/actions/runs/39662444234/artifacts/12376946311) | Tatsächlicher gehaltener Exit-Zwischenframe |
| [Settings nach History](https://github.com/sl3ndrr/m8e-calc/actions/runs/39662444234/artifacts/12376946311) | Tatsächlicher Enter-Zwischenframe; kein behaupteter fertiger Endzustand |
| [Implizites Playback mittendrin](https://github.com/sl3ndrr/m8e-calc/actions/runs/39662444234/artifacts/12376946311) | Geometrie bei a=2,9 |
| [Implizit pausiert](https://github.com/sl3ndrr/m8e-calc/actions/runs/39662444234/artifacts/12376946311) | Pausewert a=1,5 und zugehörige sichtbare Geometrie |

Die vollständigen Frame-Rohdaten und übrigen PNGs liegen in den Browserartefakten
12376946311 / 12376381548 / 12376512874. Standbilder allein beweisen keine
zehnsekündige Kontinuität; dafür gelten die gespeicherten Frame-Signaturen.

## Konkreter Restauftrag #43 / Folgepaket AP49

Den 4K-Pfadrasteraufwand als Produktarbeit bearbeiten, nicht durch weitere
Abnahmereruns verdecken. Reproduktion: tatsächlicher oben genannter Build,
ursprünglicher AP28-Sechskurvenfall, sichtbares 3840×2160-Pan; verborgener
Canvas und Idle als getrennte Referenzen. Renderer-Aufrufzeit und nachgelagerte
Raster-/Präsentationszeit getrennt aufzeichnen. Neue Lösung zuerst mit
unveränderter sichtbarer Geometrie, Reveal/Parameterwechsel, Export und
Tastatur-/Fitverhalten begründen; verworfene CPU-/Fillvarianten nicht erneut
als vermeintliche Reparatur anwenden.

Abnahme: gleiche sechs Kurven, drei feste sichtbare/verborgene Fenster,
≥55 FPS und Render-P95 <16,67 ms; Slow-Render und Slow-Main müssen rot
erkennbar bleiben. Mixed-2D, Idle, Worker-Aktualität, AP21-Fit, voller check
und alle Pflicht-/relevanten Zusatzgates auf dem endgültigen Reparaturcommit.
Kein neuer Screenshotbaseline-Satz, keine Budget-/Retry-/Skip-Ausnahme.
Der aktuelle Auftrag für kleine Integrationsreparaturen liefert dafür noch
keine belegte zusätzliche Produktkorrektur. #43 und PR #69 bleiben offen.

## Issue-Empfehlungen und Handprüfung

#22 wegen echter offener Livekriterien offen. #43 offen. #70/#71 zur Review
der getrennten Harness-/Browserkorrekturen, historische genaue Ursachen bleiben
unbewiesen; keine automatische Schließung. #32 zeigt integriertes jsdom/Vitest/
Motion und den wirklichen Material/F6-Rest. #31/#50 und #33/#37/#39 bleiben
bei fehlenden veröffentlichten Voraussetzungen offen.

Nach späterem tatsächlich erfolgreichem Deploy: Netzwerk-build-info und aktive
Assets/Worker im frischen und schon kontrollierten Profil zuordnen, anschließend
Update/Reload/Offline und vier Kernmodi. Bei derselben URL-Sperre exakt
protokollieren und blockiert belassen. Auf realem Desktop: 4K-GPU-Playback/Pan,
Browserzoom bis 200%, schnelle Press/Releasefolgen, Akzent/OS-Installation,
verschachteltes Escape/Fokus und Screenreader prüfen.
