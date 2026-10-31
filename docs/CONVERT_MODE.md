# Umrechner · AP11

`src/features/convert` bindet ausschließlich den öffentlichen AP10-Einstieg
`src/units` an die Oberfläche an. `model.ts` enthält den reinen Reducer,
Eingabeadapter, Sortierung und Verlaufspolitik; `ConvertMode.tsx` übernimmt
Rendering, Tastatur, Zwischenablage und den abbrechbaren 1500-ms-Timer.

Die Kategorieauswahl ist ein durchsuchbares Kartenraster mit Pfeil-, Home- und
End-Navigation. Die Hauptfläche wechselt mit einer Shared-Axis-Animation.
Container Queries verteilen Kategorien, zwei Zahlenfelder und alle Einheiten
auf drei Spalten mit eigenen Scrollflächen; mit geöffnetem Verlauf oder weniger Platz stehen die
Ergebniskarten unter der Mitte. Die vorhandene Shell skaliert rem auf Full HD
und 4K; schmale Ansichten stapeln Felder. Zahlenübergänge verwenden den
AP2-Effects-Spring; Swap verwendet die gemeinsame AP42-Buttonoberfläche.
Reduzierte/ausgeschaltete Bewegung unterbindet räumliche Animationen.

WP-09 reserviert Swap eine eigene Gridspalte. Bei einer Panelbreite bis 36 rem
stehen Quellfeld, Swap und Zielfeld in drei eigenen Zeilen. Maßgeblich ist die
Breite des jeweiligen Panels, auch im Währungspfad. Keine absolute Überlagerung,
zusätzliche Rotation oder Radiusinterpolation beim Drücken.

Von und Nach sind editierbare lokalisierte Textfelder. Nach-Eingaben rechnen
invers in die Quelle zurück; native Bearbeitung und Strg+V bleiben verfügbar.
Ungültige Entwürfe bleiben sichtbar und blenden Ergebnisse aus. Konvertierung,
Tausch, Wiederherstellung und Schnelleingabe verwenden Decimal-Strings; die
Anzeigepräzision verändert keine gespeicherten Werte. Die zusätzliche Live-
Anzeige animiert nur die visuelle Darstellung und liefert Assistenztechnik
das endgültige Ergebnis. Sehr große Werte erscheinen direkt.

Die durchsuchbaren Einheitenauswahlen gruppieren Favoriten, zuletzt verwendete
Einheiten und dann SI, Imperial, US Customary und weitere Systeme. Gruppierte
Optionen und Überschriften sind Teil der zugänglichen Select-Komponente.
Die Kopieraktion einer Einheitenkarte kopiert den formatierten Wert inklusive Symbol. Die Ziel-
Einheit wird hervorgehoben. Sortierung nach Größe nutzt AP10-Basiswerte für
jeweils eine Einheit; funktionale/affine Definitionen werden genauso ausgewertet.

Die Kopieraktion erhält ihren zugänglichen Namen aus dem gesamten sichtbaren
Karteninhalt (Einheitenname, aktueller Wert, Symbol und System), ergänzt um die
lokalisierte Aktion. Währungskarten schließen Code, Name, Zahl und Symbol ein.
Kein pauschales `aria-label` verdeckt diese Inhalte und keine zusätzliche
Live-Region wiederholt sie. WP-09 verknüpft die sichtbaren Kartenbestandteile
und den lokalisierten Aktionstext über `aria-labelledby` mit dem getrennten
Kopierbutton. Der Zahlenbereich ist dessen Geschwister, kein interaktives Kind.
WP-04-Nachweise und offene Abnahme: [WP04](WP04.md).

Vorzeichen, Mantisse und Exponent bleiben eine ungetrennte Zeile. Das Einheiten-
raster verwendet mindestens 16 rem pro Karte, begrenzt durch die verfügbare
Breite. Lange Namen dürfen umbrechen; lange Zahlen scrollen innerhalb eines
benannten, fokussierbaren Bereichs. Pfeile scrollen nativ, Home/End erreichen
Anfang/Ende horizontal; modifizierte Tastenkombinationen bleiben nativ.
Dies gilt auch für Hauptwert und Währungskarten/-ergebnis. Tab führt separat
zum Kopierbutton. Fokus liegt mit Tintenreserve innerhalb des Scrollbereichs,
Forced Colors verwendet Highlight. Anzeigepräzision, vollständige formatierte
Kopierquelle und gespeicherter Decimal-Wert bleiben erhalten; kein Ellipsis,
Abschneiden, zusätzlicher Formatierrundungsschritt oder zweiter Ansagekanal.
Aktuelle lokale Prüfgrenzen und fehlende Bild-/Kollisionsabnahme: [WP09](WP09.md).

