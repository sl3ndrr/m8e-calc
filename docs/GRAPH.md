# Graph-Engine · AP12 / AP26

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
`slopeAt` und `tangentAt` unterstützen alle fertigen Kurventypen. Nullstellen sind
Schnitte mit y=0, Extrema Wechsel von dy/du, Wendepunkte Wechsel der signierten
Krümmung; u ist x, t, theta bzw. y bei vertikalen Geraden. Alle Treffer werden
auf das sichtbare Rechteck gefiltert und geometrisch dedupliziert. Steigung und
Tangente erhalten für parametrische/polare Kurven eine Parameterstelle; dy/dx
wird aus dy/du und dx/du gebildet, vertikale Tangenten haben confidence=false.
`definiteIntegral` und `areaBetween` verlangen explizite, einwertige y(x)-Kurven;
bei anderen Kurventypen ist diese x-Fläche nicht definiert (confidence=false).

Punktergebnisse: `{ x, y, errorEstimate, confidence }`, Extrema zusätzlich kind.
Skalare: `{ value, errorEstimate, confidence }`; Tangente zusätzlich point/slope/
intercept. confidence kennzeichnet bestandene numerische Prüfungen, keinen Beweis.
Standardtoleranzen: xTolerance=1e-8, valueTolerance=1e-8, absoluteTolerance=1e-9,
relativeTolerance=1e-9 (zweite Ableitung wegen Auslöschung standardmäßig 1e-6;
explizite Optionen werden eingehalten); positive endliche Optionen, maxIterations=100,
maxEvaluations=30000. Suchraster 1024 Intervalle, begrenzt auf 16384.
Nur sichtbare Punkte werden zurückgegeben und nahe Treffer dedupliziert.

Nullstellen: endliche Rasterwerte, Vorzeichenwechsel, Brent-Dekker mit gesicherter
Bisektion und abschließender Residuenprüfung. Ein Vorzeichenwechsel an 1/x ist
keine Nullstelle. Rastertreffer bei |f|<=valueTolerance zählen; berührende Nullstellen
ohne Rastertreffer sind nicht garantiert. Identisch null liefert keine diskrete
Trefferliste. Differenzkurven geben explizite Schnittpunkte; identische Kurven
keine Liste. Andere Kurvenpaare nutzen maximal 512 Parameterintervalle als
Startkandidaten, dann gedämpfte zweidimensionale Newton-Verfeinerung und eine
Residuenprüfung beider Weltkoordinaten. Tangentiale Berührungen und sehr kleine
Schleifen ohne Rasterkandidat sind nicht garantiert; keine falschen Treffer an
Polen. Der Paarvergleich ist auf 512² begrenzt, die Auswertungen bleiben budgetiert.

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

### AP21 · Fit-Vertrag

Ein Fit ist eine deterministische lokale Rahmung, keine globale Kurvensuche.
`Viewport` hält die validierte gewünschte Ansicht und eine davon getrennte
Abtastbasis. Explizite Kurven verwenden die x-Grenzen dieser Basis (257 Proben);
vertikale Kurven deren y-Grenzen, parametrische/polare Kurven ihren deklarierten
Parameterbereich. Das Fit-Ergebnis einschließlich Aspektaufweitung ersetzt diese
Basis **nicht**. Zehn oder mehr Fits bei unverändertem fachlichen Zustand müssen
an jeder Grenze innerhalb von 0,25 CSS-Pixeln bleiben (üblicherweise identisch).

Pan/Zoom setzen die Basis auf die bewusst gewählte Zielansicht. Reset, Presets
und Restore setzen sie auf den geladenen Bereich. Resize und Aspektwechsel
passen die gewünschte Ansicht an und erhalten die Basis; reine Layoutänderungen
sind keine zusätzliche fachliche Kurvensuche. Kurven-, Parameter- und
Sichtbarkeitsänderungen werden beim nächsten Fit auf derselben bewusst gewählten
Basis neu berechnet. Während einer Fit-Animation wird ein geändertes Kurvenset
gegen diese Basis neu gerahmt; ein altes Fit-Ziel darf nicht nachlaufen.

