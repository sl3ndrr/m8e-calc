# Engine-Kern · AP5

## Informatik · AP9 (Vertrag vor Tests und Implementierung)

`src/engine/programmer/index.ts` liefert reine BigInt-Wortoperationen. `WordOptions`
enthält `width: 8 | 16 | 32 | 64`, `signed: boolean`, `overflow: 'wrap' | 'error'`.
`word(value, options)` normalisiert Zahlenwerte; `fromBits(bits, options)` interpretiert
ein Bitmuster als Zweierkomplement. Operationen liefern Zahlenwerte im gewählten
Bereich. Überlauf bei Zahleneingabe und Linksverschiebung folgt der Option; reine
Bitoperationen interpretieren das resultierende Bitmuster. Negative Shift-/Rotationszahlen
sind E_DOMAIN; Shifts ≥ Wortbreite liefern null bzw. beim arithmetischen Rechtsshift
die Vorzeichenerweiterung, Rotationen verwenden Anzahl modulo Wortbreite.
`>>` ist signed arithmetisch, unsigned logisch; `lsr` und `asr` sind explizit.
`operate` unterstützt and/or/xor/not/nand/nor/xnor/shl/lsr/asr/rol/ror/bswap/popcount/clz/ctz.
Für null liefern clz/ctz die Wortbreite. Byte-Swap ist unabhängig von Host-Endianness.
Die Hilfs-APIs werfen `NumericFault` mit Engine-Fehlercode bei ungültigen Eingaben;
die Engine-Result-APIs übersetzen ihn mit dem Quellbereich.

`parse(src, { bitwise?: boolean })` erweitert den AST additiv um unär `~` und binär
`& | << >>`. `EvaluationContext.bitwise` schaltet Auswertung und `xor(a,b)` frei;
`programmer?: WordOptions` setzt den Wortkontext (Standard 32 Bit, unsigned, wrap).
`evaluateString` und `execute` reichen bitwise an den Parser weiter. Ganzzahlliterale
`0x`, `0b`, `0o` (auch Großbuchstaben) sind in allen Kontexten erlaubt, ungültige
Ziffern melden E_INVALID_NUMBER. Bitoperationen verlangen endliche reelle Ganzzahlen. Ganzzahlige Endergebnisse im
Informatik-Kontext werden gemäß Wortbreite und Überlauf normalisiert; gewöhnliche
nichtganzzahlige wissenschaftliche Ergebnisse bleiben darstellbar. Die freigeschalteten
Aufrufe sind xor/nand/nor/xnor/shl/lsr/asr/rol/ror (2 Argumente) und
bswap/popcount/clz/ctz (1 Argument), im aktiven Kontext reserviert.
`^` bleibt rechtsassoziative Potenz. Unterhalb der bestehenden Präzedenz gelten
wie in C, von stark nach schwach: `+ -` → `<< >>` → `&` → `|`, jeweils linksassoziativ.
Präfix `~` hat dieselbe Bindung wie die vorhandenen Präfix-Vorzeichen; Potenz und
Postfix binden weiterhin stärker. C-XOR `^` wird deshalb durch `xor(a,b)` ersetzt.
Print, LaTeX und Environment-Validierung unterstützen die ergänzten AST-Operatoren.

`parseBase`/`formatBase` unterstützen Basen 2…36. Nichtdezimalzahlen sind Bitmuster,
Dezimalzahlen signed/unsigned Zahlenwerte. Gruppierung ist optional in Nibbles oder
Bytes; Eingabe erlaubt die so erzeugten Leerzeichen, keine fremden Trennzeichen.
Binär/Hex/Oktal werden zur Wortbreite aufgefüllt. 64-Bit-Integer passieren nie Number.

`floatFromBits(bits, 32 | 64)`, `floatToBits(number, width)` und
`composeFloat(sign, exponent, mantissa, width)` zerlegen/erzeugen IEEE-754-Bitmuster.
Rohfelder werden validiert, NaN-Payloads beim Bit-Roundtrip erhalten. Klassen:
zero, normal, subnormal, infinity, nan. `exact` ist die vollständige Dezimaldarstellung
des binären rationalen Werts (BigInt mit Potenzen von 5), einschließlich `-0`,
`NaN`, `Infinity`, `-Infinity`. Number-Eingabe rundet float32 gemäß IEEE nearest-even.
`characterInfo` verlangt genau einen Unicode-Skalar, `codepointInfo` einen gültigen
Skalar 0…10FFFF ohne Surrogate; beide liefern Zeichen, Codepoint und UTF-8-Bytes.
Keine TextEncoder-/Browserabhängigkeit.

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
`Value` ist die diskriminierte Union der Einträge von `ValueKinds`; AP7
ergänzt `complex` und `list` (siehe unten). Operatoren prüfen
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
- Fakultät nur für nichtnegative ganze Zahlen; `0! = 1`. Gamma ist eine separate Funktion (AP7).
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

