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
existiert ein begrenzter synchroner 1D-Fallback; implizite Kurven benötigen den Worker. Worker und Listener werden beim Unmount beendet.

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

### AP21 · Ziel, Abtastbasis und Übergang

Der Controller hält den gewünschten Viewport getrennt von der animierten Ansicht.
Anpassen verwendet ausschließlich das Ziel mit seiner stabilen `fitBasis`, niemals
einen Animationszwischenstand. Wiederholte Klicks mit identischem Kurvenset,
Basis, Pixelgröße und Sperre verwenden das zwischengespeicherte Ergebnis; eine
Animation wird dadurch nicht neu gestartet. Kurven-/Parameterwechsel während
einer Fit-Bewegung ersetzen deren Ziel. Reset, Presets, Restore und Navigation
verwerfen alte Übergänge und verzögerte Zustandsmeldungen. Die skalare Feder
verwendet weiterhin Motion-Tokens, bleibt monoton in [0,1] und interpoliert
Mittelpunkte sowie logarithmische Spannweiten. Numerisch ungeeignete
Zwischenstände springen auf das bereits validierte Ziel.

Verlauf und Links speichern die gewünschte Ansicht samt optionaler `fitBasis`;
Links kopieren auch während Bewegung das Ziel. Alte Version-1-Plot-Sätze ohne
Basis verwenden ihren geladenen Bereich. Restore erhält einen eigenen
Änderungszähler, damit auch eine Wiederherstellung identischer Bounds laufende
Ziele zuverlässig ersetzt. Viewport-Rejektionen werden am erzeugenden Adapter
abgefangen und über de/en-Snackbar erklärt. Es gibt keine absolute ±1e6-Grenze.

Der vergrößerte Samplingbereich wird mit seiner tatsächlichen 1,7-fachen
Pixelgröße validiert. Scheitert Overscan an Überlauf oder Pixelpräzision,
bleibt das Sampling beim gültigen sichtbaren Bereich. Eine Regression verwendet
x≈1e16, Spannweite 1128 und 127 Pixel Breite direkt an dieser Präzisionsgrenze.

`data-graph-metrics` enthält zusätzlich Anzahl und Dauer echter Fit-Berechnungen.
Die E2E-Regression prüft zwölf Klicks bei aktivierter Bewegung und verlangt nur
eine Berechnung. Pole/Quantile und Float64-Präzision folgen GRAPH.md; diese
Rahmung ist keine globale Extrema- oder Polstellensuche.

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
die genaue aktuelle Ansicht, DPR, die tatsächlich angezeigten akzeptierten
Polylinien, Marker und Integralfläche, ohne Trace und ohne erneutes Sampling. Wählbar:
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

AP27 integriert die implizite AP26-Domäne; Vertrag, Grenzen und tatsächlicher
Nachweisstatus stehen in [AP27.md](AP27.md). Numerische Analysis, Trace und
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

## AP22 · Zahlenanzeige und Wertetabelle

`numbers.ts` ist der gezielte Graph-Adapter für Float64-Anzeige und einzelne
numerische Felder. Auto verwendet höchstens zwölf signifikante Stellen ohne
angehängte Nullen; Beträge unter 1e-6 oder ab 1e12 erscheinen wissenschaftlich.
Eine endliche von null verschiedene Zahl wird in Auto nie zu 0. Die Auswahl
0…12 begrenzt ausschließlich Nachkommastellen für u/x/y; sie darf ausdrücklich
auf 0 runden. Der sichtbare Hinweis kennzeichnet diese gerundete Anzeige.
Minusnull wird als 0 angezeigt, nichtendliche/undefinierte Werte als —.
Diese Darstellung verspricht keine exakte oder zusätzliche numerische Genauigkeit.

Die Auswahl bleibt beim Schließen/Öffnen der Tabelle erhalten und ist lokaler
Sitzungszustand der Graphenansicht. Keine neue Settings-, Plot-, Link- oder
Verlaufsversion. Rechenwerte, Sampling, Analysis und Schrittweiten bleiben
unverändert. Trace und Analysekoordinaten verwenden denselben Auto-Formatierer;
Trace nennt x/y und bei parametrischen/polaren Kurven zusätzlich t/θ.
Dezimaltrennzeichen-Override und Gruppierung gelten auch dort.

Tabellenschritt und Parametergrenzen/-schritt sind Entwürfe bis Anwenden bzw.
Enter. `parseLocalizedNumber` liest genau ein Zahlenfeld mit den bestehenden
Locale-/Gruppierungseinstellungen, inklusive ASCII-e/E-Exponent und äußerem
Whitespace. Leere Felder, unvollständige Exponenten, NaN/Infinity, fehlerhafte
Gruppierung und Float64-Über-/Unterlauf werden nicht übernommen. Null oder
negative Schrittweiten sind fachlich ungültig; Grenzen dürfen null/negativ sein.
Ausdrücke und deren Funktions-/Paarkommas werden nicht normalisiert.

`ValueTable` wird ausschließlich bei geöffneter Tabelle eingebunden. Ihr
Berechnungsmemo hängt nur von Kurve inklusive Parametern, Bounds und bestätigter
Schrittweite ab; Locale, Rundung und andere Anzeigeoptionen formatieren nur neu.
`tableResult` bewahrt höchstens 500 aufsteigende Parameterwerte, einschließlich
Definitionslücken. Ein nicht fortschreitender Float64-Schritt stoppt mit sichtbarer
Erklärung vor einem doppelten Wert/Key. Ein begrenzter Bereich erklärt die ersten
500 Zeilen sichtbar. Die bisherigen Plot-Verträge und `tableValues` bleiben kompatibel.

Nachweise: `numbers.test.ts`, `table.test.ts`, `ValueTable.test.tsx`,
`tableVisibility.test.tsx` sowie `e2e/graph-values.spec.ts` und die vorhandenen
Graph-/History-Tests. Tatsächliche Laufresultate werden im PR verlinkt.

Browserbilder mit expliziter Anzeigerundung und sichtbaren Tabellenzeilen:
[Deutsch](screenshots/ap22-de.png) · [English](screenshots/ap22-en.png).
Die AP22-Evidence-Action prüft `npm run check` und die gezielten Graph-E2E;
die reguläre CI prüft zusätzlich den vollständigen Chromium-Smoke samt
Graph-Performance. Screenshots und tatsächliche Laufnachweise sind im PR verlinkt.

## AP27 · Implizite Kurven

`x^2+y^2=4` und andere von AP26 erkannte Gleichungen laufen im lokalen Worker.
Budget-/Genauigkeitsdiagnosen erscheinen an der betroffenen Kurve in de/en.
Analysis, Trace und Wertetabellen werden bewusst gesperrt; Fit verwendet die
stabile AP21-Basis als begrenzte Ansicht. Plot-Version 1 benötigt keine Migration,
weil unverändert Eingabetext gespeichert wird. Details: [AP27.md](AP27.md).