Nur sichtbare gültige Kurven gelangen vom Adapter in den Fit. Robuste 5/95-%-
Grenzen werden pro Kurve bestimmt und dann vereinigt, damit kleine Kurvensets
oder vertikale Geraden zwischen vielen anderen Proben nicht verschwinden.
Explizite x-Intervalle und vertikale y-Intervalle bleiben vollständig erhalten;
10 % Rand ergänzt die abhängigen bzw. parametrischen Grenzen. Nichtendliche
Proben werden verworfen. Konstante/flache Bereiche erhalten eine zur Basis und
Float64-Präzision passende Mindestspanne, ohne absolute Weltkoordinaten-Grenze.
Aspektsperre bleibt gleiche Welteinheiten pro Pixel und erweitert die kleinere
Spannweite. Auch nach dieser Erweiterung müssen Grenzen, Spannweiten,
Pixelauflösung und Aspektverhältnis darstellbar sein. Unbrauchbare Fits erhalten
die letzte gültige Ansicht; der UI-Adapter erklärt dies lokalisiert.

Der Browseradapter trennt Ziel-Viewport und momentane animierte Ansicht.
Mehrfachklicks verwenden stets das Ziel mit seiner Abtastbasis und ersetzen
laufende Übergänge. Neue Nutzeraktionen verwerfen alte Übergänge und deren
verzögerte Zustandsmeldungen. Jeder Zwischenstand wird vor Übernahme validiert;
bei numerisch ungeeigneter Interpolation wird das validierte Ziel direkt gesetzt.
Der Präzisionswächter verlangt `EPSILON * max(|min|,|max|) / unitsPerPixel
<= 0,25` auf beiden Achsen, auch für die Basis. Die Aspektprüfung verlangt
relative Abweichung der Welteinheiten/Pixel <= 1e-10. Bereits gesperrte Bereiche
werden innerhalb von 8 Float64-Epsilon nicht erneut aufgeweitet. Flache Bereiche
erhalten mindestens `4 * max(width,height) * EPSILON * max(|lo|,|hi|)` Rand;
konstante Werte 10 % ihres Betrags, exakt null 10 % der entsprechenden Basisspanne.
Dies sind relative Präzisions-/Darstellungsregeln, keine Koordinatenobergrenze.

Polstellen-/Ausreißererkennung bleibt eine begrenzte numerische Heuristik:
schmale Merkmale zwischen den 257 Proben und globale Extrema sind nicht garantiert.

`ticks(axis, { spacing?, pi? })` verwendet 1–2–5×10^n-Schritte, Zielabstand 80 px,
endliche begrenzte Ticklisten, lesbare Dezimal-/Exponentialbeschriftungen und
optional rationale Vielfache von π (π/2, π, 3π/2, …), ohne Minusnull.

### AP21 · Reproduktion und Messgrenzen

[graph-fit-validation.json](graph-fit-validation.json) enthält die Nachrechnung
mit dem echten main-Domänencode (`f48afe1e…`) und die Browserreproduktion.
1600×900 Canvas, y=x², Sperre an: main erreicht nach vier Fits x≈±1,6889264e16;
AP21 bleibt nach zwölf Fits bei x≈±96,6667, mit identischer Abtastbasis und ohne
Pixelabweichung. Unit-/Property-Tests prüfen außerdem Pan/Zoom, Resize, Sperre
an/aus, persistierte Basis, alle Kurventypen, Polstellen, leere/ungültige Sets und
extreme Skalen. Die Seed-Property verwendet 80 Fälle, Breiten 100…4000 und
Skalen 10^-200…10^200.

