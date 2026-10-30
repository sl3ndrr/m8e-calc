# Wissenschaftlicher Modus · AP8

Der Modus verwendet AP7s immutable `execute`-API und die AP6-Bausteine
`Keypad`/`KeypadKey`. CodeMirror 6 und KaTeX einschließlich CSS/Fonts sind eigene
lazy Chunks; alle Laufzeitassets werden unter dem Pages-Base-Pfad ausgeliefert.
Engine und AST-Vertrag bleiben unverändert.

## Bedienung und Layout

- Einzeiliger Ausdruckseditor: Enter wertet aus, ↑/↓ navigiert im Verlauf mit
  Rückkehr zum Entwurf, Esc leert, Strg+Leertaste öffnet Vorschläge, Tab übernimmt
  einen Vorschlag. Syntaxfarben und Klammerpaare verwenden Material-Tokens.
  Esc und Enter behalten ihre Rechneraktion auch bei offenen Vorschlägen;
  die Vorschlagsnavigation verwendet weiterhin die CodeMirror-Belegung.
- Die Registry liefert Funktionssignaturen, Konstanten und vollständige de/en
  Kurzbeschreibungen. Fehler unterstreichen den UTF-16-Bereich der Engine; EOF
  bekommt eine Punktmarkierung. Literal-Gradzeichen werden im UI-Adapter für
  DEG/RAD/GRAD konvertiert, Fehlerbereiche auf die Eingabe zurückgeführt.
- Die Vorschau wartet 250 ms, zeigt nur vollständige gültige Ausdrücke und
  verändert weder Environment noch Verlauf. Zuweisungen/Definitionen werden
  erst bei Enter/Auswerten übernommen. Zahlen verwenden den Dezimalpunkt;
  Kommas trennen Argumente, die Anzeige folgt den Einstellungen.
  WP-07 führt Vorschau, Enter/Auswerten und STO in einem lokalen Modulworker
  aus. Während der Arbeit bleiben Editor und Navigation bedienbar. „Leeren“
  wird vorübergehend zu „Abbrechen“ und beendet die Arbeit bei erhaltenem
  Entwurf; Escape leert weiterhin und bricht ebenfalls ab. Der bestehende
  Vorschauplatz meldet Arbeit, Abbruch oder einen kontrollierten Workerfehler
  ohne zusätzliche Animation.
- Ergebnis: Auto/Fest/Wissenschaftlich/Technisch, 1–50 **signifikante** Stellen,
  Bruchnäherung (Nenner ≤ 1.000.000), Text- und LaTeX-Kopie. Der lokalisierte
  Text ist die sichtbare Hauptinformation; KaTeX ergänzt Ausdruck und
  mathematische Darstellung mit MathML. Komplexe Zahlen können aktiviert werden.
- Ab 1920 px erscheinen Editor/Ergebnis, Tastenfeld und Referenzspalte gemeinsam;
  die Shell dockt den Verlauf rechts. Darunter wechseln Tabs die Bedienfelder.
  Das Informatik-Panel wird von AP9 geliefert (siehe unten).
- 2nd wechselt Funktionspaare. Funktionstasten umschließen die Auswahl; bei leerer
  Auswahl steht der Cursor im Argument. Analysis-Vorlagen enthalten Binder und
  Grenzen. Konstanten fügen ASCII-Ausdrucknamen ein (z. B. `qe`, da `e` Euler ist).
- `a = 5`, `f(x) = x^2` definieren Werte/Funktionen. Bearbeiten stellt die
  Definition im Editor wieder her, Löschen entfernt sie. STO speichert `ans` im
  angegebenen Namen, RCL öffnet die Variablen. Definitionen und ans-Historie liegen
  versioniert in `m8e-calc.scientific`. Die Hydrierung validiert die Struktur ohne
  Auswertung; normale Namen wie `shl`/`xor`, Programmer-Funktionskörper, komplexe
  Werte, Listen und die wissenschaftliche ans-Historie bleiben erhalten. Der
  separate globale Verlauf wird dadurch nicht migriert.
- AP4-Verlauf-Payload v1 enthält Originalausdruck sowie Ausdruck-/Ergebnis-LaTeX.
  Wiederherstellung lädt den Ausdruck; sie führt keine Anweisung automatisch aus.

### Wiederherstellung gespeicherter Definitionen · WP-01

