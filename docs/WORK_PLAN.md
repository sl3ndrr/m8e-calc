# Weiterer Arbeitsablauf nach WP01–WP10

Funktionsstand und Nachweisgrenzen: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).
WP01–WP10 und die vollständige Währungsentfernung aus PR #95 sind integriert.
Historische Paketkennungen bleiben erhalten. WP11–WP13 und WP15–WP18 sind
vorgesehene Folgearbeit, keine bereits implementierten Features oder Migrationen.
Der aktuelle Produktumfang umfasst vier lokale Modi und lokale Einheiten;
Währungsumrechnung und ihre Erweiterungen gehören nicht mehr zum Produkt.

## Reihenfolge

1. Die integrierte lokale Basis aus [PR #95](https://github.com/sl3ndrr/m8e-calc/pull/95)
   verwenden: [LOCAL_ONLY](LOCAL_ONLY.md). Ihre Umsetzung ist kein offener
   Integrationsschritt; neue Diffs brauchen eigene Prüfnachweise.
2. Den gemeinsamen Statuseinstieg aus WP-CUT/WP19 weiterführen, anschließend
   WP11, WP12 und WP13.
3. WP15, dann die Fit-/History-Frage aus Issue #91 vor WP16 klären.
4. Sinnvolle kompatible WP17-Schritte und unabhängige WP18-Migrationen nach
   tatsächlicher Verfügbarkeit bearbeiten.
5. WP19 abschließen und WP20 am integrierten tatsächlichen Stand durchführen.

| Paket | Ziel / zusätzlicher Vertrag                                                                                                  | Voraussetzung                                                            |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| WP11  | Reset, Fit, Aspektsperre und Pending verständlich benennen; bestehende Canvaszustände und AP50 erhalten                      | WP04                                                                     |
| WP12  | Definitionsbackup mit revisionsgebundenem Import, Workerinvalidierung und ausdrücklicher Speicherfehlersemantik              | WP01, WP02, WP04, WP07, WP10, lokaler Betrieb                            |
| WP13  | CSV aus exakt dem vorhandenen ValueTable-Ergebnis; keine erneute Berechnung, definierte nicht endliche Werte                 | WP04, WP11                                                               |
| WP14  | Gestrichen: Währungsbelege und Kurssnapshots werden nicht umgesetzt                                                          | Keine Folgeabhängigkeit                                                  |
| WP15  | Ein lokaler Entwurf; Restore ohne Vorschau/Ausführung, bewusste Restorepriorität und sichere Verwerfung                      | WP01, WP07, WP08, WP10, lokaler Betrieb                                  |
| WP16  | Numerische Fenstergrenzen auf dem gewünschten Viewport, vorhandener Zahlenadapter und atomare Übernahme                      | WP11 und geklärter Fit-/History-Vertrag aus #91                          |
| WP17  | Runtime-/Farbwartung auf aktuellen PRs; vorhandenen Sicherheitsadapter nur nach dokumentierten Ablösebedingungen entfernen   | Stabiler Produktstand; kein Warten auf WP14                              |
| WP18  | ESLint und TypeScript unabhängig nach veröffentlichter Peerkompatibilität; externe Majorblocker hindern WP20 nicht           | Stabile Produktprüfungen; keine erzwungene Majorauflösung                |
| WP19  | Ein aktueller Einstieg und dauerhafte Verträge; Nachweise in ihren PRs, historische SHAs bewahren                            | Früher Teil sofort, Abschluss nach Implementierung                       |
| WP20  | Gesamtintegration einschließlich Altbestandsmigration, Offline/PWA, Import/Worker/Draft und ausstehender Live-/Geräteabnahme | Alle vorgesehenen Produktpakete; externe Migrationen separat ausgewiesen |

## Umfang der Folgepakete

WP03 bleibt als historische Zustimmungskorrektur dokumentiert; übernommen
werden nur die allgemeinen Importgrenzen und die atomare Einstellungsaktion.
WP10 prüft weiterhin Resetumfang, Fokus und Dialogreflow. Kurscacheerhalt,
Opt-in-Races, Provider-Liveproben und Währungsbelege entfallen aus der Abnahme.
Die Select-Korrektur wurde mit PR #89 integriert; PR #94 wurde ohne Merge
geschlossen. Ihre Regression bleibt durch PR #95 im lokalen Browserfall erhalten, da
die gemeinsamen suchbaren Einheitenpicker weiterhin verwendet werden.

Der historische Gallery-Motionbefund aus WP05 bleibt getrennt zu beurteilen.
Er wird durch die Entfernung des Währungsfeatures nicht als behoben erklärt.
Die Shared-Select-Korrektur ersetzt keinen Nachweis für die Motionursache.

## Arbeitsrahmen

Die aktuellen AGENTS-Regeln gelten: eigener Branch auf tatsächlichem main,
keine gestapelten PRs, unveränderte Qualitätsgrenzen und höchstens zwei
Reparaturzyklen je Ursache. Abhängigkeiten nur im beauftragten Wartungsumfang
ändern. Dauerhafte Dokumentation bleibt proportional; vorläufige Laufzustände
und Attempt-Historie gehören in den PR-Nachweis. Bei fehlender Toolchain den
konkreten Blocker benennen. Remoteausführung, Merge, Tag, Release und Deployment
richten sich nach der jeweils ausdrücklich erteilten Freigabe.