Browser-Reproduktion ohne Deployment: einen separaten Checkout von main
`f48afe1e0bdb5baf42eb1ec194883ecdc1c41e87` mit `npm ci && npm run build`
vorbereiten, dann vom AP21-Checkout
`node scripts/graph-fit-reproduction.mjs /pfad/zum/main-checkout` ausführen.
Das Skript erzeugt Chromium-Bilder und JSON unter `test-results/ap21-baseline`;
Chromium muss installiert sein. Die Browserfenstergröße ist 1600×900, die Canvas-
Größe folgt dem Produktionslayout. Der alte UI-Adapter verwirft Spannen >1e12
stillschweigend: vier abgewartete Fits endeten bei x≈±4,1663e8; zwölf schnelle
Klicks bei x≈±1,9490e10. Es gab keine pageerrors; die Zeitabhängigkeit blieb sichtbar.
Die neue Regression in `e2e/graph.spec.ts` prüft Ziel/Basis, 0,25-Pixel-Stabilität,
Filter, Restore, Reset, Presets und Resize im Produktionsbuild.
[UI-Nachweis nach zwölf Fits](screenshots/ap21-fit-stable.png).

`test:graph:bench` misst zusätzlich den Fit (50 Warm-up-, 200 Messiterationen;
Regression <25 ms/Kurve). Die konkreten Node-Messwerte stehen in der JSON-Datei.
UI-Mehrfachklicks nutzen den Cache. Mikrobenchmarks sowie CI-Headless-Chromium
messen keine physische Monitor-/GPU-Latenz. Schmale Merkmale und pathologische
Ausdrücke bleiben an die dokumentierten Compiler-/Samplebudgets gebunden.

## Verifikation / Offen / Folge-Issues

Node-Projekt ohne UI-Setup: analytische Compiler-/Analysis-Referenzen, Registry-
Winkelmodi, Parameteränderungen, sin/1/x/tan/abs/x^x/sqrt/ln, parametrischer Kreis,
Kardioide/Lissajous, unabhängige Bildschirm-Fehlerproben, Pole zwischen Rasterpunkten,
NaN/Infinity, deterministisches fast-check-Fuzzing, Viewport-Invarianten und Benchmark.
`npm run check` und Chromium-CI sind verbindlich. Keine UI-Änderung/Screenshots in AP12.

[Issue #17](https://github.com/sl3ndrr/m8e-calc/issues/17) wird in AP26 (numerische
Domäne, unten) und AP27 (Worker/UI einschließlich Analysis/Trace/Table) geteilt.
AP26 allein schließt das Issue nicht.

## AP22 · Grenze zur Anzeige

Die Graph-Domäne bleibt Float64 und erhält keine Rundungspräferenz. Der
Feature-Adapter formatiert Tabellen/Trace gezielt und liest nur numerische
Eingabefelder lokalisiert. Darstellung und Berechnungsgrundlage sind getrennt;
Details, Arbeitslimit und Bestätigung in [GRAPH_MODE.md](GRAPH_MODE.md).

## AP26 · Implizite 2D-Domäne (optional)

AP26 ist eine Funktionserweiterung auf AP18–AP25 und unabhängig vom AP21-Fit.
Keine neue Renderinglogik, UI-Aktivierung, symbolische Algebra oder allgemeine
Gleichungslösung. Die bestehenden `Curve`-, Sampling-, Analysis- und
Viewport-Verträge bleiben unverändert.

### Eingabe und API

`ImplicitCurve` enthält `{ kind: 'implicit', expression: Ast, params?, angleMode? }`.
`expression` ist bereits F(x,y); Eingabe und Ergebnis sind JSON-serialisierbar.
`parseImplicitInput(source, { params?, angleMode? })` ist ein **separater Opt-in**:

| Eingabe                                           | Normalisierung                                                 |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `x^2+y^2=4` oder `x²+y²=4`                        | `(x^2+y^2)-4 = 0`                                              |
| `sin(x)+cos(y)`                                   | F(x,y) ist der skalare Ausdruck selbst                         |
| `0`, `1=1`, `2=3`                                 | konstante Nullmenge bzw. leere Menge                           |
| `y=x^2`, `x=3`, `f(x)=...`, `r=...`, `a=2`, Tupel | in diesem Opt-in abgelehnt; bisheriger Parser bleibt zuständig |

