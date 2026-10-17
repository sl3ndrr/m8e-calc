# m8e-calc 1.0.0 · Release-Notes-Entwurf

**Status:** vorbereitet, noch nicht veröffentlicht. Vor Tag/Release MIT-Vorschlag
bestätigen, PR-Checks und Pages-Abnahme abschließen; siehe [RELEASE.md](RELEASE.md).

m8e-calc bringt vier Taschenrechner-Arbeitsflächen in den Desktop-Browser:

- **Einfach:** schnelle Alltagsrechnungen mit Tastatur und Speicher.
- **Wissenschaftlich:** Ausdruckseditor, Konstanten, komplexe Zahlen, Variablen,
  eigene Funktionen und numerische Analysis; Informatik mit BigInt, Bitraster,
  Zahlbasen, IEEE-754 und Unicode.
- **Umrechner:** 286 Einheiten in 32 Kategorien, Favoriten und Schnelleingabe.
- **Graphen:** explizite, parametrische und polare Kurven mit Parametern,
  Trace/Analysis, Wertetabellen und PNG-Export.

Dazu kommen lokaler Verlauf, Befehlspalette, Permalinks, Präsentation,
Deutsch/Englisch, Hell/Dunkel und frei wählbare Akzente. Nach vollständigem
Erstladen funktionieren alle Modi offline. Keine Tracker; Berechnungen bleiben im Browser. Nur nach ausdrücklichem
Opt-in lädt der Umrechner EZB-Referenzkurse über Frankfurter. Ohne Zustimmung
entstehen keine Währungsrequests.

[App öffnen](https://sl3ndrr.github.io/m8e-calc/) ·
[Bedienung und Entwicklung](../README.md) · [Changelog](../CHANGELOG.md)

## Qualität und Grenzen

AP15 enthält automatisierte Prüfungen für Chromium, Firefox und WebKit,
Barrierefreiheit, Kontraste, Performance und Screenshot-Regressionen.
Messungen sind mit ihrem geprüften Code-Stand im [QA-Bericht](QA_REPORT.md)
dokumentiert. AP18–AP24 sind integriert; die aktuelle Produktabnahme und ihre
Live-Grenzen stehen in [AP25.md](AP25.md). Der Merge der Releasevorbereitung
#21 erteilt keine Lizenz-, Tag- oder Releasefreigabe.

Numerische Analysis ist näherungsweise. Implizite Kurven (#17), Touch-Pinch,
physischer Screenreader, manuell bedienter Browser-Menüzoom und physische GPU-/Langzeitabnahmen
bleiben offen. Optionale Währungen (AP17) sind integriert und standardmäßig deaktiviert. Die Release-Vorbereitung
selbst ergänzt keine Produktfunktion.

## Lizenz

MIT ist vorgeschlagen. **Der Repository-Eigentümer muss den LICENSE-Entwurf vor
Veröffentlichung ausdrücklich bestätigen oder eine andere Lizenz wählen.**
Bibliotheken und Fonts behalten ihre jeweiligen Lizenzen.

## English

The first prepared release includes simple and scientific calculation,
programmer tools, unit conversion and interactive 2D graphs. It runs locally
in your browser, supports German/English and offline use, and contains no
trackers. Optional ECB reference rates require explicit consent; without opt-in
there are no currency requests. This is a draft; publication and the
proposed MIT license still require the owner's confirmation.
