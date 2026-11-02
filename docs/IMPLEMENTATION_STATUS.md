# Implementierungsstatus

Die Auditpakete WP-01 bis WP-09 und der Sicherheitsfix aus PR #90 sind auf
`main` integriert. WP-10 wird in [PR #89](https://github.com/sl3ndrr/m8e-calc/pull/89)
geführt. Dieses Dokument beschreibt den Funktionsstand; commitgebundene
Testergebnisse und verbleibende Abnahmen stehen im jeweiligen PR.

## WP-10 · Resetumfang und Dialogorientierung

Die de/en-Texte benennen Einstellungen und globalen Verlauf sowie erhaltene
Feature-Daten und Offline-Dateien. Ein fester Dialogkopf, eine eigene
Scrollfläche, benannte Abschnitte und die Fokusrückgabe der Inlinebestätigung
erleichtern die Bedienung. Der scrollbare Dialog hält eigene fokussierte
Controls im sichtbaren Bereich. Suchbare Auswahlfelder verwenden React Arias
`Group`, damit die ComboBox ihren vorgesehenen Größenmesspfad verwendet.
Resetoperationen und Datenverträge sind in [WP10](WP10.md) beschrieben.

## WP-09 · Umrechnerzahlen und Swap-Layout

Vorzeichen, Mantisse und Exponent bleiben vollständig erreichbar. Zahlenregion,
Kopieraktion und Swap haben getrennte Aufgaben und Layoutplätze; Kategorienfokus,
Kontrast und Panelgrenzen gehören zum Vertrag. WP-09 wurde mit PR #88 per
Merge-Commit integriert; PR #90 behebt den anschließenden Minimatch-Befund.
Details: [WP09](WP09.md), [Reparaturabnahme](wp09/REPAIR.md).

## WP-08 · Wissenschaftlicher Hauptwert nach Zahlenpräferenzen

Der lokalisierte Ergebnistext ist Hauptwert und gemeinsame Quelle für Textkopie
und Ansage; Formel und kanonisches LaTeX ergänzen ihn. Ein persistenter
Ansagekanal und eine intern scrollende Bühne berücksichtigen nachlaufende
Vorschauen und lange Werte. Details: [WP08](WP08.md).

## WP-07 · Wissenschaftliche Berechnungen im Worker

Vorschau, Enter und STO laufen über einen terminierbaren lokalen Modulworker.
Protokoll 1 validiert Ergebnisse und Environments; eine laufende Arbeit und ein
neuester Vorschau-Nachfolger begrenzen die Queue. Explizite Snapshots committen
einmalig gegen die Environmentrevision, Vorschauen schreiben keine Persistenz.
Details: [WP07](WP07.md).

## WP-06 · Zoll-Queries und Wortseparatoren

Pfeile bleiben vorrangig. Worttrennstellen werden anhand gültiger Größen und
Ziele derselben Kategorie geprüft; Zollquellen funktionieren auch mit
`in`, `to` und `nach`. Mehrdeutige Lesarten werden kontrolliert abgewiesen;
4096 Zeichen und höchstens 32 Wortkandidaten begrenzen den Aufwand.
Details: [WP06](WP06.md).

## WP-05 · Gallery-WebKit und Attempt-Provenienz

Das Diagnosepaket sichert den historischen WebKit-Motion-Befund und trennt ihn
von der Ablehnung fremder Producerattempts. Artefaktbytes, Commit, Lauf und
Attempt bleiben gemeinsam gebunden; ein Failed-Jobs-Rerun ersetzt keinen
vollständigen Producer-/Konsumentenlauf. Details: [WP05](WP05.md).

## WP-01 · Wissenschaftliche Persistenz

Strukturelle Environment-Validierung erhält Namen, Funktionskörper, Wertarten
und ans-Historie ohne Auswertung. Fehlerhafte oder nicht lesbare Altbestände
sperren automatische Schreibzugriffe; Original und zuletzt speicherbarer
Bestand bleiben erhalten. Erneutes Laden ist eine ausdrückliche Aktion mit
Fokusrückgabe. Details: [WP01](WP01.md).

## WP-02 · Verlustfreies Bearbeiten von Definitionen

Kanonischer Quelltext mit voller Decimal-Präzision ist von der lokalisierten
Anzeige getrennt. Unverändertes Bearbeiten erhält skalare Werte;
Funktionsbestätigung führt keinen Körper aus und erhält den AST. Listen bleiben
sichtbar und einfügbar, ihr Bearbeiten ist mit de/en-Erklärung deaktiviert.
Details: [WP02](WP02.md).

## WP-03 · Zustimmung bei asynchronem Settingsimport

Die atomare Storeaktion übernimmt validierte Einstellungen und erhält die beim
Abschluss aktuelle Netzwerkzustimmung. Validierung, Größenlimit, Fehlermeldungen
und Kursclient-Abbruch gelten auch bei verzögerter Dateiauswahl und
Zustimmungswechseln. Details: [WP03](WP03.md).

## WP-04 · Label in Name

Sichtbare Werte, Kürzel, Einheiten, Zähler und Badges gehören in den
zugänglichen Aktionsnamen. Produktions- und Galerieregressionen aktivieren
`label-content-name-mismatch`; reine Symbolaktionen werden mit ihrem konkreten
Ziel und lokalisierten Namen geprüft. Details: [WP04](WP04.md),
[Label-in-Name-Vertrag](ACCESSIBILITY_LABEL_IN_NAME.md).