Genau ein Gleichheitszeichen trennt zwei skalare Ausdrücke. Eine einzelne
Bezeichnerlinke bleibt der vorhandenen Gleichungs-/Zuweisungssyntax vorbehalten;
auch `x=y` wird hier nicht umgedeutet (explizites F wäre `x-y`). Unicode-
Hochziffern und zusammenhängendes Hochzeichen-Vorzeichen werden lediglich zu
Potenzsyntax normalisiert; z.B. `x⁻²` → `x^(-2)`. Keine weiteren Umformungen.
Fehlerbereiche umfassen wie beim bisherigen Graphparser die ursprüngliche Eingabe;
AST-Positionen beziehen sich auf die normalisierten Teilausdrücke.
`x,y` sind unabhängige Variablen; t/theta/θ sind hier Fehler, sonstige freie
Bezeichner bleiben Sliderparameter mit dem bisherigen Standardwert 1.
Float-Funktionen, Konstanten, Winkelmodi und NaN-Weitergabe folgen AP12.
Anweisungen, Definitionen, Bitoperationen und Funktionen ohne `floatImpl`
werden vom Eingabeadapter abgelehnt. Maximal 10000 Zeichen (auch nach
Normalisierung), 2048 AST-Besuche und Tiefe 128; keine neuen Parserfreiheiten.

`compileImplicitCurve(curve)` delegiert an `compile` mit `variables: ['x','y']`;
die bestehenden lokalen Parameterslots bleiben erhalten. Sampling verändert
weder AST noch Parameterobjekt. `sampleImplicitCurve(curve,bounds,pixelSize,options?)`
liefert `Point[][]`; `sampleImplicitCurveDetailed` liefert kompatibel dazu
`{ segments, evaluations, truncated, diagnostics }`. Kein Clock-/IO-Zugriff und
kein globaler Cache: identische Eingaben ergeben identische Zahlen/Reihenfolge.

### Auflösung, Verfeinerung und Randkonsistenz

Der sichtbare Bereich wird zunächst in höchstens 32×32 CSS-Pixel große Kacheln
geteilt. Ein lokaler Quadtree halbiert beide Achsen. **Alle** Kacheln werden bis
zu einer maximalen Seitenlänge `discoveryPixels=8` untersucht, auch gleichsignige
und undefinierte Bereiche. Jede Zelle prüft vier Ecken, vier Seitenmitten und
Zentrum. Dieses Suchraster verhindert die reine Eckenvorzeichen-Heuristik bei
kleinen Schleifen; es ist keine universelle Komponentensuche.
Unterschiedliche Vorzeichen im Inneren, mehrere Randtreffer, Definitionsränder
und unzureichende lokale Genauigkeit führen zu weiterer Teilung.

Marching Squares verbindet Randnullstellen. Die Randprüfung halbiert eine
Vorzeichenklammer höchstens 52-mal und versucht eine abschließende Sekante.
Eine Nullstelle muss das Residuum gegenüber dem **kleineren** ursprünglichen
Randbetrag um Faktor 10^7 reduzieren. Für darstellungsbedingt nicht exakt
erreichbare Nullwerte ist alternativ eine kollabierte Wertklammer zulässig:
`|F(lo)|+|F(hi)| <= min(10^-7*max(|F(a)|,|F(b)|),16*min(|F(a)|,|F(b)|))`.
Damit darf Float64-Auslöschung einen regulären tangentialen Rasterkontakt
schließen; ein bloß enger x/y-Abstand oder Pol-Vorzeichenwechsel genügt nicht.
Wachsende beidseitige Beträge ohne Residuenverbesserung werden konservativ
verworfen. Nichtendliche Zwischenproben verwerfen ebenfalls die Klammer.
Bei genau einem Nullendpunkt prüfen maximal zwölf halbierte Randproben außerdem
auf einen zweiten inneren Vorzeichenwechsel. Dieser erhält eine eigene,
ebenfalls residuengeprüfte Nullstelle; ein bekannter Nullendpunkt darf den
zusätzlichen Ast z.B. bei `y*(x+y-a)` nicht verdecken. Nicht eindeutig auflösbare
Mehrfachtreffer erzwingen Verfeinerung.

