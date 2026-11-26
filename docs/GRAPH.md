# Graphen

[Domänen-API](../src/graph/index.ts) und [Featureadapter](../src/features/graph). Die Domäne arbeitet mit dem Engine-AST und kompiliert Float64-Closures. Funktionen brauchen `floatImpl`. Nichtendliche Zwischenwerte bleiben ungültig. Freie Bezeichner werden Parameter mit Startwert 1. Mathematische Konstanten wie π und e sind reserviert. Physikalische Namen wie `c` sind freie Parameter.

## Kurven und Arbeitsgrenzen

`parseCurveInput` verarbeitet explizite, vertikale, parametrische und polare Kurven. Tupel trennen nur am äußeren Komma. `sampleCurveDetailed` liefert beschnittene, endliche Polylinien und Arbeitsdiagnosen. Die adaptive lokale Fehlerschätzung zielt auf 0,25 CSS-Pixel. Unerreichbare Schätzwerte, Pole und erschöpfte Intervalle ergeben Lücken. Das harte Budget liegt bei 100.000 Auswertungen je Kurve.

Bei expliziten Kurven sucht der Sampler in allen Divisionen des Original-AST nach erkennbaren affinen Nennern `a*x+b`. Die Erkennung verwendet endliche Literale, mathematische Konstanten und aktuelle Parameterwerte sowie Klammern, Vorzeichen, Summen, Differenzen, Multiplikation mit konstanten Termen und Division durch konstante Terme ungleich null. Für `a ≠ 0` prüft der Sampler `-b/a` im sichtbaren Fenster mit dem unveränderten Float64-Ausdruck. Eine dabei bestätigte ungültige Stelle wird zur Intervallgrenze, auch wenn sie zwischen Rasterproben liegt. Die Prüfung zählt zum Auswertungsbudget. Nichtlineare Nenner, Potenzen, Funktionsaufrufe oder Postfixoperatoren im Nenner sowie durch Float64-Rundung unbestätigte Kandidaten liegen außerhalb dieser Erkennung. Andere Kurventypen und die numerische Analysis verwenden ihre bisherigen Verfahren.

`parseImplicitInput` ist ein separater Eingang für `F(x,y)=0`. Eine Gleichung mit zwei skalaren Seiten wird zu `lhs-rhs` normalisiert. Die bisherige Syntax mit einem einzelnen Bezeichner links bleibt dem bestehenden Parser vorbehalten. Der Feature-Dispatcher aktiviert den 2D-Pfad für erkannte implizite Eingaben. `sampleImplicitCurveDetailed` liefert getrennte Konturen und Diagnosen. Adaptive Nachbarzellen teilen Randpartition und Schnittpunkte. Der Sattel-Decider verwendet die bilineare Determinante. Bei einer bestätigten Kreuzung treffen vier Äste in einem gemeinsamen Knoten.

Für implizite Kurven gelten getrennte Limits für Zellen, Auswertungen, Rasterwerte, Tiefe und Kanten. Standardwerte sind 200.000 Zellen, 1.000.000 Auswertungen, 400.000 Rasterwerte, Tiefe 10 und 50.000 Kanten. Nullregionen und unaufgelöste Zellen werden diagnostiziert. Eine leere Ausgabe bedeutet, dass im abgetasteten Ausschnitt keine Kontur erkannt wurde. Die lokale 0,25-Pixel-Schätzung gibt keine globale Vollständigkeits- oder Topologiegarantie.

## Analysis, Viewport und Darstellung

Nullstellen, Extrema, Wendepunkte und Schnittpunkte bieten eine numerische und eine analytische Methode. Die numerische Methode verwendet begrenzte Float64-Suchverfahren und liefert Treffer, Fehlerschätzungen und `confidence`. Residuenprüfungen verhindern beispielsweise einen Nullstellentreffer an einem Pol. Integrale und Flächen benötigen explizite einwertige Kurven. Implizite Kurven haben im Produkt keine Analysis-, Trace- oder Wertetabellenaktion.