Der bestehende Storage-Umschlag Version 1 und ältere Umschläge ohne äußere
Versionsnummer mit Environment-Version 1 bleiben lesbar. Es gibt keine
Formelausführung zur Migration. Ungültiges JSON, unbekannte Versionen,
fehlerhafte Werte/ASTs, Zyklen und überlange Daten sperren automatische
Schreibzugriffe. Der ursprüngliche String bleibt in genau seinem bisherigen
Storage-Schlüssel; keine Rohdatenlogs, zusätzlichen Backups oder Requests.
Der JSON-Umschlag ist vor dem Parsen und vor dem Schreiben auf 16 Mi
UTF-16-Einheiten begrenzt; die fachlichen Ressourcenlimits gelten zusätzlich.
Ein zu großer Altbestand bleibt erhalten und wird als nicht wiederherstellbar
angezeigt, statt gekürzt oder überschrieben zu werden.

Ein de/en-Status erklärt ungültige Daten, fehlenden Lesezugriff oder fehlgeschlagenes
Speichern. Berechnungen und Änderungen funktionieren danach nur in der Sitzung;
Neuladen verliert diese ungespeicherte Sitzung. Verweigerter Lesezugriff sperrt
auch dann Schreibzugriffe, wenn diese separat möglich wären. Bei vollem Storage
bleibt der zuletzt gespeicherte Bestand erhalten; weitere automatische Versuche
bleiben bis zur ausdrücklichen Wiederherstellung gesperrt.

„Gespeicherten Bestand erneut laden“ liest und validiert ausschließlich den
vorhandenen Schlüssel. Bei Erfolg ersetzt er die Sitzung und fokussiert den
Editor, bei erneutem Fehler bleibt auch die Sitzung erhalten. Die Schaltfläche
ist per Tastatur erreichbar; es gibt keine zusätzliche Animation. Solange eine
asynchrone erste Hydrierung aussteht, ist Auswerten gesperrt. Ein Konflikt beim
Wechsel ins Informatikpanel wird als reservierter Name gemeldet; Zurückwechseln
zum Tastenfeld erlaubt die wissenschaftliche Berechnung mit demselben Bestand.

### Verlustfreies Bearbeiten · WP-02

Definitionen verwenden neutrale Deserialisierung statt Namensauswertung.
Die sichtbare Wertanzeige folgt Locale, Gruppierung, Notation und Stellenzahl;
der Bearbeitungstext kommt separat aus `valueSource` mit voller verfügbarer
Decimal-Präzision und Dezimalpunkt. Funktionsquelltext kommt aus dem vorhandenen
AST-Printer. Anzeigen und Öffnen ändern weder Environment noch einen Verlauf.

„Bearbeiten“ lädt diesen kanonischen Text, aktiviert die Variablenansicht und
fokussiert den Editor. Solange der Text unverändert ist und noch der aktuellen
gespeicherten Definition entspricht, bestätigt Enter reelle/komplexe Werte mit
neutraler wissenschaftlicher Wertsemantik (`complex: 'on'`, Bitmodus aus).
Es entsteht wie bei einer Zuweisung ein Ergebnis mit ans-/Verlaufseintrag;
der gespeicherte fachliche Wert bleibt exakt erhalten. Das Bestätigen einer
unveränderten Funktion erhält ihren AST und ihre ans-Historie ohne Ausführung
des Körpers, einschließlich Programmer-Operatoren und erst beim Aufruf
fehlschlagender Körper. Der globale Bedienverlauf erhält den Bestätigungseintrag.
Bei geändertem Text gelten die normalen aktiven Kontext- und Namensprüfungen.
Das Zurücksetzen auf den unveränderten Quelltext bleibt verlustfrei; Leeren,
Verlaufsnavigation und erfolgreiche Übernahme beenden die Bearbeitungssitzung.
Die Wiederherstellungs-/Schreibsperren aus WP-01 bleiben unverändert.