`angleMode: 'rad' | 'deg' | 'grad'`, Standard `rad`. Direkte trigonometrische Funktionen nehmen
Winkel in diesem Modus an; inverse Funktionen und `atan2` liefern ihn darin.
Die Reduktion und trigonometrischen Zwischenwerte verwenden eine separate
80-Stellen-Kopie und eine fest eingecheckte π-Konstante mit 110 Nachkommastellen.
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
| `unary`      | `operator: '+' oder '-'`, `operand`, `operatorRange`     |
| `binary`     | `operator`, `left`, `right`, `implicit`, `operatorRange` |
| `postfix`    | `operator: '!' oder '%'`, `operand`, `operatorRange`     |
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

Offen in Folgepaketen: wissenschaftliche Modus-UI/Fehlerübersetzungen (AP8),
Graph-Kompilierer (AP12) und Bedienoberflächen für eigene Funktionen (AP14).
AP7 ergänzt die nachfolgend spezifizierten Kernfunktionen.

Referenz: [decimal.js API](https://mikemcl.github.io/decimal.js/) (private
Konfiguration, Rundung und transzendente Funktionen).

## Wissenschaftlicher Kern · AP7 (Vertrag vor Tests und Implementierung)

AP7 ergänzt ausschließlich den reinen TypeScript-Kern. Bestehende AP5-Knoten,
Operatorpräzedenz und Result-APIs bleiben erhalten; die folgenden Ergänzungen
ersetzen die früheren Folgepaket-Hinweise zu komplexen Zahlen, Analysis und Export.

### Syntax, Registry und Werte

Auf oberster Ebene ist zusätzlich genau eine Anweisung erlaubt:

```ebnf
statement = expression | name, "=", expression
          | name, "(", name, { ",", name }, ")", "=", expression ;
```

Beispiele: `a = 5`, `f(x) = x^2 + a`, `f(x, y) = x*y + a`.
Zuweisungen innerhalb von Ausdrücken sind unzulässig. Neue readonly AST-Knoten:
`assignment { name, nameRange, expression }` und
`definition { name, nameRange, parameters: readonly string[], expression }`.
`print` und `toLatex` unterstützen beide. Namen bleiben case-sensitive.
`π`, `φ` und `τ` sind zusätzliche symbolische Konstanten-Aliase; physikalische
Symbole dienen der Anzeige, Ausdrücke verwenden die ASCII-Namen der Tabelle.

`ValueKinds` erhält `complex { re: Decimal, im: Decimal }` und
`list { values: readonly Value[] }`. Listen haben keine arithmetischen Operatoren.
`factor(n)` liefert aufsteigende Primfaktoren mit Wiederholungen, `factor(1)`
eine leere Liste. `isPrime` liefert numerisch `1` oder `0`.
Alle Funktionen, auch Binder, stehen in `functionRegistry` mit `doc.de` und
`doc.en`. Eine optionale `astImpl(args: readonly Ast[], context)` kennzeichnet
Binder; diese erhalten **keine vorab ausgewerteten Argumente**. Der Kontext
enthält `evaluate(ast, bindings?)`, das denselben Arbeitszähler verwendet.
`sum` und `prod` sind ausschließlich Binder, niemals Statistik-Aliase.

