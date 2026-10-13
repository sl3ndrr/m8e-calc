# Graph-Engine · AP12

Vertrag vor Tests und Implementierung. Öffentlicher Einstieg ist `src/graph/index.ts`;
reines TypeScript ohne DOM, IO, React, `eval` oder `new Function`. AP13 übernimmt
Darstellung und Interaktion. Der Decimal-AST aus [ENGINE.md](ENGINE.md) bleibt stabil;
Graphen rechnen absichtlich mit IEEE-754 Float64.

## Datenmodell und Compiler

`compile(ast, { variables, params?, angleMode?, functions? })` liefert eine aufrufbare
`CompiledFunction`: Argumente in der Reihenfolge von `variables`, außerdem
`parameterNames`, `setParam(name, value): boolean` und `getParams()`. Der Compiler
baut einmal einen Closure-Baum; Parameter stehen in veränderbaren Number-Slots.
`detectParams(ast, variables)` liefert eindeutige Namen in lexikalischer Reihenfolge.
Fehlende Parameter haben den Wert 1. Mathematische Konstanten pi/π, e, phi/φ,
tau/τ sind reserviert. Physikalische Konstantennamen, insbesondere c, sind im
Graph-Kontext freie Parameter; ihre Werte können explizit aus der Engine-Registry
übergeben werden. i/j und ans sind keine Slider und ergeben NaN.

Registry-Einträge erhalten additiv `floatImpl(args, { angleMode }): number`.
Der Compiler verwendet ausschließlich diese Implementierungen, niemals den
Decimal-Auswerter pro Sample. Eigene Registry-Einträge sind mit floatImpl möglich;
fehlende Float-Implementierungen (insbesondere AST-Binder und listenwertige
Funktionen) ergeben NaN. Bitoperatoren und Anweisungen werden nicht kompiliert.
Jeder nichtendliche oder komplexe Zwischenwert, Definitionsfehler und geworfene
Registry-Fehler wird zu NaN, auch wenn eine äußere Operation ihn verdecken würde.
Compiler und Parametersuche begrenzen AST-Tiefe auf 128 und Besuche auf 2048;
auch zyklische/fremde ASTs terminieren. Prozent ist strikt, Fakultät ganzzahlig
0…170, 0^0 und negative Basen mit nichtganzzahligem Exponenten sind undefiniert.
Float-Rundung folgt der Engine (Gleichstand vom Nullpunkt weg); Winkelmodus
rad/deg/grad gilt für direkte und inverse Trigonometrie. Keine 50-Stellen-Garantie.

Serialisierbare `Curve`-Objekte enthalten ASTs, optionale `params` und `angleMode`:

| kind       | Felder                       | Parameterbereich     |
| ---------- | ---------------------------- | -------------------- |
| explicit   | expression                   | sichtbarer x-Bereich |
| vertical   | expression (x-Konstante)     | sichtbarer y-Bereich |
| parametric | x, y, range: [from,to]       | t-Bereich            |
| polar      | expression, range: [from,to] | theta im Winkelmodus |

`parseCurveInput(text, { range?, params?, angleMode? })` liefert Engine-artiges
Result mit Curve oder `{ code, range, detectedKind? }`. Erkannt werden `y=x^2`,
`f(x)=sin(x)`, bloße Ausdrücke, `x=3`, `(cos(t),sin(t))`, `r=1+cos(theta)`
und θ als Alias für theta. Paare werden nur am äußeren Komma getrennt;
Funktionskommas bleiben erhalten. Standardbereich parametrisch/polar ist ein
Vollkreis im gewählten Winkelmodus. Unzulässige unabhängige Variablen sind Fehler.
`x^2+y^2=4` wird als implicit erkannt und explizit mit E_UNSUPPORTED_CURVE
zurückgegeben. Keine stillschweigende leere implizite Zeichnung.

## Sampling und Arbeitsgrenzen

`sampleCurve(curve, bounds, { width, height })` liefert `Point[][]` in Weltkoordinaten;
alle Punkte sind endlich und auf das sichtbare Rechteck beschnitten.
`sampleCurveDetailed` liefert zusätzlich evaluations und truncated. Der Eingang
ist JSON-serialisierbar, der Ausgang ebenfalls; Closures entstehen lokal, sodass
ein späterer Worker denselben Vertrag nutzen kann. Keine Uhr im Algorithmus:
gleiche Eingabe ergibt bitweise gleiche Ausgabe.

Basisraster: ein Intervall pro 8 px Breite (mindestens 16, höchstens 4096).
Pro Intervall werden Viertel-, Mittel- und Dreiviertelpunkte mit der linearen
Interpolation der Endpunkte in Bildschirmkoordinaten verglichen. Bei Fehler
über 0,25 px folgt Halbierung bis Tiefe 14. Nichtendliche Proben, Definitionslücken
und nicht auflösbare Sprünge trennen Segmente; Pole werden nicht durch senkrechte
Linien verbunden. Vollständig weit außerhalb liegende Intervalle werden verworfen.
Liang-Barsky-Clipping erhält steile kontinuierliche Geraden und sichtbare Ränder.
Maximal 100000 Auswertungen; erschöpfte Intervalle werden ausgelassen und truncated
gesetzt. Pixelgrößen müssen endlich/positiv sein, Bereiche endlich/geordnet und
mit endlicher positiver Spannweite; ungültige Daten werfen RangeError.

