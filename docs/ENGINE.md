# Engine-Kern · AP5

`src/engine/index.ts` ist der öffentliche Einstiegspunkt. Alle Module sind reines
TypeScript ohne React, DOM, Store, IO, `eval` oder `new Function`. Die vier Modi
binden den Kern erst in ihren eigenen Paketen an. Dieser Vertrag wurde **vor den
Tests und der Implementierung** festgelegt.

## Zahlen und Werte

Die Engine verwendet eine private `decimal.js`-Kopie mit **50 signifikanten
Stellen**, `ROUND_HALF_UP` (bei Gleichstand vom Nullpunkt weg) und euklidischem
Modulo. Auch Literale und Kontextwerte werden auf 50 Stellen gerundet. Anzeige
und Berechnung sind getrennt; die Anzeige verwendet standardmäßig 15
signifikante Stellen. `0.1 + 0.2` ergibt exakt `0.3`. Transzendente Funktionen
und Ergebnisse mit mehr als 50 Stellen sind entsprechend gerundete Näherungen.
Die globale Konfiguration von `decimal.js` wird nicht verändert.

`NumberValue = { readonly kind: 'number'; readonly value: Decimal }`.
`Value` ist die diskriminierte Union der Einträge von `ValueKinds`; spätere Pakete
können diese Schnittstelle um `complex` oder `list` erweitern. Operatoren prüfen
den Werttyp; unbekannte Typen ergeben `E_TYPE`. `ans` und Variablen kommen
ausschließlich aus dem Kontext, ohne versteckten Zustand oder Mutation.

## Grammatik (EBNF)

```ebnf
expression = sum ;
sum        = product, { ("+" | "-"), product } ;
product    = unary, { ("*" | "/"), unary | implicit, power } ;
unary      = ("+" | "-"), unary | power ;
power      = postfix, [ "^", unary ] ;
postfix    = primary, { "!" | "%" } ;
primary    = number | identifier | call | "(", expression, ")" ;
call       = name, "(", [ expression, { ",", expression } ], ")" ;
identifier = name | "π" ;
name       = (letter | "_"), { letter | digit | "_" } ;
number     = (digits, [ ".", [digits] ] | ".", digits),
             [ ("e" | "E"), [ "+" | "-" ], digits ] ;
digits     = digit, { digit } ;
letter     = "a"…"z" | "A"…"Z" ;
digit      = "0"…"9" ;
```

Whitespace wird zwischen Tokens ignoriert. `−` wird zu `-`, `×` und `·` zu `*`,
`÷` zu `/` normalisiert; Quellpositionen bleiben erhalten. `implicit` ist eine
Token-Grenze vor einem Namen, `π` oder `(`; vor einer Zahl ist sie nur nach `)`,
`!` oder `%` erlaubt. Zwei bloße Zahlen (`1 2`, `1.2.3`) sind ein Fehler.
Ein Name gefolgt von `(` ist immer ein Funktionsaufruf, auch bei unbekanntem
Namen; `x(2)` bezeichnet keine Variablenmultiplikation. Dafür `x*(2)` schreiben.
Namen sind case-sensitive und werden nicht zerlegt (`xy` ist eine Variable).
Direkt an eine Zahl angehängtes `e/E` eröffnet einen Exponenten und muss
vollständig sein; für Multiplikation mit Euler `2 e` oder `2*e` schreiben.
Komma ist ausschließlich Argumenttrenner. `°` ist kein Ausdruckstoken;
`sin(180)` mit `angleMode: 'deg'` entspricht der Schreibweise sin(180°).

## Präzedenz

Höhere Zahl bindet stärker:

| Stufe | Operatoren / Form             | Assoziativität |
| ----- | ----------------------------- | -------------- |
| 5     | Primärwerte, Klammern, Aufruf | —              |
| 4     | Postfix `!`, `%`              | links          |
| 3     | `^`                           | **rechts**     |
| 2     | Präfix `+`, `-`               | rechts         |
| 1     | `*`, `/`, implizites Produkt  | **links**      |
| 0     | `+`, `-`                      | links          |

Die rechte Potenzseite ist `unary`: `2^-3` ist erlaubt. `2^3^2 = 512`,
`-2^2 = -4`, `(-2)^2 = 4`. Explizite und implizite Multiplikation haben dieselbe
Präzedenz: **`1/2x = (1/2)*x`**, `2π`, `2(3+4)`, `(1+2)(3+4)` und
`3sqrt(4)` werden unterstützt. `2^3!` bedeutet `2^(3!)`.

## Prozent und weitere konservative Entscheidungen

