# Graphen · AP13

`src/features/graph` bindet die reine AP12-Engine an die Graphen-Route an. Die
Domäne bleibt ohne Browserimporte. `model.ts` enthält Parserintegration,
Parametersuche, Plot-Satz-Reducer, validierte Wiederherstellung, Trace und Tabellen.
Die Funktionsliste verwendet den kompakten, lazy geladenen AP8-CodeMirror-Editor
mit unverändertem Autocomplete. Alle UI-Texte sind in de/en vorhanden.

## Darstellung und Interaktion

Canvas 2D rendert in CSS-Pixeln mit devicePixelRatio-Backing-Store und
ResizeObserver. Ein Dirty-Flag bündelt Änderungen in requestAnimationFrame;
ruhende Graphen haben keinen laufenden Render-Loop. Der Browseradapter hält den
Viewport außerhalb von React. Nach dem Ende einer Bewegung geht die Ansicht an
den Plot-Satz-Reducer; neue Plot-Sätze werden nach drei Sekunden Ruhe im
AP4-Verlauf gespeichert. Parameter-Playback pausiert die Speicherung.

Sampling läuft im lokalen Modul-Web-Worker. Es gibt höchstens einen laufenden
und einen ersetzbaren nächsten Auftrag. Veraltete Antworten werden verworfen.
Path2D-Pfade werden pro Antwort aufgebaut; Pan und Zoom transformieren diese
Pfade während der nächsten Berechnung. Ein um 35% erweiterter Samplingbereich
reduziert sichtbare Randlücken bei Bewegung. Bei fehlender Worker-Unterstützung
existiert ein synchroner Fallback. Worker und Listener werden beim Unmount beendet.

Ziehen, Trägheit, Radzoom am Mauszeiger, Doppelklick, +/−, Anpassen, 1:1 und
Presets verwenden AP12-Viewport-Operationen. Springs verwenden zentrale
Expressive-Motion-Tokens und respektieren Reduced/Off. Neue Kurven werden über
Strichfortschritt eingeblendet. Parameterslider verändern vorhandene Kurven sofort.
Die Seitenverhältnissperre bedeutet gleiche Welteinheiten pro Pixel; 1:1 setzt
auf den Standardbereich zurück. π-Ticks gelten für die x-Achse. Grobe und feine
Gitter verwenden die adaptive AP12-Tickliste.

Hover rastet innerhalb von 18 CSS-Pixeln auf eine Kurve ein. Pfeiltasten bewegen
den Parameter des Trace-Punkts; Escape löst ihn. Für parametrische/polare Kurven
wird der nächstliegende Parameter numerisch verfeinert. Kontextmenü per Rechtsklick
oder Shift+F10 am Trace; dieselben Analyseaktionen sind im Zeilenmenü verfügbar.
Drag-Reihenfolge hat mit Nach oben/unten eine Tastaturalternative.

## Farben und Auswertung

Canvas-Farben lesen Surface, Outline, Outline Variant und On Surface Variant aus
CSS-Tokens. MutationObserver lädt die Rollen bei Theme/Akzentänderungen neu;
während der Tokeninterpolation werden Farben nachgeladen. `graphPalette.ts`
erzeugt acht HCT-Hue-Rotationen aus dem Akzent und prüft mindestens 3:1 Kontrast
für grafische Linien gegen Canvas und Panel in beiden Themen. Palette-Rollen
werden als lokale `--md-sys-color-graph-*`-Tokens an das Panel weitergegeben.

Analyse verwendet ausschließlich AP12: Nullstellen, Extrema, paarweise
Schnittpunkte, Tangente am Trace/Ansichtsmittelpunkt sowie explizite Integrale.
Ein Integralbereich wird horizontal im Graph gezogen und begrenzt auf die
sichtbare x-Achse. Nur AP12-confidente Tangenten werden gezeichnet. Ergebnisse
tragen Koordinaten-Chips; nicht verlässliche Integralwerte werden gekennzeichnet.
Kurvenänderungen entfernen veraltete Analyseergebnisse.

Tabellen verwenden x, y und u (bei parametrisch/polar der Kurvenparameter), mit
positiver Schrittweite und einer Obergrenze von 500 Zeilen. PNG-Export verwendet
die genaue aktuelle Ansicht, DPR, Marker und Integralfläche, ohne Trace. Wählbar:
aktuelles Theme oder transparenter Hintergrund. Export und Clipboard-Fehler
werden lokal angezeigt; keine externen Laufzeitrequests.

## Verifikation

- Komponenten-/Modelltests: Beispiele, Parsertypen/-fehler, Parameter, Slider,
  Zeilenaktionen, Reordering, Persistenzvalidierung, Trace, Analysis und Tabelle.
- `e2e/graph.spec.ts`: Eingabe, Radzoom, Slider, Nullstellen, Trace, Integral,
  PNG-Download und gespeicherter Plot-Satz.
- `e2e/graph-visual.spec.ts`: 2560×1440 und 3840×2160, Hell/Dunkel, Iris/Teal;
  acht Bilder in `test-results/graph-screenshots` als PR-CI-Artefakt.
- `e2e/graph-performance.spec.ts` läuft nach den funktionalen Chromium-Tests
  allein mit einem Worker und ohne Trace-Screenshots. Die native Maus setzt
  Pointer Capture; rAF-getaktete Pointer-Moves vermeiden Protokoll-/Screenshot-Last.
  Funktionale E2E verwendet reale Maus-/Radaktionen.
  Der 4K/6-Kurven-Lastlauf zeichnet Render-p95, rAF-Mittel, beobachtete fps und Workerzeit in
  `test-results/graph-performance.json` auf; Budget <16,67 ms pro Canvas-Render.
  Dies ist eine Headless-Chromium-Messung. Ein physischer 60-Hz-/4K-Monitor und
  dessen GPU müssen separat abgenommen werden; CPU-Budget allein garantiert
  keine Bildwiederholrate jeder Hardware.

## Offen / Folge-Issues

Implizite Kurven bleiben in AP12-Folge-Issue #17. Numerische Analysis, Trace und
Sampling haben die in GRAPH.md dokumentierten Grenzen. Touch-Pinch und weitere
Browser/GPU-/Screenreader-Abnahmen bleiben spätere Integrationsaufgaben.

## Gemessener Stand (14.10.2026)

CI auf dem AP13-Code: 1.958 Unit-/Komponententests und 74 Chromium-E2E bestehen.
Volle Canvas-Fläche 3840×2160, sechs Kurven, Trace-Aufnahme aus:
58,8 beobachtete rAF-fps (17,01 ms Mittel), Canvas-Render-p95 0,5 ms.
Letzter sechs-Kurven-Samplingauftrag im Worker: 19,7 ms, außerhalb des UI-Threads.
Der Regressionstest verlangt Render-p95 <16,67 ms und ≥55 beobachtete fps als
CI-Toleranz um das 60-Hz-Ziel. Dies ersetzt keine physische Monitor-/GPU-Abnahme.
Die ersten Messungen mit Trace-Screenshots waren durch Aufnahme-/Protokolllast
verfälscht; nur der ungetracete Lastlauf ist der dokumentierte Vergleichswert.
Messdatei: [graph-performance.json](graph-performance.json).