Für jede akzeptierte Sehne prüfen echte F-Auswertungen deren Viertel-, Mittel-
und Dreiviertelpunkt. Die lokale Normalabstands-Schätzung ist
`|F| / hypot(dF/dscreenX,dF/dscreenY)`; zentrale Differenzen verwenden je 1/32
der Zellseitenlänge. Funktionswerte werden vor Differenzbildung skaliert, damit
Produkte/Gradienten möglichst nicht überlaufen. Standardziel:
`tolerancePixels=0.25` CSS-Pixel. Die größte **akzeptierte** Schätzung steht in
`maxEstimatedErrorPixels`. Nichtendliche/verschwindende ungeeignete Gradienten
werden nicht als kleine Fehler ausgegeben. Bei ungeklärten Zellen unterhalb
dieser Pixel-Seitenlänge wird eine diagnostizierte Lücke ausgegeben.

Für adaptive Ränder werden alle Blattseiten auf einem gemeinsamen ganzzahligen
dyadischen Raster geführt. Jede feine Nachbarecke teilt auch die grobe Seite
in dieselben **atomaren Intervalle**. Deren Nullstellen werden genau einmal
berechnet und über identische Schlüssel geteilt; keine Entfernungsschwelle zum
Zusammenkleben nahe gelegener Komponenten. Zusätzliche Randproben nehmen bereits
an der Zellverwerfung teil. Mehrere Treffer auf einer groben Seite erzwingen
deren Verfeinerung und einen erneuten, begrenzten Randdurchlauf. Die geänderten
Sehnen werden erneut geometrisch geprüft. So stimmen grobe und feine Übergänge
überein, ohne einen ganzen zusammenhängenden Konturzug gleich tief zu verfeinern.
Budget-/Definitionslücken bleiben ausdrücklich als solche erkennbar.

### Sättel und degenerierte Mengen

Eckenreihenfolge: unten links A, unten rechts B, oben rechts C, oben links D.
Der asymptotische Decider benutzt den skalierten Determinanten
`Q=A*C-B*D` des bilinearen Interpolanten, **nicht** das Zentrumsvorzeichen:
Q>0 verbindet unten–rechts / oben–links, Q<0 unten–links / rechts–oben.
Der bilineare Sattel liegt bei
`u=(A-D)/(A-B+C-D), v=(A-B)/(A-B+C-D)`.
Bei Q=0 muss der tatsächliche F-Wert am Sattel null sein; sonst wird verfeinert.
Bei numerisch nahezu null (64 Epsilon des skalierten Determinanten) darf auch
der Schnitt gegenüberliegender Randsehnengeraden als Kandidat dienen, wiederum
nur bei tatsächlich F=0. Dadurch erhalten auch verschobene bilineare Kreuzungen
einen gemeinsamen Knoten. Vier Äste enden am Knoten; Stitching wählt dort keinen
willkürlichen Durchgang. Für Q≠0 bleiben die beiden Hyperbeläste getrennt.

