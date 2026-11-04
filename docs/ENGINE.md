# Rechenkern

[Öffentlicher Einstieg](../src/engine/index.ts). `parse`, `evaluate` und `evaluateString` arbeiten mit einem readonly AST und typisierten Results. Fehler enthalten stabile Codes und Quellbereiche. `print` erwartet einen gültigen, azyklischen AST. Funktionssignaturen und lokalisierte Hilfen stehen in der Registry.

## Zahlen und Syntax

- Die private Decimal-Konfiguration rechnet mit 50 signifikanten Stellen, ROUND_HALF_UP und euklidischem Modulo. `Value` umfasst reelle, komplexe und Listenwerte. Rechnen und Anzeigen sind getrennt.
- Aufrufe und Klammern binden am stärksten, dann Postfix `!` und `%`, Potenz, Präfixvorzeichen, Multiplikation und Division, zuletzt Addition und Subtraktion. Potenzen sind rechtsassoziativ. `-2^2 = -4`, `2^-3` ist gültig, und `1/2x = (1/2)*x`. Ein Name vor einer Klammer ist ein Aufruf. `2e` beginnt einen Exponenten, `2*e` multipliziert mit der Konstante.
- Dezimalliterale verwenden den Punkt, Kommas trennen Funktionsargumente. `parseLocalizedNumber` ist für einzelne UI-Zahlen zuständig. `formatNumber` unterstützt 1–50 signifikante Stellen (Standard 15), Locale, Gruppierung und Festkomma-, Wissenschafts- oder Engineeringnotation. Der Decimal-Wert bleibt bei der Formatierung erhalten.
- Im Standardmodus `strict` teilt Prozent durch 100. Im Modus `calculator` beziehen `a+b%` und `a-b%` den unmittelbaren rechten Prozentterm auf `a`. Klammern und Vorzeichen ändern diese Einordnung nicht. In `200+10%*2` bleibt der Prozentterm ein Bruchteil.
- `0^0`, nichtganzzahlige reelle Potenzen negativer Basen und Division durch null liefern Fehler. Fakultät ist für ganze Zahlen von 0 bis 1000 definiert. Eingaben sind auf 10.000 UTF-16-Einheiten, 2.048 AST-Knoten und Tiefe 128 begrenzt. Nichtnullwerte brauchen einen Exponenten zwischen −10.000 und 10.000.
- Winkelmodi sind `rad` (Standard), `deg` und `grad`. Trigonometrie reduziert in der Eingabeeinheit mit höherer Arbeitspräzision. Das Einrasten naher Vielfacher von 15° verwendet die relative Schwelle `abs(Winkel) * 10^-48`. Winzige Winkel bleiben auswertbar. Beträge über `10^30` und eingerastete Tangens-Pole ergeben `E_DOMAIN`.

## Wissenschaftlicher Zustand und Genauigkeit

`execute` nimmt einen unveränderlichen, JSON-serialisierbaren Environment-Snapshot und liefert Wert und Folge-Environment. Oberste Anweisungen sind Ausdruck, Variablenzuweisung oder Funktionsdefinition. Namen sind case-sensitive. Reservierte Namen und Konstanten einschließlich `ans` können nicht neu definiert werden. Eigene Funktionen lösen freie Namen im aktuellen Environment auf. Binder wie `sum`, `prod`, `integral` und `deriv` binden ihre lokale Variable lexikalisch und teilen das Auswertungsbudget. Integral und Ableitung liefern numerische Näherungen für reelle Werte. Pole, Definitionslücken und ausgeschöpfte Budgets können eine Auswertung abbrechen.

Komplexe Werte sind opt-in. Wurzel, Potenz und Logarithmus verwenden den Hauptzweig. Die Anzeige darf Werte runden oder als Bruch, LaTeX oder Polarform darstellen. `valueSource` liefert den kanonischen, locale-unabhängigen Quelltext für exakte Wiederverwendung einschließlich verschachtelter Listen. Beim Bearbeiten bleibt vorhandener Definitionsquelltext erhalten; ein nicht sicher rekonstruierbarer Altbestand wird nicht still ersetzt.

Der wissenschaftliche Featureworker führt Vorschau, Ausführung und STO lokal aus. Es gibt eine laufende Arbeit und höchstens eine neuere Vorschau. Abbruch und Invalidierung terminieren den Worker. Ergebnisse werden gegen die aktive Anfrage und Environmentrevision geprüft. Nur bestätigte, aktuelle Ausführungen dürfen Environment und Verlauf aktualisieren. Definitionsbackups werden vollständig validiert und atomar übernommen. Gespeicherte Definitionen werden beim Wiederherstellen nicht als neue Anweisungen ausgeführt.

## Informatik

[Programmer-API](../src/engine/programmer/index.ts) für 8/16/32/64-Bit-Wörter, signed/unsigned, Zweierkomplement und expliziten Überlaufmodus. Bitoperatoren sind opt-in. Unterhalb von Addition binden `<< >>`, dann `&`, dann `|`. `^` bleibt Potenz und XOR ist `xor(a,b)`. 64-Bit-Integer bleiben BigInt. Basen 2–36, IEEE-754-Rohfelder einschließlich NaN-Payload und Minusnull sowie Unicode-Skalare und UTF-8-Bytes haben getrennte Helfer.

## Prüfung

`npm run test:engine` deckt Referenzwerte, Fehler, Roundtrips und Eigenschaften ab. `npm run test:engine:bench` setzt feste Laufzeitgrenzen für typische Ausdrücke und ein Integral. Die Browser-Specs prüfen Editor, Worker, Wiederherstellung und Kopieren.