- Standard `percentMode: 'strict'`: jedes Postfix `%` teilt durch 100.
- `calculator`: Bei `a + b%` bzw. `a - b%` wird der rechte Prozentwert mit `a`
  multipliziert, dann addiert bzw. subtrahiert. Durchsichtige Klammern und unäre
  Vorzeichen um den rechten Prozentterm zählen mit: `200+(-10%) = 180`.
  Nur ein solcher **unmittelbarer** Prozentterm wird relativ interpretiert;
  `200+10%*2 = 200.2`, `200+(10+5)% = 230`. Verkettete Additionen verwenden
  jeweils das aktuelle linke Ergebnis: `200+10%+10% = 242`.
  `a*b% = a*b/100`, `a/b% = a/(b/100)`; alleinstehende Prozentwerte bleiben
  Bruchteile. `50%% = 0.005` in beiden Modi.
- Fakultät nur für nichtnegative ganze Zahlen; `0! = 1`. Keine Gamma-Erweiterung.
  Das begrenzte ganzzahlige Produkt wird exakt mit BigInt gebildet, dann einmal
  auf 50 Stellen gerundet.
- Reelle Werte: `0^0` ist `E_DOMAIN`; negative Basen benötigen ganzzahlige
  Exponenten. `root(n,x)` verlangt eine von null verschiedene ganze Wurzelordnung;
  negative Ordnungen sind reziproke Wurzeln. Negative Radikanden brauchen eine
  ungerade Ordnung. `cbrt(-8) = -2`.
- `round` rundet zur ganzen Zahl, Gleichstände vom Nullpunkt weg.
  `mod(a,b)` ist euklidisch: `0 <= mod(a,b) < abs(b)`; `b=0` ist ein Fehler.
- `atan2(y,x)` verwendet diese Argumentreihenfolge; `(0,0)` ist `E_DOMAIN`.
  `min` und `max` brauchen mindestens ein Argument.
- `pi`, `π`, `e` und `ans` sind reserviert. Kontextvariablen überschreiben
  Konstanten nicht. Fehlendes `ans` ist `E_UNKNOWN_VARIABLE`.

## Winkel und Präzision

`angleMode: 'rad' | 'deg' | 'grad'`, Standard `rad`. Direkte Funktionen nehmen
Winkel in diesem Modus an; inverse Funktionen und `atan2` liefern ihn darin.
Die Reduktion und trigonometrischen Zwischenwerte verwenden eine separate
80-Stellen-Kopie und eine fest eingecheckte π-Konstante mit 110 Stellen.
Der finale Wert wird auf 50 Stellen gerundet.

Reduktion zunächst in der Eingabeeinheit auf eine Periode (`360`, `400`, `2π`),
dabei bleibt das Vorzeichen des Restes erhalten, damit winzige negative Winkel
nicht als gerundete volle Periode verschwinden. Danach Umrechnung in Radiant.
Für `sin`, `cos` und `tan` wird der reduzierte Winkel an das
nächste Vielfache von 15° eingerastet, **nur wenn** sein Abstand in der
Eingabeeinheit `<= abs(originaler Winkel) * 10^-48` ist. Der Nullwinkel wird
direkt behandelt. Das ist kein pauschales Runden kleiner Funktionswerte:
`sin(1e-60)` bleibt ungleich null. Die Spezialwerttabelle verwendet exakte
Brüche und hochpräzise Quadratwurzeln. So sind `sin(180)` und `cos(90)` im
Gradmodus exakt null, `sin(30)` und `cos(60)` exakt `0.5`, `tan(45)` exakt `1`.
Ist die eingerastete Kosinus-Komponente null, liefert `tan` `E_DOMAIN`.
Winkel unmittelbar neben einem Pol bleiben berechenbar.

Konservativ werden direkte trigonometrische Eingaben mit Betrag `> 10^30`
als `E_DOMAIN` abgelehnt: Ein 50-Stellen-Eingabewert kann dort die für die
Anzeige nötige Phasengenauigkeit nicht zuverlässig sichern.

## Öffentliche API und stabiler AST

```ts
parse(src: string): Result<Ast, ParseError>;
evaluate(ast: Ast, ctx?: EvaluationContext): Result<Value, EvalError>;
evaluateString(src: string, ctx?: EvaluationContext): Result<Value, EngineError>;
print(ast: Ast): string;
numberValue(input: Decimal.Value): Result<NumberValue, EvalError>;
```