| Kategorie     | Neue / erweiterte Funktionen                                  | Vertrag                                                                                                                             |
| ------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| hyperbolic    | sinh, cosh, tanh, asinh, acosh, atanh                         | reell, unabhängig vom Winkelmodus; acosh ≥ 1, abs(atanh-Eingabe) < 1                                                                |
| trigonometry  | sec, csc, cot, deg2rad, rad2deg                               | reziproke Winkelfunktionen mit Polfehler; Konverter unabhängig vom Kontext                                                          |
| combinatorics | factorial, gamma, nCr, nPr                                    | Fakultät auch `!`, nichtnegative ganze Zahlen ≤ 1000; 0 ≤ r ≤ n ≤ 1000; Gamma reell ohne nichtpositive ganzzahlige Pole             |
| numberTheory  | gcd, lcm, isPrime, factor                                     | gcd/lcm für ganze Zahlen mit Betrag ≤ 10^15, gcd(0,0)=lcm(0,0)=0; Primprüfung 0…10^12, factor 1…10^12, darüber E_RESOURCE_LIMIT     |
| rounding      | frac, round(x, n?)                                            | frac=x-trunc(x), vorzeichenbehaftet; n ganzzahlig −100…100, Standard 0, Gleichstand vom Nullpunkt weg                               |
| aggregation   | total, mean, median, variance, stdev, stdevp, min, max, count | reell, variadisch; total()/count()=0, übrige ≥1, variance/stdev ≥2; variance und stdev Stichprobe (n−1), stdevp Grundgesamtheit (n) |
| calculus      | sum(expr,k,from,to), prod(expr,k,from,to)                     | inklusive ganze Grenzen, Schritt +1, maximal 10000 Glieder; leer=0 bzw. 1                                                           |
| calculus      | integral(expr,x,a,b), deriv(expr,x,point)                     | endliche reelle Grenzen/Stelle, lokaler Bindername; Integrale dürfen umgekehrte Grenzen haben                                       |
| complex       | arg, conj, re, im                                             | Hauptargument (−π,π] im Winkelmodus, arg(0) E_DOMAIN; reelle Eingaben erlaubt                                                       |

Binderargument 2 muss ein nichtreservierter Identifier sein. Lokale Bindung
überschattet eine gleichnamige Kontextvariable, verschachtelte Binder sind
lexikalisch; Grenzen werden außerhalb der neuen Bindung ausgewertet. Binder
verändern den äußeren Kontext nicht. Analysis verlangt reelle Funktionswerte.

### Komplexer Modus

`EvaluationContext.complex: 'off' | 'on'`, Standard `off`. `i` und `j` sind
reservierte imaginäre Einheiten, bei `off` E_DOMAIN. Auch komplexe Kontextwerte
sind bei `off` unzulässig. `sqrt(-1)` und `ln(-1)` bleiben bei `off` E_DOMAIN,
bei `on` liefern sie `i` bzw. `i*pi`. Gemischte Zahlen werden zu komplexen
Werten promoviert. Unterstützt: `+ - * / ^ sqrt exp ln sin cos abs` und die
oben genannten komplexen Funktionen. Andere reelle Funktionen geben E_TYPE
für komplexe Argumente. Potenz, Wurzel und Logarithmus verwenden den Hauptzweig;
`0^0` bleibt E_DOMAIN. Komplexe ganzzahlige Potenzen (Exponentbetrag ≤ 100000) werden durch wiederholtes
Quadrieren gebildet; darüber E_RESOURCE_LIMIT. `sin`/`cos` skalieren beide Komponenten gemäß Winkelmodus;
`exp`/`ln` arbeiten unabhängig davon. Nullkomponenten werden nicht pauschal
abgeschnitten. `formatValue` bietet kartesisch `a+bi` und polar `r∠θ`; θ folgt
`angleMode` (Standard rad). Für Null ist der polare Anzeigewinkel 0.

### Konstanten und Namenskollisionen

