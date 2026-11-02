# Implementierungsstatus

Dies ist der gemeinsame Einstieg für implementierten Umfang, geplante
Folgearbeit und Nachweisgrenzen. README, AGENTS und Roadmap verweisen hierher.
Die Auditpakete WP-01 bis WP-10, der Sicherheitsfix aus
[PR #90](https://github.com/sl3ndrr/m8e-calc/pull/90) und die Währungsentfernung
aus [PR #95](https://github.com/sl3ndrr/m8e-calc/pull/95) sind auf `main`
integriert. Commitgebundene Laufhistorie und vorläufige Abnahmestände gehören
in die jeweiligen PR-/Abschlussnachweise, nicht in die Fachverträge.

## Implementierung, Planung und historische Nachweise

AP46–AP49 sind durch [PR #69](https://github.com/sl3ndrr/m8e-calc/pull/69)
integriert (`fad008b1045e781c8efdac961a728453fd944c11`), AP50 durch
[PR #72](https://github.com/sl3ndrr/m8e-calc/pull/72)
(`de0fcd0a0846f56226e148c14f7b3bf5d1cb387f`). Diese SHAs sind historische
Integrationsbelege, keine aktuelle Arbeits- oder Rücksetzbasis. Die
[Roadmap](ROADMAP.md) ordnet AP1–AP50 ein; [WORK_PLAN](WORK_PLAN.md) führt
WP11–WP13 und WP15–WP18 als Folgearbeit sowie WP14 als gestrichen.
Vorgesehene Funktionen und von Peerkompatibilität abhängige Migrationen
sind keine implementierten Features. Festgelegte Versionen stehen in
[Manifest](../package.json) und [Lockfile](../package-lock.json),
Wartungsentscheidungen in den zugehörigen PRs.

Die [offenen PRs](https://github.com/sl3ndrr/m8e-calc/pulls) sind Vorschläge.
Insbesondere ist PR #65 nicht der Integrationsbeleg für Label in Name:
Die Übernahme erfolgte durch [PR #83](https://github.com/sl3ndrr/m8e-calc/pull/83).
Die integrierten Reparaturen/Regressionen aus #69 ersetzen keine
Ursachenklärung der historischen Befunde [#70](https://github.com/sl3ndrr/m8e-calc/issues/70)
und [#71](https://github.com/sl3ndrr/m8e-calc/issues/71).

## Was ein Nachweis belegt

| Ebene                         | Erforderlicher Bezug und Einstieg                                                                                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementierter Stand         | Tatsächlicher Defaultbranch-Head und integrierter Diff; Mergebelege oben und in der Roadmap.                                                                                                                    |
| Lokal geprüfter Code/Diff     | Vollständiger Ausgangs-/Prüf-SHA, Diff und ausgeführte Befehle im Abschlussnachweis. Ein späterer Dokumentationscommit ist separat zu benennen.                                                                 |
| PR-CI                         | Vollständige Pflichtjobs auf dem finalen PR-Head, mit Run, Job und allen Attempts im jeweiligen PR. Ein älterer grüner SHA prüft keinen neuen Diff.                                                             |
| main-CI                       | Eigener erfolgreicher Pushlauf auf dem integrierten SHA in [CI](https://github.com/sl3ndrr/m8e-calc/actions/workflows/ci.yml), einschließlich `Quality gate`. PR-Erfolg genügt nicht.                           |
| Pages                         | Erfolgreicher `Deploy Pages`-Job dieses main-Laufs mit identischem vollständigem SHA und gebundenem Artefakt; [Freigabevertrag](AP31.md). Konfiguration oder Upload allein sind kein Deploybeleg.               |
| Geladener Live-Client         | Im kontrollierten Produktionstab geladene App-/Workerfassung mit dem konkreten Deploy abgleichen; [Verfahren](AP29.md) und [Release-Anleitung](RELEASE.md). Ein Serverabruf von Build-Info allein genügt nicht. |
| Physische Geräte/Screenreader | Ausgeführte Prüfung mit Gerät, Browser/Screenreader, Datum und Build; automatisierte Browsermatrix und Screenshots ersetzen sie nicht. Historische Prüfliste: [AP39](AP39.md).                                  |

Fehlende Zugänge, nicht ausgeführte Live-/Handprüfungen und offene Ursachen
werden im zugehörigen Abnahmenachweis ausdrücklich benannt. Ohne diesen
Beleg ist die jeweilige Ebene nicht abgenommen. Alte AP-Berichte einschließlich
roter Läufe behalten Datum, SHA und Messergebnisse; damalige „aktuell“-Aussagen
gelten nur innerhalb ihres historischen Prüfstands und erteilen keine neue
Handlungsfreigabe. Ein konfigurierter Job erhält keinen Erfolgsstatus.

## Lokaler Betrieb

Der mit PR #95 integrierte Umrechner unterstützt ausschließlich lokale Einheiten.
Kursclient, Zustimmung und dynamische Provider sind entfernt. Settings-Version 5 verwirft
das frühere Netzwerkfeld; Altdateien bleiben lesbar. Details:
[LOCAL_ONLY](LOCAL_ONLY.md). Der [weitere Ablauf](WORK_PLAN.md) führt WP14
als gestrichen und erhält die übrigen Paketkennungen.

## WP-10 · Resetumfang und Dialogorientierung

Die de/en-Texte benennen Einstellungen und globalen Verlauf sowie erhaltene
Feature-Daten und Offline-Dateien. Ein fester Dialogkopf, eine eigene
Scrollfläche, benannte Abschnitte und die Fokusrückgabe der Inlinebestätigung
erleichtern die Bedienung. Der scrollbare Dialog hält eigene fokussierte
Controls im sichtbaren Bereich. Suchbare Auswahlfelder verwenden React Arias
`Group`, damit die ComboBox ihren vorgesehenen Größenmesspfad verwendet.
Resetoperationen und Datenverträge sind in [WP10](WP10.md) beschrieben;
Integration und Prüfnachweise: [PR #89](https://github.com/sl3ndrr/m8e-calc/pull/89).

## WP-09 · Umrechnerzahlen und Swap-Layout

Vorzeichen, Mantisse und Exponent bleiben vollständig erreichbar. Zahlenregion,
Kopieraktion und Swap haben getrennte Aufgaben und Layoutplätze; Kategorienfokus,
Kontrast und Panelgrenzen gehören zum Vertrag. WP-09 wurde mit PR #88 per
Merge-Commit integriert; PR #90 behebt den anschließenden Minimatch-Befund.
Details: [WP09](WP09.md), [Reparaturabnahme](wp09/REPAIR.md),
[PR #88](https://github.com/sl3ndrr/m8e-calc/pull/88).

## WP-08 · Wissenschaftlicher Hauptwert nach Zahlenpräferenzen

Der lokalisierte Ergebnistext ist Hauptwert und gemeinsame Quelle für Textkopie
und Ansage; Formel und kanonisches LaTeX ergänzen ihn. Ein persistenter
Ansagekanal und eine intern scrollende Bühne berücksichtigen nachlaufende
Vorschauen und lange Werte. Details: [WP08](WP08.md),
[PR #87](https://github.com/sl3ndrr/m8e-calc/pull/87).

## WP-07 · Wissenschaftliche Berechnungen im Worker

Vorschau, Enter und STO laufen über einen terminierbaren lokalen Modulworker.
Protokoll 1 validiert Ergebnisse und Environments; eine laufende Arbeit und ein
neuester Vorschau-Nachfolger begrenzen die Queue. Explizite Snapshots committen
einmalig gegen die Environmentrevision, Vorschauen schreiben keine Persistenz.
Details: [WP07](WP07.md), [PR #86](https://github.com/sl3ndrr/m8e-calc/pull/86).

## WP-06 · Zoll-Queries und Wortseparatoren

Pfeile bleiben vorrangig. Worttrennstellen werden anhand gültiger Größen und
Ziele derselben Kategorie geprüft; Zollquellen funktionieren auch mit
`in`, `to` und `nach`. Mehrdeutige Lesarten werden kontrolliert abgewiesen;
4096 Zeichen und höchstens 32 Wortkandidaten begrenzen den Aufwand.
Details: [WP06](WP06.md), [PR #85](https://github.com/sl3ndrr/m8e-calc/pull/85).

## WP-05 · Gallery-WebKit und Attempt-Provenienz

Das Diagnosepaket sichert den historischen WebKit-Motion-Befund und trennt ihn
von der Ablehnung fremder Producerattempts. Artefaktbytes, Commit, Lauf und
Attempt bleiben gemeinsam gebunden; ein Failed-Jobs-Rerun ersetzt keinen
vollständigen Producer-/Konsumentenlauf. Diagnose integriert durch
[PR #84](https://github.com/sl3ndrr/m8e-calc/pull/84), keine behauptete
Motionreparatur. Details: [WP05](WP05.md).

## WP-01 · Wissenschaftliche Persistenz

Strukturelle Environment-Validierung erhält Namen, Funktionskörper, Wertarten
und ans-Historie ohne Auswertung. Fehlerhafte oder nicht lesbare Altbestände
sperren automatische Schreibzugriffe; Original und zuletzt speicherbarer
Bestand bleiben erhalten. Erneutes Laden ist eine ausdrückliche Aktion mit
Fokusrückgabe. Details: [WP01](WP01.md),
[PR #80](https://github.com/sl3ndrr/m8e-calc/pull/80).

## WP-02 · Verlustfreies Bearbeiten von Definitionen

Kanonischer Quelltext mit voller Decimal-Präzision ist von der lokalisierten
Anzeige getrennt. Unverändertes Bearbeiten erhält skalare Werte;
Funktionsbestätigung führt keinen Körper aus und erhält den AST. Listen bleiben
sichtbar und einfügbar, ihr Bearbeiten ist mit de/en-Erklärung deaktiviert.
Details: [WP02](WP02.md), [PR #81](https://github.com/sl3ndrr/m8e-calc/pull/81).

## WP-03 · Historische Zustimmungskorrektur

Die durch [PR #82](https://github.com/sl3ndrr/m8e-calc/pull/82) integrierte
Korrektur ist im [historischen Paketnachweis](WP03.md) erhalten.
Mit Entfernung des Netzwerkfeatures entfällt ihr Zustimmungsvertrag.
Dateiprüfung, Größenlimit und atomare Einstellungsübernahme bleiben erhalten.

## WP-04 · Label in Name

Sichtbare Werte, Kürzel, Einheiten, Zähler und Badges gehören in den
zugänglichen Aktionsnamen. Produktions- und Galerieregressionen aktivieren
`label-content-name-mismatch`; reine Symbolaktionen werden mit ihrem konkreten
Ziel und lokalisierten Namen geprüft. Details: [WP04](WP04.md),
[Label-in-Name-Vertrag](ACCESSIBILITY_LABEL_IN_NAME.md),
[PR #83](https://github.com/sl3ndrr/m8e-calc/pull/83).
