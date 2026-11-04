# Architektur

## Zuständigkeiten

- [App-Shell](../src/app) enthält Bootstrap, Hash-Routing, Modus-Registry, gemeinsame Dialoge, Kürzel und PWA-Anbindung.
- [Features](../src/features) enthalten die vier Modi. Reducer und Modelle übersetzen Eingaben in Domänenoperationen. Komponenten und Workeradapter übernehmen Browser-IO.
- [Engine](ENGINE.md), [Einheiten](UNITS.md) und [Graphen](GRAPH.md) sind browserfreie TypeScript-Domänen mit eigenen öffentlichen Einstiegen. Vitest führt sie im Node-Projekt aus. Das UI-Projekt verwendet jsdom.
- [Shared](../src/shared) enthält i18n, Persistenz und gemeinsame Adapter. [UI](../src/ui) liefert die zugänglichen Grundbausteine, [Styles](../src/styles) die Tokens und lokalen Fonts. Direkte UI- und i18n-Imports halten schwere Abhängigkeiten aus dem Startgraphen.

## Daten und Bedienung

Eingaben gehen über UI-Adapter und Modelle in die Domäne. Berechnungsergebnisse gehen als Snapshots an Ansicht und bei bestätigten Aktionen an den Store. Einfach nutzt einen reinen Reducer mit einer lokalisierten Zahlen- und Clipboard-Schicht. Rechentasten behalten ihre rollenbezogene Form unter Druck. Zahlenansichten messen sichtbare Glyphen und reservieren Platz für deren seitlichen Überhang.

Verlauf, Favoriten und Einstellungen sind lokal. Der Verlauf ist versioniert, enthält höchstens 500 Einträge und kann Modussnapshots wiederherstellen. Settings-Version 5 migriert Versionen 0–4 und bereinigt die früheren Kursschlüssel bestmöglich. Der Einstellungsimport validiert zuerst die gesamte Datei und übernimmt sie atomar. Eine ältere asynchrone Aktion darf eine neuere Benutzerauswahl nicht überschreiben. Ein Reset umfasst ausschließlich die bestätigten lokalen Datenbereiche.

Permalinks serialisieren begrenzte, versionierte Modusdaten im Hash. Beim Einlesen werden Payload und Größe geprüft. Nutzende sollten Links wie die enthaltenen Daten behandeln. Global registrierte Kürzel respektieren Eingabe- und Dialogfokus. Die Palette ist auch im Editor erreichbar. Dialoge und verschachtelte Auswahlen übergeben Fokus und Escape an die aktuell aktive Ebene. Reduzierte Bewegung und die Bewegungseinstellung der App gelten auch für unterbrochene Übergänge.

Sichtbarer Text einschließlich Formeln, Tastenkürzeln und Zählern gehört in den zugänglichen Namen, wenn er das Bedienelement beschriftet. Die Browserprüfungen decken auch lokalisierte Namen und die Einzelansage animierter Ergebnisse ab.

Die komplette Schlüsselmenge der Oberfläche kommt aus dem deutschen Wörterbuch. Englisch pflegt dieselben öffentlichen Schlüssel. Der Start nutzt einen kleinen gemeinsamen i18n-Kern. Fachliche Texte und Bedienhilfen werden bei Bedarf geladen.

## Browser und Build

Die öffentlichen Hash-Routen lauten `#/simple`, `#/scientific`, `#/convert` und `#/graph`. Ohne Hash öffnet die App den letzten Modus, bei unbekanntem Hash Einfach. Vite verwendet standardmäßig `/m8e-calc/`. `VITE_BASE_PATH` akzeptiert einen absoluten Pfad mit führendem und abschließendem Schrägstrich.

CSP und lokale Assets begrenzen Laufzeitanfragen auf die eigene Origin. Der Service Worker cached auch lazy Chunks, Fonts und Worker. Navigation, Update und Offline-Fallback werden im Produktionspreview geprüft. `build-info.json` trägt passive Angaben zu Commit und Buildziel und wird im Browser als netzgebundene Datei geprüft.

Das Designlab unter `#/design` ist in Entwicklung und im separaten Galerie-Build erreichbar. `npm run build:gallery` schreibt nach `dist-gallery/`. Die Importgrenze hält die Galerie aus dem Produktionsgraphen. `npm run test:e2e:gallery` prüft den separaten Build. Für reale Animationsframes in Produktion und Galerie beide Builds erstellen, Chromium, Firefox und WebKit installieren und `npm run test:e2e:motion` ausführen.

## Arbeiten an Darstellung und QA

`npm run tokens` erzeugt `src/styles/tokens.css`. Für neue Symbolglyphen den lokalen Font mit [subset-fonts.py](../scripts/subset-fonts.py) neu erzeugen. Die CI prüft die aktuelle Bundlegröße, Kontrast, Accessibility, Browserintegration, Referenzbilder und Performance. Pipeline und Veröffentlichung sind in der [Release-Anleitung](RELEASE.md) beschrieben.
