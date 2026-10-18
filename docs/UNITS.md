# Einheiten-Engine · AP10

`src/units/index.ts` ist der öffentliche, browserfreie TypeScript-Einstieg. Die
Engine enthält 286 Einheiten in 32 Kategorien. Sie hat keine IO, UI, React,
Store-Abhängigkeit oder Netzwerkabfrage. AP11 bindet die API an den Umrechner an.

## Datenmodell und Genauigkeit

`Category` enthält `id`, lokalisierte `names`, `baseUnitId`, `units` und optional
`minimumBase`, `positiveOnly` sowie `smallCategoryReason`. Eine `Unit` enthält
`id`, `symbol`, `names.de/en`, `aliases`, `system`, `conversion`, `source`, `exact`
und optional `note`. IDs sind global eindeutig; regionale Varianten haben eigene
IDs. Explizite Aliasse dürfen keiner zweiten Einheit gehören. Überlappende
Suchbegriffe werden bei der Auflösung als Mehrdeutigkeit gemeldet.

`Conversion` ist eine diskriminierte Union:

- `linear`: `factor` als Dezimalstring; optional `divisor` als Dezimalstring.
  Basiswert = Wert × Faktor / Divisor. Endliche Dezimalfaktoren sind exakt
  gespeichert; periodische rationale Faktoren werden **nicht** als gerundete
  Dezimalzahl eingetragen (z. B. Torr: `101325 / 760`).
- `affine`: Basiswert = (Wert + `offset`) × Faktor / Divisor. Offset ist in der
  Quelleinheit; Fahrenheit verwendet `(F + 459.67) × 5 / 9`.
- `function`: reine `toBase`/`fromBase`-Funktionen mit Decimal-Argumenten und
  Decimal-Rückgabewerten. Für reziproken Verbrauch und exakte Definitionen mit
  irrationalen Konstanten (Winkel/Parsec/ISA-Mach).
- `dynamicRate`: reservierter `providerId`. `DynamicRateProvider` beschreibt
  einen Adapter für bereits beschaffte Daten. `createUnitsEngine(registry, providers)`
  erhält explizite Provider. Fehlende, nicht endliche oder nicht positive Kurse
  ergeben `E_UNIT_DYNAMIC_RATE`. AP17 liefert Währungen nur im Opt-in-UI;
  die Standard-Engine und der statische Katalog bleiben ohne Währungen.

Jede Umrechnung geht über die Kategorie-Basis. Private decimal.js-Konfiguration:
80 signifikante Stellen, `ROUND_HALF_UP`; globale Decimal-Einstellungen bleiben
unverändert. Es gibt keine zusätzliche Ergebnis-/Zwischenrundung. Divisionen und
irrationale Zahlen unterliegen naturgemäß der endlichen Arbeitspräzision; nur die
Anzeige führt explizite Rundung aus. Strings sind für exakte Eingaben vorzuziehen,
da ein JavaScript-`number` bereits binär gerundet sein kann. Ergebnisse sind Decimal.

`exact: true` bezeichnet eine exakte **Definition**, nicht eine Garantie, dass
irrationale/periodische Ergebnisse endlich darstellbar sind. `u` ist der
CODATA-2022-Messwert `1.66053906892e-27 kg` mit Standardunsicherheit `5.2e-37 kg`.
ISA-Mach ist ein Modellwert für trockene Luft auf Meereshöhe bei 288,15 K:
`sqrt(1.4 × 287.05287 × 288.15) m/s`, ungefähr 340,294 m/s. Beide sind als
`exact: false` markiert. Ein Julianisches Jahr beträgt ausdrücklich 365,25 Tage;
Jahrzehnt/Jahrhundert sind entsprechende Vielfache, keine Kalenderintervalle.

## Definitionen und Dimensionen

- Internationaler Zoll/Fuß/Pfund; Acre = 43560 internationale ft². Die alte
  US-survey-foot-Definition wird nicht mit dem internationalen Acre vermischt.
- US-Volumen sind **liquid customary**: Gallone = 231 in³, Pint = 1/8 Gallone,
  Quart = 1/4, fl oz = 1/128, Cup = 8 fl oz, EL = 1/256, TL = 1/768.