Favoriten-/zuletzt verwendete Paare verwenden dieselbe vollständige sichtbare
Zeichenfolge wie `km → m` als Namenspräfix, ergänzt um die lokalisierte Ladeaktion
mit Kategorie. Sichtbarer Text und Namenspräfix kommen aus einer gemeinsamen Quelle.

Schnelleingabe: `/` fokussiert; Enter übernimmt z. B. `5 km in mi`,
`72 °F -> °C` oder `3 ft 4 in`. Ohne Ziel bleibt das Ziel derselben Kategorie
erhalten, andernfalls wird die Kategorie-Basis gewählt. Dezimalzeichen folgt
den Zahleneinstellungen. AP10-Abfragen akzeptieren keine Tausendergruppierung.
Ziffern außerhalb von Eingabefeldern fokussieren Von und beginnen eine Eingabe;
Strg+Umschalt+S tauscht außerhalb der Eingabefelder (zentrale AP14-Registry). Overlays und fremde
Editoren erhalten ihre Tastaturbedienung. Strg+H und die Shell-Aktion steuern
den AP4-Verlauf.

Zollquellen funktionieren auch mit Worttrennern, etwa `1 in to cm`, `1 in in cm`
und `3 ft 4 in to cm`. Es gelten die begrenzte Kandidatenprüfung und die
Mehrdeutigkeitsregeln aus [UNITS.md](UNITS.md). Bei mehrdeutiger Eingabe erklärt
die lokalisierte Feldmeldung eindeutige Einheiten und den Pfeil als Trenner.
Fehler übernehmen weder Menge noch Paar; der Fokus bleibt in der Schnelleingabe.
Erfolgreiche Übernahme fokussiert wie bisher das Von-Feld. Ohne Ziel gilt weiter
die oben beschriebene Zielwahl des Reducers.

`m8e-calc.convert`, Version 1, speichert validierte Favoritenpaare (max. 100),
zuletzt verwendete Paare (max. 12), signifikante Stellen (1–50), Notation,
Sortierung und Compound-Option. Fremde Kategorien/Einheiten und zukünftige
Storage-Versionen werden verworfen; verweigerter Storage blockiert die UI
nicht. Mehrteilige Ausgabe verwendet AP10 für ft + in und h:min:s.
Julianische Jahre/Lichtjahre und ISA-Mach zeigen lokalisierte Modellhinweise.

## Verlauf

Nur eine geänderte, gültige, von Null verschiedene Eingabe erzeugt nach 1,5 s
Ruhe einen Eintrag. Weitere Werte des zuletzt verwendeten Paars ersetzen
seinen Eintrag atomar, einschließlich Aktualisierung der Zeit, unter Erhalt
von ID und Pin. Ein Paarwechsel erzeugt einen neuen Eintrag. Der AP4-Store
stellt dafür `replace(id, data)` bereit; Versionsformat und Export bleiben
erhalten. Wiederherstellung validiert Kategorie, Paar und Wert; sie erzeugt
keinen neuen Eintrag. Timer werden beim Unmount und bei Eingabeänderungen
abgebrochen. Anzeigepräferenzen erzeugen keine neuen Verlaufseinträge.

## Verifikation

Vitest prüft Reducer, Lokalisation, exakte Rückrichtung, Query-/Domainfehler,
Sortierung, Compound, Restore, Verlaufspolitik und Persistenz. Komponententests
prüfen Zahlenfelder, Tausch, Query, Suche und den abbrechbaren Ruhe-Timer.
Playwright prüft Konvertierung, native Zwischenablage, Tastatur, Query,
Einheitensuche, Verlauf/Restore/Persistenz, Reduced Motion und Axe.
`e2e/convert.spec.ts` schreibt Screenshots bei 1920×1080 und 3840×2160 nach
`test-results/`; der bestehende CI-Workflow veröffentlicht sie im Artefakt
`playwright-results`. Aktuelle, visuell geprüfte Release-Bilder bei 2560×1440 stehen in
[Hell](img/convert-light.png) und [Dunkel](img/convert-dark.png);
`npm run screenshots` erzeugt sie erneut.

## Offen / Folge-Issues

AP17 ergänzt die separate optionale Währungskategorie über explizite DynamicRateProvider; Details in `UNITS.md`. Browserabnahme außerhalb
Chromium folgt der Roadmap. Globale UI-Skalierung ist in AP14 umgesetzt. Die Sortierung nach
Größe bezeichnet Definitionsgröße (Basiswert von 1), keine Rangfolge aktuell
angezeigter Zahlen bei negativen oder reziproken Werten.
