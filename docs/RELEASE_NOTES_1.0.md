# m8e-calc 1.0.0 · Release-Notes-Entwurf

Aktueller Prüfstand und verbleibende Eigentümerentscheidungen: [AP38](AP38.md).

**Status:** vorbereitet, noch nicht veröffentlicht. Vor Tag/Release MIT-Vorschlag
bestätigen, PR-Checks und Pages-Abnahme abschließen; siehe [RELEASE.md](RELEASE.md).

m8e-calc bringt vier Taschenrechner-Arbeitsflächen in den Desktop-Browser:

- **Einfach:** schnelle Alltagsrechnungen mit Tastatur und Speicher.
- **Wissenschaftlich:** Ausdruckseditor, Konstanten, komplexe Zahlen, Variablen,
  eigene Funktionen und numerische Analysis; Informatik mit BigInt, Bitraster,
  Zahlbasen, IEEE-754 und Unicode.
- **Umrechner:** 286 Einheiten in 32 Kategorien, Favoriten und Schnelleingabe.
- **Graphen:** explizite, parametrische, polare und implizite Konturen mit
  Parametern, Pan/Zoom und PNG-Export; Trace/Analysis und Wertetabellen für
  unterstützte 1D-Kurven. Implizite Analysis, Trace und mehrwertige Tabellen
  sind bewusst gesperrt. Implizites Fit verwendet die stabile AP21-Abtastbasis
  als begrenzte Ansicht; keine universelle Vollständigkeits-/Topologiegarantie.

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
dokumentiert. Die historischen AP25-/AP27-Nachweise bleiben mit ihren SHAs
erhalten. AP28 reduziert Drag-Samplinglast, AP29 sichert passive Buildnachweise
unter aktivem Worker, AP30 entlastet den Startpfad. AP31 verbindet CI und Pages;
AP32 aktiviert den PR-Schutz (Dependabot-Restprüfung offen). AP33 dokumentiert
Dependency-Entscheidungen und korrigiert Quellen-/Animationsmessungen; AP37
verbessert Quellenfehlerdiagnosen. Integration, tatsächliche Läufe und
Live-Grenzen: [AP38](AP38.md). Der Merge der Releasevorbereitung
#21 erteilt keine Lizenz-, Tag- oder Releasefreigabe.

Numerische Analysis ist näherungsweise. Touch-Pinch,
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