`constantRegistry` enthält pro ASCII-Namen `name: {de,en}`, `symbol`, `value`
als unveränderten Dezimalstring, `unit`, `source`, `exact` und optional
`uncertainty` sowie `expression` für abgeleitete Werte. Keine Laufzeitrequests.
Quelle: [NIST CODATA 2022, vollständige Tabelle](https://physics.nist.gov/cuu/Constants/Table/allascii.txt),
verifiziert am 2026-10-13. Testdaten speichern die veröffentlichten Werte und
Unsicherheiten unabhängig von der Registry. Mathematische und abgeleitete
irrationale Werte sind gespeicherte Näherungen; `exact` bezeichnet physikalische
Definitionsgenauigkeit, nicht eine endliche Dezimaldarstellung.

| Ausdruckname                    | Symbol            | Herkunft / Entscheidung                               |
| ------------------------------- | ----------------- | ----------------------------------------------------- |
| pi (π), e, phi (φ), tau (τ)     | π, e, φ, τ        | mathematisch, mindestens 50 Stellen                   |
| c, h, qe, kB (k_B), NA (N_A)    | c, h, e, k_B, N_A | SI-exakt, vollständig gespeicherte Dezimalwerte       |
| hbar                            | ħ                 | h/(2π), 50 Stellen, keine abgeschnittene NIST-Ellipse |
| R                               | R                 | NA*kB, vollständiges exaktes Dezimalprodukt           |
| G, gn (g_n), epsilon0, mu0      | G, g_n, ε0, μ0    | NIST 2022, gn konventionell exakt                     |
| me (m_e), mp (m_p), mn (m_n), u | m_e, m_p, m_n, u  | NIST 2022                                             |
| alpha, sigma, Rinf, a0, muB     | α, σ, R∞, a0, μB  | NIST 2022; sigma=2π^5*kB^4/(15*h^3*c^2), 50 Stellen   |

Konstanten und ihre Aliase haben Vorrang vor `ctx.variables`. Konstanten,
eingebaute und kontextregistrierte Funktionen, `i`, `j`, `ans`, `ans1`…`ansN`
(alle Namen mit ans und positiver Ziffernfolge), `__proto__`, `prototype` und
`constructor` dürfen weder zugewiesen noch als Parameter/Binder benutzt werden.
Elementarladung heißt `qe`; `e` bleibt Eulers Zahl. Eigene Funktionen dürfen die
Standardregistry über die bisherige vertrauenswürdige `ctx.functions`-API
überlagern, `sum`/`prod` behalten jedoch ihre Binderbedeutung.

### Environment und Anweisungs-API

`createEnvironment()` liefert ein JSON-serialisierbares Objekt mit `version: 1`,
`variables`, `functions` und `history` (maximal 100 Werte, neuester zuerst).
Zahlen sind Strings, komplexe Komponenten ebenfalls Strings, Listen rekursiv;
Funktionskörper werden als readonly AST gespeichert, Parameter als Namen.
`execute(src, environment?, ctx?)` liefert Result von
`{ value: Value | null, environment: Environment }`; eine Funktionsdefinition
liefert null. Erfolgreiche Ausdrücke/Zuweisungen aktualisieren ans-Historie,
Fehler verändern nichts. Keine Mutation des gelieferten Environments.
`evaluate`/`evaluateString` bleiben reine Ausdrucksauswertung; Anweisungen
liefern dort E_TYPE. Zum sequenziellen Arbeiten die Anweisungs-API verwenden.
`ctx.environment` stellt gespeicherte Variablen/Funktionen/History auch der
Ausdrucks-API bereit. Explizite `ctx.variables` haben vor Environmentvariablen
Vorrang; `ctx.ans` überschreibt `ans`. `ans` und `ans1` sind das letzte Ergebnis,
`ans2` das vorletzte usw.; fehlende Einträge E_UNKNOWN_VARIABLE.

Variablenzuweisung ist sofortige Wertbindung (`a=a+1` liest den bisherigen Wert).
Funktionskörper werden verzögert ausgewertet und lesen aktuelle globale Werte;
Parameter sind lokal. Fehler gespeicherter Funktionskörper zeigen auf den
aktuellen Aufrufbereich, damit Positionen zur aktuellen Eingabe gehören. Globale Funktionen erhalten keine dynamischen Variablen
ihres Aufrufers. Der Funktions-Abhängigkeitsgraph wird bei Definition auf direkte
und indirekte Zyklen geprüft (E_CYCLE), zusätzlich wird Rekursion zur Laufzeit
abgewiesen. Noch undefinierte freie Namen sind zulässig und ergeben erst beim
Aufruf den vorhandenen Unknown-Fehler. Environments enthalten maximal 1000 Variablen/Funktionen zusammen; Parameter
maximal 128 pro Funktion. Listen enthalten insgesamt maximal 2048 Wertknoten
und haben maximale Tiefe 128 (auch bei geteilten Objektgraphen).
Importierte Environments werden validiert
(E_ENVIRONMENT bei ungültiger Version, Namen, Werten oder ASTs).

### Genauigkeitsgarantien und Grenzen

- Decimal-Arithmetik und komplexe Komponenten bleiben bei 50 Stellen. Stark
  schlecht konditionierte Ausdrücke können wie bisher Stellen verlieren.
- Gamma nutzt Rekurrenz, Stirling-Reihe mit rationalen Bernoulli-Koeffizienten
  und Reflexion; Ziel mindestens 15 signifikante Stellen für die geprüften
  endlichen reellen Werte abseits der Pole. Gamma-Eingaben haben Betrag ≤ 1000;
  keine universelle 50-Stellen-Garantie. Referenzen entstehen mit
  unabhängiger Python-Decimal-Arithmetik bei 80 Stellen (geschlossene Formeln), geprüft mit relativer Toleranz 5e−16.
- Integral verwendet adaptive eingebettete Gauß-Kronrod-7/15-Quadratur,
  lokale resasc-Fehlerskalierung und globales Teilen des fehlerreichsten
  Intervalls. `ctx.numerical` erlaubt `absoluteTolerance`, `relativeTolerance`
  (positive Dezimalstrings, Standard 1e−12), `maxIntervals` (1…4096, Standard 256)
  und `maxEvaluations` (15…100000, Standard 10000). Die Schätzung ist keine
  mathematische Garantie für beliebige/oscillierende oder singuläre Funktionen;
  bekannte Integrale werden unabhängig getestet. Keine uneigentlichen Integrale.
- `integrate(callback,a,b,options?)` ist die reine numerische Hilfs-API und liefert
  `{ value, errorEstimate, evaluations, intervals }` als Result. Der Binder gibt
  nur value zurück. Erreicht die Schätzung die Toleranz nicht, E_CONVERGENCE;
  dieselben Diagnosen stehen im optionalen `error.details`. Fehler in Ausdruck
  oder Callback bleiben erhalten. Abtastung und Quadratur verwenden Decimal,
  die Knoten/Gewichte 33 publizierte Dezimalstellen.
- Derivative nutzt symmetrische Differenzen mit halbierten Schrittweiten und
  Richardson-Extrapolation, bis zur Toleranz (Standard 1e−12) oder 12 Stufen.
  Fehlerschätzung aus aufeinanderfolgenden Extrapolanten und links/rechts
  Steigungen erkennt fehlende Konvergenz / Knicke (E_CONVERGENCE). Glattheit
  bleibt Voraussetzung; keine allgemeine Garantie für beliebige ASTs.
- Analysis/Binder teilen einen begrenzten Arbeitszähler (maximal 1000000
  AST-Besuche) und die vorhandene Tiefe 128. Der bisherige Ausdruckszähler
  2048 bleibt für normale Ausdrücke; Binder erhöhen das Laufzeitbudget.
- Ganzzahlverfahren verwenden begrenzte BigInt-Rechnung; Faktorisierung und
  Primprüfung per deterministischer Division ≤ 10^12, maximal 500000 Proben.
  Grenzverletzung E_RESOURCE_LIMIT, ungültiger Bereich E_DOMAIN.

### Export und Verifikation

`toFraction(value,maxDenominator=1000000)` liefert Result von
`{ numerator: string, denominator: string }` mittels Kettenbrüchen einschließlich
begrenzter Zwischenkonvergenten. Nur reelle Zahlen; positiver sicherer ganzzahliger
Nenner ≤ 10^9. Ergebnis ist gekürzt, Nenner positiv, gleich gute Näherungen
bevorzugen den kleineren Nenner. Anzeige-Näherung, keine symbolische Algebra.
`toLatex(ast | value)` liefert einen String, schützt Bezeichner vor LaTeX-Injektion
und erhält die Semantik durch Klammern. Brüche, Potenzen, Wurzeln, Binder,
komplexe Zahlen und Listen erhalten mathematische Notation.

Mindestens 150 zusätzliche Referenzfälle inklusive Gamma, bekannte Integrale,
Richardson-Ableitungen, Statistik und komplexe Identitäten; zusätzlich deterministisches
Fuzzing, Environment-JSON- und Parse-Print-Roundtrips. Eigener Benchmark nach
Warm-up: glattes `integral(x^2,x,0,1)` unter 50 ms pro Aufruf; absolute Werte
sind hardwareabhängig. `npm run check` und Chromium-CI bleiben verbindlich.
Offen: ausschließlich die Modus-UI und deren Fehlerübersetzungen, Graph-Anbindung
und interaktive Darstellung in späteren Paketen.

Numerische Methoden: [NIST DLMF 5.11](https://dlmf.nist.gov/5.11) (Stirling),
[QUADPACK dqk15](https://www.netlib.org/quadpack/dqk15.f) (Knoten, Gewichte und Fehlerskalierung).
Gamma reduziert den Reflexionswinkel vorzeichentreu, damit winzige negative
Argumente nicht auf die volle Periode gerundet werden.