- UK-Gallone = 4,54609 L; Pint = 1/8, Quart = 1/4, fl oz = 1/160 Gallone.
  Erdölbarrel = 42 US-Gallonen. Dry measures und andere Barrelarten sind getrennte
  spätere Datenergänzungen.
- Metrischer Cup ist explizit 250 mL; metrischer EL 15 mL und TL 5 mL. Keine
  Gleichsetzung mit US-Customary-Cup oder 240-mL-Nutrition-Cup.
- `cal`/`kcal` sind thermochemisch (4,184 J), `cal-it` ist IT (4,1868 J),
  `BTU` ist IT (1055,05585262 J). `PS` = 75 kgf·m/s, `hp` = 550 ft·lbf/s;
  elektrische horsepower ist eine eigene Einheit (746 W).
- Torr = atm/760; konventionelles mmHg = 133,322387415 Pa aus
  Quecksilberdichte 13595,1 kg/m³ und Normfallbeschleunigung 9,80665 m/s².
- Datenmenge basiert auf bit: Byte = 8 bit, kB…PB = 1000ⁿ Byte,
  KiB…PiB = 1024ⁿ Byte. Datenrate basiert auf bit/s.
- Aktivität (Bq/Ci), Energiedosis (Gy/rad) und Äquivalentdosis (Sv/rem) sind
  drei Kategorien. Gy↔Sv benötigt physikalische Gewichtung und ist keine
  Einheitenumrechnung. Ebenso getrennt: Energie/Drehmoment sowie dynamische/
  kinematische Viskosität (letztere benötigen für einen Wechsel die Dichte).
- Temperatur ist absolut; Werte unter 0 K sind `E_UNIT_DOMAIN`. Verbrauch ist
  strikt positiv: Null, negative Werte, NaN und Infinity werden abgewiesen.
  Keine stillschweigende Grenzwertfortsetzung der reziproken Abbildungen.

## API

```ts
import {
  convert,
  convertAll,
  searchUnits,
  parseQuery,
  formatQuantity,
  formatCompound,
  categories,
  createUnitsEngine,
} from '../src/units/index.ts';

convert('1', 'in', 'm').toFixed(); // '0.0254'
convert('-40', 'degC', 'degF').toFixed(); // '-40'
convertAll('5', 'L-100km'); // Record<UnitId, Decimal>
searchUnits('Kilometer', 'de'); // readonly Unit[], exakte Treffer zuerst
parseQuery('5 km in mi', 'de'); // { value: Decimal(5), fromId: 'km', toId: 'mi' }
parseQuery('72 °F -> °C', 'en');
parseQuery('3 ft 4 in', 'en'); // { value: Decimal(10/3), fromId: 'ft' }
formatQuantity('1234.567', 'm', { digits: 6, locale: 'de', grouping: true });
// '1.234,57 m'
formatCompound('40', 'in', ['ft', 'in']); // '3 ft 4 in'
formatCompound('3661.5', 's', ['h', 'min', 's'], {
  style: 'clock',
  locale: 'de',
});
// '1:01:01,5'
```

`convert` und `convertAll` akzeptieren `Decimal.Value` (String, Decimal, Number).
Fehler sind `UnitError` mit stabilem `code`: unbekannte/mehrdeutige Einheit,
fremde Kategorie, unzulässiger Wert, ungültige Abfrage/Compound-Ausgabe oder
nicht implementierter dynamischer Kurs. UI-Adapter lokalisieren Fehlercodes.

Suche normalisiert Groß-/Kleinschreibung, Unicode-Diakritika, ß/ss und
Umlaut-Transliteration (ä/ae usw.). `locale` wählt den Namen; Aliasse und Symbole
sind sprachunabhängig. `kilometre` und `kilometer` sind beide eingetragen.
Bei der Parser-Auflösung hat eine **exakte** Schreibweise Vorrang: `mA` und `MA`
bleiben unterscheidbar; `ma` ist mehrdeutig und wirft einen Fehler. Der Parser
wählt keine regionale Gallone/Pint/Cup anhand der Sprache.

Abfragen unterstützen `in`, `to`, `nach`, `->`, `→`, lokalisierte Dezimalzahlen
und wissenschaftliche Exponenten, ohne Gruppierung. Compound-Eingabe ist eine
Summe linearer Einheiten derselben Kategorie; ein negatives erstes Glied setzt
das Vorzeichen der gesamten Menge. Weitere negative Glieder sind verboten.
Ohne explizites Ziel fehlt `toId`. Grenzwert: 4096 Zeichen. Keine allgemeine
Ausdrucksgrammatik oder Kalenderrechnung.