`Result<T,E>` ist `{ ok: true, value: T } | { ok: false, error: E }`.
Fehler enthalten `code` und `range`, niemals einen Anzeigetext. Der Kontext hat
`angleMode?`, `percentMode?`, `variables?: Readonly<Record<string, Value>>`,
`ans?: Value` und `functions?: FunctionRegistry`. Eigene Funktionen überlagern
die Standardregistry lokal, ohne deren Mutation. Geerbte Objektfelder sind
weder Variablen noch Funktionen. Die Result-APIs fangen auch Fehler eigener
Funktionsimplementierungen ab (`E_INTERNAL`).

AST-Knoten sind readonly diskriminierte Objekte mit `kind` und `range`:

| kind         | Zusätzliche Felder                                       |
| ------------ | -------------------------------------------------------- |
| `number`     | `literal: string` (Quellschreibweise, ohne Vorzeichen)   |
| `identifier` | `name: string`                                           |
| `unary`      | `operator: '+'                                           | '-'`, `operand`, `operatorRange` |
| `binary`     | `operator`, `left`, `right`, `implicit`, `operatorRange` |
| `postfix`    | `operator: '!'                                           | '%'`, `operand`, `operatorRange` |
| `group`      | `expression`                                             |
| `call`       | `name`, `args: readonly Ast[]`, `nameRange`              |

`SourceRange = { start: number; end: number }` ist ein **halboffenes
UTF-16-Intervall** in der originalen Eingabe; EOF hat `start === end`.
Implizite Operatoren haben einen leeren Bereich am Beginn des rechten Terms.
`print` erzeugt kanonische ASCII-Operatoren und erhält explizite Klammern,
Literale und implizite Produkte. Parse-Print-Parse erhält die AST-Struktur
ohne Quellbereiche; zusätzliche nötige Klammern für programmatisch gebaute ASTs
sind semantisch durchsichtig. AST-Form und Feldnamen sind ab AP5 öffentliche
API für Graph-Kompilierer und LaTeX-Export; inkompatible Änderungen benötigen
eine ausdrückliche Vertragsänderung.

## Funktionsregistry

`functionRegistry: FunctionRegistry` enthält Einträge mit
`{ name, arity, impl, doc: { de, en }, category }`. `arity` ist eine feste Zahl
oder `{ min, max? }`; fehlendes `max` bedeutet beliebig viele Argumente innerhalb
des allgemeinen Ausdruckslimits. `impl(args, context)` liefert
`Result<Value, EvalError>`. `context` enthält den Winkelmodus und den Bereich
des gesamten Aufrufs. Die Auswertung prüft die Anzahl vor den Argumenten.

| Kategorie    | Funktionen                                  |
| ------------ | ------------------------------------------- |
| algebra      | sqrt, cbrt, root, abs                       |
| exponential  | exp, ln, log (Basis 10), log2, logb(b,x)    |
| trigonometry | sin, cos, tan, asin, acos, atan, atan2(y,x) |
| rounding     | floor, ceil, round, trunc, sign             |
| aggregation  | min, max                                    |
| arithmetic   | mod                                         |

Neue Pakete tragen vollständige Einträge über `ctx.functions` ein; Parser und
Auswerter kennen keine fest verdrahtete Liste von Funktionsnamen.

## Fehlercodes und Grenzen

| Code                         | Art    | Bereich / Bedeutung                                          |
| ---------------------------- | ------ | ------------------------------------------------------------ |
| `E_SYNTAX`                   | Parse  | Leere Eingabe                                                |
| `E_INVALID_NUMBER`           | Parse  | Ganzes fehlerhaftes Zahlenliteral / unvollständiger Exponent |
| `E_UNEXPECTED_TOKEN`         | Parse  | Unerwartetes Token, Zeichen oder EOF                         |
| `E_MISSING_PAREN`            | Parse  | Erwartete schließende Klammer, Token oder EOF                |
| `E_UNEXPECTED_PAREN`         | Parse  | Überzählige schließende Klammer                              |
| `E_DIVISION_BY_ZERO`         | Eval   | Divisionsoperator; bei mod/Wurzel der gesamte Aufruf         |
| `E_DOMAIN`                   | Eval   | Potenz-/Postfixoperator oder gesamter Funktionsaufruf        |
| `E_OVERFLOW`                 | Eval   | Zahl, Operation oder Aufruf außerhalb des Zahlenbereichs     |
| `E_UNKNOWN_VARIABLE`         | Eval   | Bezeichner einschließlich fehlendem ans                      |
| `E_UNKNOWN_FUNCTION`         | Eval   | Funktionsname                                                |
| `E_ARGUMENT_COUNT`           | Eval   | Gesamter Aufruf                                              |
| `E_TYPE`                     | Eval   | Nicht unterstützter Werttyp                                  |
| `E_RESOURCE_LIMIT`           | beide  | Eingabe / Knoten überschreitet Arbeitsgrenze                 |
| `E_INTERNAL`                 | beide  | Unerwarteter interner oder Registry-Fehler, ohne Text        |
| `E_INVALID_LOCALIZED_NUMBER` | Format | Gesamte lokalisierte Zahl                                    |

