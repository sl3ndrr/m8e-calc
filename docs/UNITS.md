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
  einen Adapter für bereits beschaffte Daten. Dynamische Umrechnung wirft derzeit
  `E_UNIT_DYNAMIC_RATE`; es gibt keine Währungen oder Kursimplementierung. AP17
  muss Datenschutz, Aktualität und Offline-Verhalten gesondert klären.

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
- [IAU Resolutionen](https://iauarchive.eso.org/administration/resolutions/general_assemblies/)
  und [IAU Measuring the Universe](https://iauarchive.eso.org/public/themes/measuring/):
  au, Parsec, Julianisches Jahr und Lichtjahr aus c × Julianischem Jahr.
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