`formatQuantity` delegiert an `src/engine/format.ts`: `digits` sind signifikante
Stellen (1…50, Standard 15), `notation` ist `auto | fixed | sci | eng`;
Locale/Gruppierung folgen dem Engine-Vertrag. Es verändert den Wert nicht.
`formatCompound(value, fromId, unitIds, options)` verlangt linear definierte,
verschiedene Einheiten derselben Kategorie, absteigend mit ganzzahligen Radices.
`digits` bezeichnet hier Nachkommastellen der kleinsten Einheit (0…50, Standard 2).
Rundung erfolgt **vor** der Zerlegung; Überträge wie 59,999 Sekunden werden
korrekt zu einer Minute. `clock` verlangt `['h', 'min', 's']`, padet Minuten und
Sekunden auf zwei Stellen und hat keine 24-Stunden-Grenze. Der gesamte negative
Wert bekommt ein führendes Minus. `separator` ist optional.

## Einheiten hinzufügen

1. In `catalog.ts` eine deklarative Kategorie/Einheit ergänzen, mit eindeutiger ID,
   Symbol, vollständigen Namen, regionalen Aliassen und präziser Quellenangabe.
   `system` ist `si | imperial | us | other`; gemeinsame internationale
   Customary-Einheiten sind hier `imperial`, US-spezifische Maße `us`.
2. Basis auswählen: lineare Identität `factor: '1'`. Alle Faktoren beziehen sich
   auf diese Basis, nicht auf die nächstkleinere Einheit. Definitionen selbst
   nachrechnen: z. B. ft² = `0.3048²`; NIST-Tabellenwerte sind oft gerundet.
3. Exakte endliche Faktoren als String eintragen. Bei periodischen Faktoren
   Zähler/Divisor benutzen, bei Affinität die Offset-Konvention beachten. Funktionen
   brauchen ein inverse Paar und eine dokumentierte Definitionsmenge. `exact`,
   Messunsicherheit und Modellannahmen transparent angeben.
4. Mindestens einen **unabhängigen** Quellenfall in `referenceCases.ts` eintragen;
   keine erwarteten Werte aus dem Katalog erzeugen. Für andere Definitionsmengen
   zusätzliche Randtests ergänzen. Die bestehenden Paartests erfassen neue
   Einheiten/Kategorien automatisch.
5. `npm run check`, anschließend `npm run test:e2e`; eine neue Kategorie mit
   weniger als sechs Einheiten ausdrücklich im PR begründen.

Alternative Kataloge lassen sich mit `createUnitsEngine(registry)` verwenden;
keine Änderung am Konverter/Parser erforderlich. Präfixreihen sind deklarative
Tabellen. Dateneinträge werden beim Erstellen auf eindeutige Kategorien/IDs/Aliasse,
vollständige Metadaten, positive endliche Faktoren/Divisoren und Basisidentität
geprüft. TypeScript-Exports sind readonly.

## Kategorien unter sechs Einheiten

Temperatur hat die vier geforderten gebräuchlichen absoluten Skalen K, °C, °F,
°R. Verbrauch hat L/100 km, mpg US, mpg UK und km/L. Historische Skalen oder
redundante Verbrauchseinheiten werden nicht nur zum Erreichen einer Anzahl ergänzt.
Alle anderen Kategorien haben mindestens sechs Einheiten.

## Quellen und Verifikation