Nichtnullwerte müssen einen Dezimalexponenten zwischen `-10000` und `10000`
haben. Auch Unterlauf wird als `E_OVERFLOW` gemeldet, nicht still als null.
Grenzen: 10000 UTF-16-Einheiten, 2048 AST-Knoten, maximale AST-Tiefe 128 und
Fakultät bis 1000. Die Grenzen verhindern unbeschränkte Arbeit bei fremden
Eingaben; Überlauf- und Ressourcenfälle werden als Result zurückgegeben.
`print` setzt einen gültigen, azyklischen AST innerhalb dieser Grenzen voraus.

## Zahlenformat und UI-Normalisierung

```ts
formatNumber(value: NumberValue | Decimal, options?: {
  notation?: 'auto' | 'fixed' | 'sci' | 'eng';
  digits?: number; locale?: string; grouping?: boolean;
}): string;
parseLocalizedNumber(src: string, options?: {
  locale?: string; grouping?: boolean;
}): Result<NumberValue, FormatError>;
```

`digits` bezeichnet in **allen** Notationen signifikante Stellen (1–50,
Standard 15), nicht Nachkommastellen. Keine erzwungenen Endnullen. `auto`
verwendet Festkomma für Exponenten `-6 <= e < digits`, sonst Wissenschaftsformat.
`fixed` bleibt Festkomma; `sci` hat eine Vorkommastelle; `eng` einen Exponenten
als Vielfaches von drei. Vor der Wahl des Exponenten wird gerundet, sodass
Überträge korrekt sind. Gruppierung (Standard false) gilt nur für Festkomma.
Standardlocale ist `en-US`; ungültige Locales fallen darauf zurück, ungültige
digits auf 15. Minusnull wird als null ausgegeben.

`Intl.NumberFormat` bestimmt ausschließlich Ziffern und Trennzeichen anhand
kleiner Musterzahlen. Der eigentliche Decimal-Wert wird **nie** in einen
JavaScript-Number konvertiert. Lokalisierte Ziffern und Dezimalzeichen werden
unterstützt; `e` und Exponenten bleiben ASCII. Der Parser akzeptiert nur eine
einzelne Zahl, optional außen Whitespace und einen wissenschaftlichen Exponenten.
Gruppierung muss ausdrücklich aktiviert sein und dem Locale-Muster entsprechen
(auch indische 3/2-Gruppen); fremde/fehlerhafte Trenner werden abgelehnt.

Die UI ruft diese Hilfsfunktion gezielt für Zahleneingaben auf und setzt den
Decimal-Wert in Punktnotation ein. `parse` normalisiert kein Komma; ein blindes
Ersetzen in ganzen Ausdrücken würde Funktionsargumente beschädigen. Keine
Änderung am vorhandenen UI-Formatadapter in AP5.

## Verifikation und Folgepakete

Zuerst Vertrag, dann tabellengetriebene Tests (mindestens 300 Fälle), dann
Implementierung. Tests decken Präzedenz, Prozent, implizite Produkte, Winkel,
Definitionsbereiche, Positionen und mindestens 15 korrekte Stellen gegen
unabhängige Referenzwerte ab. fast-check prüft Parse-Print-Roundtrip und beliebige
Strings (immer Result, kein Throw). Ein eigener Benchmark misst nach Warm-up
Parse + Eval typischer Ausdrücke, Ziel: im Mittel unter 1 ms je Ausdruck;
Hardware und Messwerte werden im PR angegeben. Unit-Tests verwenden für den
Kern eine Node-Umgebung ohne den UI-Testsetup. `npm run check` und Chromium-CI
bleiben verbindlich.

Offen in Folgepaketen: Modus-UI/Fehlerübersetzungen (AP6/AP8), komplexe Zahlen,
Listen und numerische Analysis (AP7), Graph-Kompilierer (AP12), LaTeX-Export und
eigene Funktionsdefinitionen in der UI (AP14).

Referenz: [decimal.js API](https://mikemcl.github.io/decimal.js/) (private
Konfiguration, Rundung und transzendente Funktionen).
