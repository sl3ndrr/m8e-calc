# Wissenschaftlicher Modus · AP8

Der Modus verwendet AP7s immutable `execute`-API und die AP6-Bausteine
`Keypad`/`KeypadKey`. CodeMirror 6 und KaTeX einschließlich CSS/Fonts sind eigene
lazy Chunks; alle Laufzeitassets werden unter dem Pages-Base-Pfad ausgeliefert.
Engine und AST-Vertrag bleiben unverändert.

## Bedienung und Layout

- Einzeiliger Ausdruckseditor: Enter wertet aus, ↑/↓ navigiert im Verlauf mit
  Rückkehr zum Entwurf, Esc leert, Strg+Leertaste öffnet Vorschläge, Tab übernimmt
  einen Vorschlag. Syntaxfarben und Klammerpaare verwenden Material-Tokens.
- Die Registry liefert Funktionssignaturen, Konstanten und vollständige de/en
  Kurzbeschreibungen. Fehler unterstreichen den UTF-16-Bereich der Engine; EOF
  bekommt eine Punktmarkierung. Literal-Gradzeichen werden im UI-Adapter für
  DEG/RAD/GRAD konvertiert, Fehlerbereiche auf die Eingabe zurückgeführt.
- Die Vorschau wartet 250 ms, zeigt nur vollständige gültige Ausdrücke und
  verändert weder Environment noch Verlauf. Zuweisungen/Definitionen werden
  erst bei Enter/Auswerten übernommen. Zahlen verwenden den Dezimalpunkt;
  Kommas trennen Argumente, die Anzeige folgt den Einstellungen.
- Ergebnis: Auto/Fest/Wissenschaftlich/Technisch, 1–50 **signifikante** Stellen,
  Bruchnäherung (Nenner ≤ 1.000.000), Text- und LaTeX-Kopie. KaTeX zeigt Ausdruck
  und formatiertes Ergebnis mit MathML. Komplexe Zahlen können aktiviert werden.
- Ab 1920 px erscheinen Editor/Ergebnis, Tastenfeld und Referenzspalte gemeinsam;
  die Shell dockt den Verlauf rechts. Darunter wechseln Tabs die Bedienfelder.
  Das Informatik-Panel wird von AP9 geliefert (siehe unten).
- 2nd wechselt Funktionspaare. Funktionstasten umschließen die Auswahl; bei leerer
  Auswahl steht der Cursor im Argument. Analysis-Vorlagen enthalten Binder und
  Grenzen. Konstanten fügen ASCII-Ausdrucknamen ein (z. B. `qe`, da `e` Euler ist).
- `a = 5`, `f(x) = x^2` definieren Werte/Funktionen. Bearbeiten stellt die
  Definition im Editor wieder her, Löschen entfernt sie. STO speichert `ans` im
  angegebenen Namen, RCL öffnet die Variablen. Definitionen und ans-Historie liegen
  versioniert in `m8e-calc.scientific`; ungültige Daten werden verworfen, blockierter
  Storage lässt die Sitzung im Speicher funktionieren.
- AP4-Verlauf-Payload v1 enthält Originalausdruck sowie Ausdruck-/Ergebnis-LaTeX.
  Wiederherstellung lädt den Ausdruck; sie führt keine Anweisung automatisch aus.

## Verifikation

Reine Tests für Einfügen/Selektion, Entwurfsnavigation, Gradnormalisierung,
Fehlerpositionen, Vorschau, Formate, Registry und Storage. Komponententests prüfen
Auswertung, Definitionen, Fehler, Vorschau und de/en. Chromium prüft den echten
Editor, DEG `sin(30°) = 0.5`, `a=5; a^2`, Integral `x^2` von 0 bis 3, Fehler,
Verlauf, Selektionen, Completion, lokale Fonts und Zwischenablage.
`e2e/scientific.spec.ts` erzeugt Hell-/Dunkelaufnahmen bei 2560×1440 und
3840×2160 in `test-results/`; CI stellt sie als Playwright-Artefakt bereit.

## Offen / Folge-Issues

- AP9: BigInt-Panel und Inspektoren sind unten dokumentiert.
- AP12/AP13: Graph-Anbindung der vorhandenen Engine-Definitionen.
- AP14/AP15: Komfort/Import-Export der Definitionen und zusätzliches Hardening.

## Informatik · AP9

Informatik aktiviert den Bitparser im vorhandenen Editor. Alle Wortoperationen,
Basis-Eingaben und Bitgesten werden über denselben Engine-/Verlaufspfad berechnet.
Verlaufseinträge speichern Wortbreite, signed/unsigned und Überlauf; Wiederherstellen
öffnet den Informatik-Kontext mit diesen Optionen. Ein Drag schreibt einen Eintrag
am Ende, Tastatur-Space und Enter kippen ein fokussiertes Bit. Fehler ändern den
Wortwert nicht. Wortbreitenwechsel respektiert die Überlaufoption; signed-Wechsel
interpretiert das vorhandene Bitmuster neu. Das Raster zeigt 16 Bits pro Reihe.
Bei großen Monitoren nutzt Informatik die gesamte Werkzeugspalte.

Die vier Basiszeilen sind unabhängig editierbar (Enter oder Übernehmen) und kopierbar.
Die zusätzliche Basiszeile akzeptiert 2…36; Binär und Hex unterstützen Nibble-/Byte-Gruppen.
Nichtdezimal-Eingaben sind Bitmuster, Dezimal-Eingaben Zahlenwerte. Ein zweiter Operand
kann ein Editor-Ausdruck sein. >> folgt signed/unsigned; LSR und ASR sind explizit.

IEEE-754 hat einen eigenen 32-/64-Bit-Kontext. Zahleneingabe, Hex-Bits, rohe Felder
und Bitraster sind editierbar; Farben trennen Vorzeichen, Exponent und Mantisse.
Das genaue Dezimalergebnis (bis 1074 Nachkommastellen) wird aus den Bits gebildet
und ist separat kopierbar. NaN-Payloads bleiben bei Bit-/Feldänderungen erhalten.
Unicode konvertiert einen Skalar oder dezimalen/hexadezimalen Codepoint in Zeichen
und UTF-8-Bytes. Die beiden Inspektoren führen keine Integer-Berechnung aus.

Prüfungen: 285 tabellengesteuerte Kernfälle, Komponenten-/Modellprüfungen, Chromium
für Hex-Eingabe, 64-Bit-Grenze, Bit-Klick/Drag/Space, Kontext-Verlauf, IEEE und Unicode,
axe sowie Hell-/Dunkel-Aufnahmen bei Full HD und 4K. Vertrag in ENGINE.md.