Exakt nullwertige Ränder benötigen zusätzlich drei innere Nullproben. Sie werden
einmal als gemeinsame Graphkanten ausgegeben, z.B. die Achsen von `x*y=0`,
ohne falsche diagonale Abkürzung. Ein zusätzlicher Innenast erhält einen
gemeinsamen Randknoten aus einem transversalen Feld: F-Proben bei ±1/32 CSS-Pixel
normal zum Rand werden halbiert subtrahiert, bei beidseitig verschwindendem Feld
alternativ addiert (gerade Vielfachheit). Eine darin geklammerte Nullstelle muss
dieselbe Residuen-/Stetigkeitsprüfung bestehen. Der globale Pixelabstand und der
atomare Randschlüssel sind für beide Nachbarn identisch; auch die Nullrandkante
wird an genau diesem Knoten geteilt. So bleiben `(x-a)*y=0`, `y*(x+y-a)=0`
und `y^2*(x-a)=0` ohne künstliche Lücke verbunden. Die tatsächliche neue Sehne
unterliegt weiterhin der geometrischen F-Prüfung. Nichtendliche transversale
Proben bzw. Polverdacht erzeugen eine diagnostizierte Lücke, keinen Ast.
Komplexere nicht aufgelöste Nullrand-/Innenast-
Kombinationen werden verfeinert und gegebenenfalls als Lücke diagnostiziert.
Zellen mit neun Nullproben liefern keine willkürlichen Gitterlinien:
`zeroCells` kennzeichnet solche flächigen/degenerierten Kandidaten. Eine
syntaktisch koordinatenunabhängige Funktion wird einmal ausgewertet:
0 → `constant-zero` (gesamter Bereich, keine endliche Konturliste), endlicher
Nichtnullwert → `empty`, NaN → `undefined`. `x-x` wird nicht algebraisch
vereinfacht und bleibt eine diagnostizierte Nullregion. Isolierte Punktmengen
wie `x^2+y^2=0` erhalten keine künstlichen Polylinien; doppelte Nullstellen ohne
Vorzeichenwechsel sind nur bei passenden Nullproben/Rändern sichtbar.

### Arbeits- und Speichergrenzen

| Option                                              | Standard | zulässiger Höchstwert |
| --------------------------------------------------- | -------: | --------------------: |
| `maxCells` (inklusive verworfener Eltern)           |   200000 |               1000000 |
| `maxEvaluations` (inklusive Rand-/Gradientenproben) |  1000000 |               4000000 |
| `maxSamples` (gespeicherte Rasterwerte)             |   400000 |               1000000 |
| `maxDepth` (pro Ausgangskachel; 0 erlaubt)          |       10 |                    16 |
| `maxSegments` (Graphkanten vor Stitching)           |    50000 |                200000 |

Budgets sind positive sichere Ganzzahlen (Tiefe auch 0); ungültige Optionen
werfen RangeError. `discoveryPixels` ist positiv bis 64, `tolerancePixels`
positiv bis 2; `discoveryPixels >= tolerancePixels` ist erforderlich.
Bounds/Auflösung müssen außerdem die AP21-Präzisionsprüfung
erfüllen. Schon eine zu große Zahl Ausgangskacheln wird vor deren Erzeugung
abgebrochen. Kein zeitabhängiges Timeout und keine unbegrenzte Suchschleife.
Es gibt höchstens `maxDepth+1` Randdurchläufe; jeder neue Durchlauf benötigt
eine echte Zellteilung. Rekursionstiefe ist begrenzt. Blatt-, Linien-, Knoten-
und Randcaches sind O(maxCells), Rasterwerte O(maxSamples), Ausgabe/Stitching
O(maxSegments); keine unbudgetierte Speicherung aller F-/Gradientenaufrufe.
Alte Randpartitionen werden vor jedem neuen Randdurchlauf freigegeben.
Die Plattformkosten von Map/Objekten sind keine feste Bytegarantie.

`diagnostics` enthält Status, sortierte `limits` (`cells`, `evaluations`,
`samples`, `depth`, `segments`, `precision`), Zell-/Blatt-/Cache-/Kantenzahl,
tiefste Stufe, nichtendliche Auswertungen, verworfene Randklammern, ungeklärte
und nullwertige Zellen, Sattel-/Übergangszellen sowie die akzeptierte lokale
Fehlerschätzung. `truncated` bedeutet ausgeschöpftes hartes Limit;
`unresolvedCells` kann auch ohne dieses Flag numerische/Definitionslücken
anzeigen. `empty` bedeutet bei ortsabhängigen Funktionen nur „keine Kontur im
abgetasteten Bereich erkannt“, keinen mathematischen Leerheitsbeweis.
Alle ausgegebenen Punkte und Diagnosen sind endlich und serialisierbar.