- [BIPM SI Brochure](https://www.bipm.org/en/publications/si-brochure): SI,
  Präfixe, Temperatur und nach 2019 exakte elektrische Naturkonstanten.
- [NIST SP 811 Appendix B.8](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8),
  [B.9](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9),
  [Footnotes](https://www.nist.gov/pml/special-publication-811/nist-guide-si-footnotes):
  Customary-/CGS-Definitionen. Die Tabelle ist überwiegend auf sieben signifikante
  Stellen gerundet; hier werden die exakten Definitionen ausgeschrieben. Acre
  ausdrücklich international, au/eV/u gemäß neueren Quellen statt alten Tabellen.
- [NIST Handbook 44](https://www.nist.gov/pml/owm/nist-handbook-44-current-edition):
  Zoll, Fuß, Pfund und US-liquid-Maße.
- [IAU 2012 Resolution B2](https://iauarchive.eso.org/static/resolutions/IAU2012_English.pdf),
  Seite 3: au = exakt 149597870700 m.
- [IAU 2015 Resolution B2](https://iauarchive.eso.org/static/resolutions/IAU2015_English.pdf),
  Seite 5, Anmerkung 4: Parsec = exakt (648000 / π) au.
- [NASA/JPL Astrodynamic Parameters](https://ssd.jpl.nasa.gov/astro_par.html):
  Julianisches Jahr = 365,25 Tage, Tag = 86400 s und c = 299792458 m/s.
  Daraus folgt für das Lichtjahr c × Julianisches Jahr = 9460730472580800 m.
  Die beiden IAU-Resolutionen und die JPL-Tabelle wurden am 18.10.2026 inhaltlich
  geprüft; sie ersetzen die im CI-Client mit HTTP 400 antwortenden IAU-Übersichtsseiten
  (Issue #51). Die Werte und Rechenregeln bleiben unverändert.
- [NIST CODATA 2022](https://physics.nist.gov/cuu/pdf/all.pdf): atomare Masseneinheit.
- [NIST binary prefixes](https://physics.nist.gov/cuu/Units/binary.html): IEC-Binärpräfixe.
- [ISO 2533:1975](https://www.iso.org/standard/7472.html): ISA-Modell und
  [NASA SP 367](https://ntrs.nasa.gov/api/citations/19760003955/downloads/19760003955.pdf)
  als unabhängige Kontrolle des gerundeten Meereshöhenwerts 340,294 m/s.
- [FDA Household Measures](https://www.hhs.gov/guidance/document/guidance-industry-guidelines-determining-metric-equivalents-household-measures):
  ausdrücklich definierte metrische 15-/5-mL-Löffel.

274 statische, unabhängig eingetragene Referenzfälle decken SI/Customary/CGS,
Dezimal-/Binärdaten, Temperaturränder und Verbrauch ab. Periodische Referenzwerte
werden mit relativer/absoluter Toleranz `1e-45` geprüft. fast-check prüft **jedes
geordnete Paar** jeder Kategorie (3278 Paare) über zwölf erzeugte Dezimalwerte mit
verschiedenen Magnituden und zulässigen Vorzeichen, einschließlich Basiskonsistenz;
Toleranz `1e-65 × (|Wert| + 1)`. Zusätzliche Tests prüfen Dateneintragung,
Global-Decimal-Isolation, Dimensionsgrenzen, Mehrdeutigkeit, lokalisierte Eingaben,
Compound-Überträge und Formatierung. Sie laufen im Vitest-Node-Projekt der Engine
ohne DOM und UI-Testsetup.

## AP17 · Optionale Währungsumrechnung

### Quelle und Prüfung (14. Oktober 2026)

- Aktueller Endpunkt: `https://api.frankfurter.dev/v2/providers/ecb/rates?base=EUR`.
  [Frankfurter v2](https://frankfurter.dev/) und die
  [OpenAPI](https://api.frankfurter.dev/v2/openapi.json)
  dokumentieren ein Array `{ date, base, quote, rate }`. Der allgemeine
  `/v2/rates`-Endpunkt mischt Quellen; deshalb wird ausschließlich der explizite
  EZB-Provider genutzt. v1 ist veraltet. Kein API-Key erforderlich.
- CORS: Die [JavaScript-Dokumentation](https://frankfurter.dev/javascript/)
  bestätigt offene Browserzugriffe. Der [Servercode](https://github.com/lineofflight/frankfurter/blob/main/lib/app.rb)
  erlaubt `origins "*"` sowie GET/OPTIONS ohne Credentials.
- Verfügbarkeit: Website und aktuelle Dokumentation waren erreichbar. Die
  direkte API-Probe aus der Entwicklungsumgebung wurde am 14.10.2026 durch die
  Netzwerk-Allowlist mit HTTP 403 „Forbidden. Calls to this URL are not allowed.“
  blockiert; auch der alternative Web-Lesezugang konnte den API-Host nicht
  erreichen. Das ist **kein nachgewiesener Ausfall von Frankfurter**. Die
  Header-Prüfung auf der öffentlichen Instanz war vor der Umsetzung deshalb
  nicht möglich. Die nachfolgende [CI-Liveprobe](https://github.com/sl3ndrr/m8e-calc/actions/runs/38603291035/job/115987658993)
  war am **14.10.2026 um 17:03:01 UTC erfolgreich**: HTTP 200,
  `Access-Control-Allow-Origin: *`, 30 Währungen einschließlich EUR,
  einheitliches Kursdatum `2026-10-14`. Damit ist die Quelle auch live als
  verfügbar und CORS-kompatibel geprüft. `node scripts/check-currency-source.mjs` prüft HTTP-Status,
  tatsächliche CORS-Header und Antwortschema separat in CI; das Ergebnis wird
  im PR festgehalten. Mock-Tests sind kein Beleg für Live-Verfügbarkeit.
- Die [aktuelle EZB-Tabelle](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html)
  umfasst 29 Fremdwährungen plus EUR (30 Einträge). BGN entfiel am 02.01.2026,
  RUB ist seit März 2022 ausgesetzt. Diese beiden werden nicht angezeigt.
  Kurse werden an EZB-Arbeitstagen ungefähr um 16 Uhr MEZ veröffentlicht.
- Bewertung: Die ausdrücklich gewählte EZB-Quelle passt nach Dokumentation,
  Schema und CORS-Vertrag. Sollte die Liveprobe Verfügbarkeit/CORS widerlegen,
  ist ein selbst gehosteter Frankfurter-EZB-Adapter unter eigener Origin die
  bevorzugte Alternative. Er benötigt gesondertes Hosting; kein stiller
  Wechsel auf Frankfurters gemischten Feed oder einen anderen Dienst.

### Zustimmung, Datenschutz und CSP

`onlineRates` ist in Settings-Version 4 standardmäßig `false`; Versionen 0–3
migrieren ohne Zustimmung. Persistierte Zustimmung aus Version 4 gilt weiter.
Der sichtbare Schalter „Online-Kurse laden“ erklärt EZB/Frankfurter, Übertragung
von IP-Adresse/Verbindungsdaten, rein lokale Beträge und Speicherung der Kurse.
Settings-Import erteilt keine Zustimmung und erhält höchstens eine bereits
aktive Zustimmung. Alles-Zurücksetzen schaltet die Funktion aus.

Ohne Zustimmung existiert keine Währungskategorie, auch nicht bei vorhandenem
Kurscache. Selbst manuelle Provider-Aufrufe prüfen Zustimmung vor jeder IO.
Aktivierung im Umrechner lädt einen vollständigen Snapshot; Eingabe,
Währungswechsel und Swap rechnen ausschließlich lokal. Deaktivierung bricht
laufende Requests ab und verwirft verspätete Antworten. Der Cache bleibt lokal
für eine spätere ausdrücklich aktivierte Sitzung erhalten.

Die Produktions-CSP erlaubt zusätzlich zu `self` nur
`https://api.frankfurter.dev/v2/providers/ecb/rates` in `connect-src`, also Host
**und Pfad**, ohne Wildcards oder weitere API-Routen. Eine statische CSP kann
nicht den Zweck eines Requests prüfen oder nachträglich gelockert werden;
das Opt-in erzwingt der einzige Request-Adapter. Er nutzt `credentials: omit`,
`referrerPolicy: no-referrer`, CORS und `redirect: error`. Kein Betrag, keine
Berechnung und kein Verlauf steht im Request. Der Service Worker ignoriert
fremde Origins; Kurse gelangen nicht in den PWA-Assetcache.

### Cache und Fehler

`m8e-calc.currency-rates` enthält `{ version: 1, source: 'ecb-frankfurter', date,
fetchedAt, rates }`; Kurse sind Dezimalstrings in Einheiten je EUR. `date` ist
das Kursdatum, `fetchedAt` der UTC-Abrufzeitpunkt als Epoch-Millisekunden.
Automatisch wird höchstens alle vier Stunden aktualisiert, auch nach Fehlern;
frischer Cache vermeidet Requests beim Remount/Reload. Der letzte Request-Versuch
wird zusätzlich in `m8e-calc.currency-rates.last-attempt` gespeichert; dadurch
bleibt die automatische Fehler-Drosselung auch nach Reload wirksam. Ein Button aktualisiert
explizit. Gleichzeitige Ladeversuche teilen denselben Request. Es gibt keine
automatischen Wiederholungen pro Fehler und keine Requests im Hintergrund,
wenn der Umrechner nicht aktiv ist.

Timeout: zehn Sekunden. HTTP-/Schemafehler, Netzfehler, Timeout und Offline
werden lokalisiert als Snackbar gemeldet. Ein validierter letzter Snapshot
bleibt nutzbar; ohne Snapshot wird ein Leerzustand angezeigt. Der Ladezustand
nutzt `LoadingIndicator`, ohne vorhandene Kurse zu löschen. Beschädigter,
unvollständiger oder fremder Cache wird verworfen. Verweigerter/voller Storage
verhindert weder Laden noch Umrechnung im Arbeitsspeicher.

„Stand: Datum“ zeigt stets das **Kursdatum**, keine scheinbare Aktualität durch
frisches Herunterladen. „veraltet“ erscheint ab 48 Stunden nach 00:00 UTC dieses
Datums (konservativ, weil das API-Datum keine Publikationsuhrzeit enthält).
Auch ein frisch geholter Wochenend-/Feiertagskurs kann daher veraltet sein.
Offline/fehlgeschlagene Aktualisierung nennt ausdrücklich den gespeicherten
Stand. Die Altersanzeige wird jede Minute aktualisiert.

### Umrechnung und Oberfläche

Der AP10-Provider liefert EUR pro Einheit als Decimal; API-Kurse sind dagegen
Einheiten pro EUR. Der private 80-Stellen-Kontext invertiert die Dezimalstrings;
Umrechnung geht über EUR und rundet keine Zwischenwerte explizit. Rundung
findet nur in `formatQuantity` für die Anzeige statt; Swap behält den kompletten
Decimal-String. `number`-Kurse aus der JSON-Antwort werden unmittelbar mit
`String(rate)` übernommen, ohne binäre Rechenoperationen; der EZB-Feed hat
wenige veröffentlichte Dezimalstellen. Es wird keine höhere Quellengenauigkeit
behauptet. Globale decimal.js-Einstellungen bleiben unverändert.

30 Währungen werden mit ISO-Code, Symbol aus `Intl.NumberFormat` und Namen aus
`Intl.DisplayNames` für de/en angezeigt. Keine Flaggen. Suchbare Picker,
Kursquelle/-datum, LoadingIndicator, manuelle Aktualisierung und sämtliche
Ergebnisse sind über bestehende UI-Bausteine bedienbar. Hinweis:
„Keine Anlageberatung, Kurse unverbindlich“. Währungswerte werden in diesem
Paket nicht in Favoriten, Permalinks oder den persistenten Verlauf übernommen:
ein späteres Restore bräuchte einen versionierten Kurs-Snapshot.

### Verifikation

`src/units/currency.test.ts` prüft unabhängige Dezimal-/Crossrate-Fälle,
Vorzeichen/Null, Anzeige ohne Wertmutation, fehlende/ungültige Provider und
Decimal-Isolation. `rates.test.ts` mockt Erfolg, Netz-/API-/Schemafehler,
Timeout, Offline und veraltete Daten; zusätzlich Cache-Versionen, Quellen,
Zeitstempel, Storage-Ausfälle, Vierstundenintervall, manuelle Aktualisierung,
Request-Deduplizierung und Zustimmungsentzug mit verspäteter Antwort.
Settings-/Importtests verhindern versehentliche Zustimmung durch Migration
oder Import. `e2e/currency.spec.ts` fängt alle API-Requests ab: Opt-in aus =
keine externen Requests, Opt-in an ohne Cache = exakt ein Request; Eingabe,
Währungswechsel, Swap und Reload mit frischem Cache erzeugen keine weiteren.
Zusätzlich LoadingIndicator, Snackbar, manueller Request, Offline-/Altersanzeige,
Axe-Prüfung und Screenshots in Hell/Dunkel. Standard-Smoke bleibt ohne Opt-in
frei von externen Requests. Die Liveprobe ist ein eigener Tooling-Check.