Die 0,25 px sind eine geprüfte lokale Fehlerschätzung an mehreren Proben, keine
universelle Schranke für beliebig hochfrequente oder schmale, nicht abgetastete
Merkmale. Bei nicht erreichter Schätzung wird eine Lücke ausgegeben. Polerkennung
ist numerisch und konservativ. Der Benchmark misst nach Warm-up typische Kurven
bei 2560×1440: Ziel <4 ms/Kurve; Regressionstest mit großzügiger 25-ms-Grenze.
Pathologische Kurven bleiben durch ein Arbeitsbudget begrenzt.

## Analysis

`findRoots`, `findExtrema`, `findInflections`, `findIntersections`, `yIntercept`,
`slopeAt`, `tangentAt`, `definiteIntegral` und `areaBetween` arbeiten auf expliziten
Kurven im übergebenen sichtbaren Bereich. Nicht explizite Kurven liefern keine
Analysis-Punkte bzw. eine Schätzung mit confidence=false; AP13 kann dies anhand
von kind bereits vor dem Aufruf anzeigen. Parametrische Selbstschnitte/vertikale
Tangenten und implizite Analysis gehören ins Folgepaket.

Punktergebnisse: `{ x, y, errorEstimate, confidence }`, Extrema zusätzlich kind.
Skalare: `{ value, errorEstimate, confidence }`; Tangente zusätzlich point/slope/
intercept. confidence kennzeichnet bestandene numerische Prüfungen, keinen Beweis.
Standardtoleranzen: xTolerance=1e-8, valueTolerance=1e-8, absoluteTolerance=1e-9,
relativeTolerance=1e-9; positive endliche Optionen, maxIterations=100,
maxEvaluations=30000. Suchraster 1024 Intervalle, begrenzt auf 16384.
Nur sichtbare Punkte werden zurückgegeben und nahe Treffer dedupliziert.

Nullstellen: endliche Rasterwerte, Vorzeichenwechsel, Brent-Dekker mit gesicherter
Bisektion und abschließender Residuenprüfung. Ein Vorzeichenwechsel an 1/x ist
keine Nullstelle. Rastertreffer bei |f|<=valueTolerance zählen; berührende Nullstellen
ohne Rastertreffer sind nicht garantiert. Identisch null liefert keine diskrete
Trefferliste. Differenzkurven geben Schnittpunkte; identische Kurven keine Liste.

Ableitungen: zentrale Differenzen mit halbierten Schritten und Richardson-
Extrapolation; links/rechts Steigungen prüfen Knicke. Extrema suchen Wechsel
des ersten, Wendepunkte Wechsel des zweiten Ableitungsvorzeichens. Keine Extrema
bei stationären Wendepunkten, keine zuverlässige Tangente an |x| bei null.
Gauß-Kronrod 7/15 verwendet die vorhandenen QUADPACK-Knoten/Gewichte als Float64,
resasc-Fehlerskalierung und wiederholtes Teilen des fehlerreichsten Intervalls.
Integrationsgrenzen müssen im sichtbaren x-Bereich liegen; umgekehrte Grenzen
sind erlaubt. Fläche integriert |f-g|, geteilt an erkannten Schnittpunkten.
Nichtendliche Proben, sichtbare Definitionslücken/Polverdacht und erschöpftes Budget
liefern confidence=false. Keine uneigentlichen Integrale oder Hauptwerte.
Auch Quadratur-Fehler sind Schätzungen; schmale/hochfrequente Merkmale können
unentdeckt bleiben. Float64-Rundungsboden: mindestens 50*EPSILON*Integral(|f|).

## Viewport

`new Viewport(bounds, pixelSize, { lockAspect? })` ist unveränderlich. worldToScreen
und screenToWorld nutzen links oben als Bildschirmursprung, y nach unten.
zoom(factor, screenPoint), pan(dx,dy), resize(pixelSize), withAspectLock(boolean)
liefern neue Instanzen; factor>1 vergrößert. Die Sperre erhält gleich große
Welteinheiten pro Pixel und erweitert beim Aktivieren die kleinere Weltspannweite.
Bounds und pixelSize können mit toJSON übertragen werden.

`fitToCurves` tastet im bestehenden x-/t-Bereich ab, verwendet robuste 5/95-%-
Quantile gegen Pol-Ausreißer und 10% Rand; keine automatische globale Kurvensuche.
`ticks(axis, { spacing?, pi? })` verwendet 1–2–5×10^n-Schritte, Zielabstand 80 px,
endliche begrenzte Ticklisten, lesbare Dezimal-/Exponentialbeschriftungen und
optional rationale Vielfache von π (π/2, π, 3π/2, …), ohne Minusnull.

## Verifikation / Offen / Folge-Issues

Node-Projekt ohne UI-Setup: analytische Compiler-/Analysis-Referenzen, Registry-
Winkelmodi, Parameteränderungen, sin/1/x/tan/abs/x^x/sqrt/ln, parametrischer Kreis,
Kardioide/Lissajous, unabhängige Bildschirm-Fehlerproben, Pole zwischen Rasterpunkten,
NaN/Infinity, deterministisches fast-check-Fuzzing, Viewport-Invarianten und Benchmark.
`npm run check` und Chromium-CI sind verbindlich. Keine UI-Änderung/Screenshots in AP12.

Folge-Issue: adaptive implizite Kurven F(x,y)=0 mit Marching Squares passend zur
Plot-Auflösung, asymptotischem Sattel-Decider, konsistenter Zellrand-Stitching-
Strategie, Kreisen/Hyperbeln/Kreuzungen und isolierten Komponenten. Akzeptanz:
keine Risse bei adaptiven Zellgrößen, dokumentierte Pixelgenauigkeit und eigenes
2D-Arbeits-/Performancebudget. AP13 übernimmt Canvas/SVG und Worker-Anbindung.
