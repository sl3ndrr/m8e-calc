# AP43 · Belegindex

Die Daten stammen aus echten Produktionsbuilds, Chromium und nativen Canvas-
Aufrufen. Keine synthetische Kurvengeometrie oder künstliche Uhr in diesen
Frame-/Performancefenstern. Der 180-ms-Fall verzögert die Zustellung echter
Workerantworten; seine Sampling-CPU-Zeit ist dadurch nicht um 180 ms erhöht.

## Herkunft

| Stand                | Lauf        | Artefakt-ID | ZIP SHA-256                                                        |
| -------------------- | ----------- | ----------- | ------------------------------------------------------------------ |
| `025ea1e`            | 39485303783 | 12292093957 | `1791ce2ff64ad0607cda02e3025f3d797bd3920e2ff0ff208ef3d35d9ff320a1` |
| `6662ec5`            | 39484003669 | 12293616044 | `50fd79bce97b91420c1393014dd9eec3749727962553f421b22a1db4c13d7b46` |
| `6662ec5`, AP28 rot  | 39484003912 | 12293026856 | `26c8c9ed6254133963c4b70582322c22851edcc9f366c78d5e1344215b4b228b` |
| `df91629`            | 39486481218 | 12294660383 | `a01c311ffd74a71258515ca287919d5570305daa1063292c23f5d130a10f0aeb` |
| `df91629`, AP28 grün | 39486481314 | 12293708035 | `e8da3b5fa58dc95bcab892242453df791111bf777902a2a59a17c6c92f7c4b5e` |

Die dauerhaften Lauf-URLs stehen in [AP43.md](../AP43.md).
Artefakte sind 14 Tage verfügbar; GitHub liefert direkte Artefakt-URLs
unangemeldet gegebenenfalls als 404. Die Hashes sind die tatsächlichen
Upload-Hashes aus den Actions-Logs, keine nachträglich berechneten Dateihashes.

`frame-snapshots.ndjson` enthält elf vollständige Reportobjekte: fünf
ursprüngliche main-Fälle, fünf Kandidatenfälle und einen verzögerten Workerfall.
Jeder Report nennt die Gesamtzahl aller erfassten rAF-Frames, Leer-/Reveal-
Zähler, Anfang/Ende und jeden beobachteten Zustands-/Pfadwechsel mit Zeitstempel.
Wiederholte unveränderte Frames sind über die Zähler und das vollständige
temporäre Laufartefakt abgedeckt. Signaturen sind unverändert vollständig;
eine Signatur-ID im Snapshot verweist auf den Index der dortigen Liste.

`performance.ndjson` bewahrt die beiden vollständigen 4K-/Mixed-Berichtspaare
einschließlich Rohintervallen/Renderzeiten. Das letzte Objekt sichert den
roten AP28-Assert aus dem Log und die Identität seines Rohartefakts. Dessen
ZIP wurde nach Verfügbarkeit einer lokalen Laufzeit heruntergeladen; sein
nachgerechneter SHA-256 entspricht dem oben gesicherten Uploadhash.
`ap28-red-default.ndjson` bewahrt das vollständige ursprüngliche After-Objekt
mit allen elf Fenstern, Rohintervallen, Renderzeiten und Backend-/Runnerdaten.
Die erste rote Assertion gehört zu sichtbarem Pan, Fenster 0; alle drei Pan-
und alle drei Hidden-Pan-Fenster liegen unter 55 FPS. Sie werden in AP43.md
ausgewertet. Keine kausale Trace-/GPU-Erklärung und kein neuer FPS-Versuch.

Produktcode ist zwischen den beiden Messständen unverändert. `025ea1e`
erweitert den Vorher-Browservergleich von zwei auf fünf Kurventypen.
Beide Paare bleiben erhalten; es wird kein günstigeres FPS-Fenster ausgewählt.
Der nachfolgende PR-Head hat eigene Checks und ist kein neuer Pages-SHA.
Es wurde nichts veröffentlicht.