Listen zeigen ihren gespeicherten Inhalt und erlauben weiterhin das Einfügen
des Variablennamens. „Bearbeiten“ ist deaktiviert und erhält eine sichtbare,
zugänglich zugeordnete de/en-Erklärung. Der Einfügename enthält den vollständigen
sichtbaren Definitionstext und die lokalisierte Aktion (Ansatz aus PR #65/WP-04).
Es gibt keine zusätzliche Live-Region für Definitionen oder Bearbeitungsaktionen.

### Ergebnisanzeige und Kopiervertrag · WP-08 / D1

`displayResult(...).text` ist die gemeinsame Quelle für Hauptwert, „Text kopieren“
und Ergebnisansage. `resultLocale` berücksichtigt de/en und Separatoroverride;
Gruppierung, Notation und 1–50 signifikante Stellen folgen unverändert
`formatValue`/`formatNumber`. Kopiert wird der **vollständige angezeigte Text**,
einschließlich Exponent und aller dargestellten Stellen. Das ist kein Export
zusätzlicher, in der Anzeige gerundeter Decimal-Stellen.

Bruchmodus behält die Näherung `Zähler/Nenner` mit vorzeichenbehaftetem Zähler,
positivem Nenner und ASCII-Ganzzahlen ohne Gruppierung. Stellenzahl/Notation
verändern diese Bruchanzeige nicht. Nur reelle Zahlen erhalten Brüche. Komplexe
Werte bleiben kartesisch mit formatierten Komponenten, Listen mit formatierten
Elementen und dem bisherigen Listentrenner `, `. Der Bruchschalter ist für diese
Werte gesperrt. Eine Funktionsdefinition hat keinen Zahlenwert: Die Hauptfläche
meldet lokalisiert „Funktion gespeichert“, beide Ergebniskopien sind deaktiviert.
Vor der ersten Ausführung bleibt das Output leer; der bisherige Leerhinweis
belegt denselben reservierten Werteplatz.

Formel und mathematisches Ergebnis bleiben ergänzend sichtbar. „Mathematische
Darstellung (LaTeX)“ benennt die Ergänzung; kanonische Dezimalpunkte und fehlende
Gruppierung sind dort beabsichtigt. „LaTeX kopieren“ exportiert weiterhin
`Ausdruck-LaTeX = Ergebnis-LaTeX`, im Bruchmodus mit `\\frac`. Dieser andere
Export ist keine lokalisierte Textkopie. Kein Ersetzen von Punkten/Kommas in
Formeln, kein neuer Zahlenformatter und keine Änderung an Parsergrammatik,
AST oder gespeicherten Decimal-Werten. Argumentkommas bleiben im Ausdruck erhalten.

Genau eine persistente höfliche Statusregion bündelt diesen Ergebnisfluss:
Enginefehler mit Position, Workerfehler/Abbruch, ausdrückliche Arbeit, aktuelles
Ergebnis bzw. Vorschau. Die Vorschau erhält den lokalisierten Vorschaupräfix;
die Ergebnisansage enthält exakt den Hauptwert. Die nachlaufende Vorschau des
gerade ausgeführten Ausdrucks verändert die Ergebnisansage nicht nochmals.
Eine abweichende Vorschau desselben Ausdrucks nach einem Kontextwechsel wird
dagegen ausdrücklich als Vorschau angesagt; der letzte übernommene Hauptwert bleibt erhalten.
Sichtbares Output, Vorschau und Fehler behalten ihre Semantik, sind durch
`aria-live="off"` jedoch keine konkurrierenden Ansagequellen. MathML bleibt
außerhalb der Live-Region. Recovery, Formularfehler und Clipboard-Snackbar
behalten ihre getrennten ereignisbezogenen Aufgaben.

Die Hauptanzeige verwendet `type-display-small`, Primary und tabellarische
Ziffern. Vollständiger Text darf ohne Ellipse umbrechen; kein Clipping oder
Animationsviewport begrenzt den Exponenten. Textselektion bleibt möglich,
Kopieraktionen bleiben per Tastatur und mit nativem Fokus erreichbar. Das
statische Output bekommt keinen zusätzlichen Tabstopp. Wertezeile und Mathematik
reservieren Platz für kurze Zustände; längere Inhalte dürfen wachsen. Während
weiterer Arbeit oder Fehlern bleibt das letzte übernommene Ergebnis erhalten;
der bestehende Vorschauplatz zeigt den aktuellen Arbeits-/Fehlerstatus.
Die wissenschaftliche Bühne bleibt auf die Höhe ihres Shell-Containers begrenzt;
längere Inhalte scrollen innerhalb dieser Bühne. Auch mit angedocktem Verlauf
darf die Bühnenbox nicht über den Frame hinauswachsen. Tastaturfokus auf der
Kopieraktion muss sie in den sichtbaren Ausschnitt bringen.

Modell-/Komponententests prüfen bekannte Formate, vollständige Kopien und null
Ansagemutationen beim nachlaufenden Vorschauabschluss. Produktionsfälle ergänzen
de/en, Hell/Dunkel, Overrides, 1280 px, echte Workerabschlüsse/Fehler und nativen
Chromium-Tabzoom 100/200 % über die vorhandene AP19-Erweiterung. Tatsächliche
Ausführungen und offene Bild-/Browserabnahme: [WP08.md](WP08.md).

## Verifikation

### Ausführungsadapter · WP-07

`calculation.worker.ts`, `workerCalculation.ts`, `workerProtocol.ts` und
`calculationExecutor.ts` liegen ausschließlich im wissenschaftlichen Feature.
Die reine Engine einschließlich Verfahren, Toleranzen und Ressourcenlimits
bleibt unverändert. Der Einfachmodus importiert diesen Adapter nicht.
Der Worker entsteht erst bei einem Auftrag und wird nach dessen Abschluss
freigegeben. Es gibt keinen synchronen Rechenfallback, kein SharedArrayBuffer
und keine COOP-/COEP-Voraussetzung.

Protokoll 1 trägt Request-ID, Eingabe-, Ausführungs- und Environmentrevision,
Auftragsart, Originalausdruck, serialisiertes Environment, Winkel-/Komplex-/
Programmeroptionen und gegebenenfalls den WP-02-Bearbeitungsnamen. Ein validiertes
Startsignal bestätigt den Eintritt in den Worker; die abschließende Antwort
enthält serialisierte Werte, Enginefehler mit Originalbereichen oder einen
Adapterfehler. Werte und neue Environments werden neutral mit den bestehenden
Domänenvalidatoren geprüft. Decimal-Instanzen werden nicht übertragen.

Höchstens eine Berechnung läuft. Während Enter/STO läuft, ersetzt jede neue
Vorschau nur den einen vorgemerkten Nachfolger. Neue Enter-/STO-Ausführung
beendet die vorige Arbeit. Überholte laufende Vorschauen werden terminiert;
Abbruch, Leeren, Moduswechsel und relevante Kontext-/Environmentänderungen
entwerten alte Aufträge ebenfalls. Terminierung beendet auch lange synchrone
Workerarbeit tatsächlich. Die UI räumt Debouncetimer, Storeabonnement und
Workerlistener beim Unmount auf. Fehler verwerfen den Nachfolger, ohne
automatische Wiederholungs- oder Neustartschleife.

Eine Vorschau exportiert kein neues Environment und schreibt keinen Verlauf.
Enter arbeitet auf dem beim Auslösen festgehaltenen Snapshot. Neue Texte und
deren Vorschauen ersetzen diese ausdrückliche Absicht nicht. Ein gültiger
Abschluss darf per atomarem `commitIfCurrent` höchstens einmal übernommen
werden; inzwischen bearbeitete Eingaben und ihre Ergebnisfläche werden dabei
nicht überschrieben. Der Verlauf benennt stets den ausgeführten Snapshot.
STO behält seine bisherige Semantik ohne zusätzlichen globalen Verlaufseintrag.
Die transiente Environmentrevision wird nicht persistiert; auch erneutes Laden
identischer gespeicherter Daten entwertet ausstehende Antworten. WP-01s
Schreibsperren und WP-02s verlustfreie Bestätigungen bleiben erhalten.

Die regulären Protokoll-/Adapter-/Store-/UI-Regressionen und
`e2e/scientific-worker.spec.ts` prüfen kontrollierte Antworten, Startsignale,
A → B → A, Optionswechsel, Löschen, doppelte Ausführung, Abbruch und Cleanup.
Der Offlinefall startet aus einem ausschließlich besuchten Einfachmodus.
Tatsächliche Ausführungen und bestehende Abnahmeblocker: [WP07.md](WP07.md).

### Bestehende Prüfungen

Reine Tests für Einfügen/Selektion, Entwurfsnavigation, Gradnormalisierung,
Fehlerpositionen, Vorschau, Formate, Registry und Storage. Komponententests prüfen
Auswertung, Definitionen, Fehler, Vorschau und de/en. Chromium prüft den echten
Editor, DEG `sin(30°) = 0.5`, `a=5; a^2`, Integral `x^2` von 0 bis 3, Fehler,
Verlauf, Selektionen, Completion, lokale Fonts und Zwischenablage.
`e2e/scientific.spec.ts` erzeugt Hell-/Dunkelaufnahmen bei 2560×1440 und
3840×2160 in `test-results/`; CI stellt sie als Playwright-Artefakt bereit.
WP-01 ergänzt strukturelle Enginefälle, echte Store-Neuerzeugung mit fake Storage
sowie de/en-Produktionsbrowserfälle „definieren → reload → weitere Berechnung →
reload“ einschließlich Moduskonflikt und bewahrtem Fehlerbestand. Tatsächlicher
Ausführungsstatus und Einschränkungen: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Offen / Folge-Issues

- AP9 ist integriert: BigInt-Panel und Inspektoren sind unten dokumentiert.
- AP12/AP13 sind integriert; Graph-Verträge stehen in [GRAPH.md](GRAPH.md) und [GRAPH_MODE.md](GRAPH_MODE.md). Gespeicherte wissenschaftliche Environments werden nicht über Permalinks übertragen.
- AP14/AP15 sind integriert: [Komfort](COMFORT.md) und [Hardening](QA_REPORT.md). Weitergehender Import/Export gespeicherter Definitionen bleibt Folgearbeit.

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