Die analytische Methode unterstützt explizite reelle Polynome mit rationalen Koeffizienten. Sie liest Dezimal- und Exponentenliterale aus dem Engine-AST und interpretiert aktuelle Parameterwerte anhand ihrer gespeicherten Dezimaldarstellung. Unterstützt sind Klammern, Vorzeichen, die vier Grundrechenarten mit konstanten Nennern ungleich null, Prozent und ganzzahlige nichtnegative Potenzen. Die Potenz null ist auf nachweislich von null verschiedene konstante Basen beschränkt. Variable Nenner, negative oder gebrochene Potenzen, Funktionsaufrufe und eingebaute irrationale Konstanten ergeben „analytisch nicht unterstützt“. Beide Operanden werden vor algebraischen Umformungen geprüft. Ein wegkürzbarer Nenner kann dadurch keinen Treffer in einer Definitionslücke erzeugen.

Der Solver behandelt lineare und quadratische Gleichungen, wiederholte und vorliegende Produkte solcher Faktoren sowie ausklammerbare Potenzen von `x`. Bei Schnittpunkten löst er `f(x) − g(x) = 0` und setzt die Stelle exakt in `f` ein. Ableitungen entstehen symbolisch. Die Ordnung und das Vorzeichen des ersten nichtverschwindenden Taylor-Koeffizienten der untersuchten Ableitung belegen den Vorzeichenwechsel für ein striktes Extremum oder einen Wendepunkt. Bei Wendepunkten prüft die Methode zusätzlich die Stationarität. Die analytische Suche hat feste Grenzen für AST-Größe, Polynomgrad (24), rationale Zähler und Nenner (512 Bit) und die Vereinfachung von Wurzeln (20.000 Teilerversuche je Analyse).

Einzeltreffer werden exakt mit beiden Ansichtsgrenzen verglichen und zusammengefasst. Identische Funktionen stimmen für alle x im Suchintervall überein. Die Oberfläche unterscheidet leere, unendliche und nicht unterstützte Lösungsmengen. Aus der Meldung für einen nicht unterstützten Ausdruck kann dieselbe Auswahl numerisch analysiert werden. Exakte Koordinaten und aufklappbare Rechenwege bleiben bis zur lokalisierten Anzeige erhalten. Dezimalnäherungen und Canvas-Marker verwenden daraus abgeleitete Float64-Werte.

`Viewport` hält gewünschte Ansicht und stabile Fit-Abtastbasis getrennt. Wiederholtes Fit soll dieselbe lokale Rahmung ergeben. Pan und Zoom setzen die Basis bewusst neu. Größen- und Aspektänderungen erhalten sie. Verlauf und Permalink tragen `fitBasis` optional in Plot-Satz-Version 1. Navigation, Größenanpassung und Funktionsänderungen müssen alte Fit-Ziele invalidieren.

Der Canvas-Controller verwaltet das aktuelle Ansichtsziel. Seine verzögerten Rückmeldungen an React aktualisieren den Snapshot für den Verlauf. Beim expliziten Wiederherstellen übernimmt der Controller die gespeicherten Grenzen aus React.

Der lokale Sampling-Worker erhält serialisierbare Eingaben und begrenzte Aufträge. Antworten müssen zur aktuellen Generation und Signatur passen. Parameteränderungen dürfen kompatible Zwischengeometrie stehen lassen. PNG benötigt eine aktuelle gerenderte Geometrie. Analysis, Trace und Wertetabelle arbeiten mit dem aktuellen Modell. Das feine Raster begrenzt Rasterarbeit und fällt bei ungeeigneter Pixelgeometrie auf den direkten Canvas-Pfad zurück.

Die Wertetabelle rundet nur zur Anzeige. CSV exportiert die vorhandenen Zeilen einschließlich eines gültigen Teilbereichs ohne erneutes Sampling. UTF-8 und CRLF, Eingabevariable `x_input`, `y_input`, `t` oder `θ`, danach `x` und `y`. Deutsch verwendet Semikolon und Dezimalkomma, Englisch Komma und Dezimalpunkt. Rohwerte bleiben rücklesbar einschließlich `-0`. Nichtendliche Werte erzeugen leere Felder.

## Prüfung

`npm run test:engine` prüft analytische Referenzen, Topologie, Fit-Stabilität und Grenzfälle. `npm run test:graph:bench` und `npm run test:graph:implicit:bench` prüfen getrennte Budgets. Browserprüfungen decken Worker, Canvas, 4K-Interaktion, Darstellung und Exporte ab.
