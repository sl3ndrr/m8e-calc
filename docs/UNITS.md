# Einheiten

[Öffentlicher Einstieg](../src/units/index.ts) und [Katalog](../src/units/catalog.ts). Der Katalog enthält 286 Einheiten in 32 Kategorien. Umrechnungen laufen lokal über die jeweilige Kategorie-Basis.

## Definition und Präzision

- Lineare Definitionen verwenden Dezimalstrings für Faktor und gegebenenfalls Divisor. Periodische rationale Faktoren bleiben Brüche, etwa Torr als `101325 / 760` Pa.
- Affine Definitionen addieren den Offset in der Quelleinheit vor der Skalierung. Fahrenheit nach Kelvin verwendet `(F + 459.67) * 5 / 9`. Funktionsdefinitionen bilden etwa den reziproken Verbrauch und irrationale Konstanten ab.
- Die private Decimal-Konfiguration verwendet 80 signifikante Stellen und ROUND_HALF_UP. Die Engine gibt Decimal zurück. Explizite Rundung gehört zur Anzeige. `exact` beschreibt die Definition. Atomare Masseneinheit und ISA-Mach sind Mess- beziehungsweise Modellwerte.
- Temperaturen unter 0 K und nichtpositive Verbrauchswerte sind außerhalb der Domäne. Physikalisch unterschiedliche Dimensionen bleiben getrennt, etwa Gy und Sv oder dynamische und kinematische Viskosität.
- Regionale Volumina haben eigene IDs. Der metrische Cup ist 250 mL. US- und UK-Gallonen sind verschieden. Ein julianisches Jahr zählt 365,25 Tage. Byte entspricht acht bit; SI- und IEC-Präfixe verwenden unterschiedliche Basen.

## Schnittstellen

`convert` und `convertAll` nehmen Decimal-kompatible Werte an. Strings erhalten die eingegebene Dezimalpräzision. `UnitError.code` unterscheidet ungültige Werte, Kategorien, Queries und unbekannte oder mehrdeutige Einheiten. Die UI lokalisiert die Fehler.

`searchUnits` normalisiert Namen und Aliasse. Der Query-Parser bevorzugt die exakte Schreibweise (`mA` gegenüber `MA`). Mehrdeutigkeit ergibt `E_UNIT_AMBIGUOUS`. Die Sprache legt keine regionale Variante fest.

`parseQuery` akzeptiert lokalisierte Dezimalzahlen ohne Gruppierung und lineare zusammengesetzte Angaben. `1 in` ist ein Zoll ohne Ziel, `1 in in cm` und `1 in to cm` ergeben 2,54 cm. Explizite Pfeile haben Vorrang. Ohne Pfeil werden höchstens 32 Worttrennstellen und die vollständige Quelle geprüft. Mehrere gültige Lesarten werden als Mehrdeutigkeit zurückgegeben. Compound-Angaben verwenden das Vorzeichen des ersten Glieds für die Gesamtmenge.

`formatQuantity` formatiert signifikante Stellen. `formatCompound` verlangt unterschiedliche lineare Einheiten derselben Kategorie in absteigender Reihenfolge mit ganzzahligen Radices. Sie rundet vor der Zerlegung. Der Uhrmodus verwendet Stunden, Minuten und Sekunden ohne 24-Stunden-Grenze.

Der Umrechner bewahrt Rohwerte unabhängig von Anzeigepräzision und Gruppierung. Beim Kopieren aus einer fokussierten Auswahl bleibt die normale Textauswahl nutzbar. Verlauf und Permalink speichern fachliche Werte und Einheiten-IDs.

## Katalog pflegen

Eindeutige IDs, deutsche und englische Namen, Aliasse, Genauigkeit und Quelle ergänzen. Referenzwerte sowie Domänen- und Rundungstests pflegen. Kleine Kategorien im Katalog begründen. `npm run test:engine` prüft unabhängige Faktoren und Roundtrips, die Browser-Specs prüfen Parser, Kopieren, Tausch und Layout.

- [BIPM SI Brochure](https://www.bipm.org/en/publications/si-brochure)
- [NIST SP 811](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8) und [NIST Handbook 44](https://www.nist.gov/pml/owm/nist-handbook-44-current-edition)
- [IAU-Resolutionsliste](https://iau.org/Iau/Publications/List-of-Resolutions) und [IAU SOFA](https://www.iausofa.org/s/sofa_ts_f.pdf)
- [NIST CODATA 2022](https://physics.nist.gov/cuu/pdf/all.pdf) und [NIST Binärpräfixe](https://physics.nist.gov/cuu/Units/binary.html)
- [ISO 2533:1975](https://www.iso.org/standard/7472.html) und [NASA SP 367](https://ntrs.nasa.gov/api/citations/19760003955/downloads/19760003955.pdf)
- [FDA Household Measures](https://www.hhs.gov/guidance/document/guidance-industry-guidelines-determining-metric-equivalents-household-measures)