### Fehlergrenzen und Verifikation

Die 0,25 px sind eine lokale, getestete Normalabstands-Schätzung, **keine**
universelle Hausdorff- oder Topologiegarantie. Schlechte Gradienten, sehr nahe
Äste, Oszillationen zwischen Proben, schmalere Komponenten, große dynamische
Wertespannen, Float64-Auslöschung und Pol-/Sprungstellen bleiben numerische
Grenzen. Auch eine endliche Anzahl Residuenproben beweist keine Stetigkeit
beliebiger Funktionen. Konservative Auslassungen sind möglich; Pole werden
nicht allein aufgrund eines Vorzeichenwechsels gezeichnet. Es werden keine
universellen Garantien für jede beliebig kleine Komponente behauptet.

`src/graph/implicit.test.ts` prüft Kreis/Ellipse mit unabhängigen analytischen
Abstandsproben, Hyperbelresiduen, beide Sattelentscheidungen, Raster- und
verschobene Kreuzungen, getrennte Komponenten, nahe Schleifen mit Radius 5 px
bei mehreren Rasterphasen, adaptive Übergänge ohne offene Enden, NaN-/Polbereiche,
konstante/degenerierte Mengen, Weltskalen 10^-200/10^200, alle Budgets und
deterministische Ergebnisse.
fast-check: Ausdrucksfuzzing Seed 260017 (50 Fälle), analytische verschobene
Kreise Seed 170026 (25 Fälle). Keine reinen Algorithmus-Snapshots.

`npm test -- --project=engine src/graph` führt die Graph-Tests aus.
`npm run test:graph:implicit:bench` misst zehn Referenzen bei **1280×720**,
8-px-Discovery/0,25-px-Ziel und obigen Standardbudgets, nach zwei Warm-ups mit
fünf Messungen je Fall. Komponenten-/Schließungs- und Residuenprüfungen sind
Teil des Benchmarks. Ziel 250 ms, großzügige Regressionsgrenze 1500 ms/Kurve;
2D wird nicht mit dem 1D-Ziel von 4 ms vermischt. Reale lokale Messwerte und
Arbeitszahlen: [graph-implicit-performance.json](graph-implicit-performance.json).
Der unveränderte 1D-/Fit-Benchmark bleibt bei 2560×1440 und <25 ms.
`npm run check` enthält beide Benchmarks. Vollständige npm-/Browsernachweise
werden im PR mit dem tatsächlich geprüften Commit ausgewiesen.

### AP27 · Integrationspunkt

`parseCurveInput` meldet für implizite Eingaben weiterhin ausdrücklich
`E_UNSUPPORTED_CURVE` mit `detectedKind: 'implicit'`. AP27 kann an genau diesem
Dispatcherzweig nach bewusster Freigabe `parseImplicitInput` aufrufen und den
neuen Typ an `sampleImplicitCurveDetailed` weiterreichen. Nicht einfach `Curve`
erweitern: `src/features/graph/workerProtocol.ts`, Sampling-Worker, Plot-Satz-
Validator/Persistenz und Fehlermeldungen müssen den neuen Auftrag verstehen.
Worker übertragen nur AST/Optionen und Polylinien/Diagnosen, niemals Closures.
Canvas/SVG können die resultierenden Polylinien übernehmen. AP27 muss zusätzlich
das Verhalten für Analysis, Trace, Fit und Wertetabelle festlegen; diese APIs
verlangen derzeit einen parametrisierten/einwertigen Kurvenvertrag und erhalten
in AP26 keinen impliziten Fallback. Issue #17 bleibt für diese Integration offen.

Der AP27-Featureadapter `parsePlotInput` aktiviert jetzt diesen Dispatcherzweig;
Worker/UI-Vertrag, Fit und bewusst gesperrte 1D-Aktionen: [AP27.md](AP27.md).
Der öffentliche Domänenparser `parseCurveInput` behält seinen 1D-Vertrag.
