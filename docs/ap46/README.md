# AP46 · Originalbilder und Rohbelege

Geprüfter normaler Produktbuild:
`c95f183aac8bc643561bd440652a0ac5edad8c6b`.
[Bericht und Grenzen](../AP46.md), [Quellpfade/Prüfsummen](manifest.json).

| Beleg                                                                                                 | Quelle / Zustand                                                                              |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [Button-Zwischenbild](button-middle.png), [Fokus](button-focus.png)                                   | AP46 39637196370, Chromium-Produktion, native Transition; Quelldaten benennen IconButton      |
| [Press/Release](button-live.json), [schnelle Umkehr](button-reversals.json)                           | Unveränderte echte rAF-Samples, vollständige vier Radien / Geometrie / Transform              |
| [Akzent Enter](accent-enter.png), [Exit](accent-exit.png), [Dialog Exit](dialog-exit.png)             | Echte gehaltene native Zwischenwerte, kein Endzustands-Kontrastbild                           |
| [Overlayframes](overlay-frames.json)                                                                  | Enter / verschachtelter Select-Exit / Akzent-Exit                                             |
| [Playback Mitte](graph-middle.png), [Ende](graph-end.png), [Pause](graph-paused.png)                  | Chromium, a*sin(x), sichtbarer Parameter 2,9 → Pause 1,5; kein erneut gestarteter Reveal      |
| [15 lange Kurvenfälle](graph-summary.json), [originale Frames als gzip](graph-frames.json.gz)         | Drei Engines / fünf Kurventypen; mindestens zehn Sekunden fortlaufende gezeichnete Signaturen |
| [Akzent mit nativem 200%-Tabzoom](accent-native-200.png)                                              | Erfolgreicher main-Lauf 39628007681, echter Chromium-Tabzoom, separater Testprofil-Adapter    |
| [App-Sperre](pages-blocked.jpg), [Build-Info-Sperre](build-info-blocked.jpg)                          | Eigene Cloud-Browserversuche am 21.10.; keine Produktansicht, kein Live-SHA                   |
| [WebKit-Rot](webkit-slow-worker-red.json), [letztes originales Tracebild](webkit-slow-worker-red.jpg) | Regulärer PR-Build 433584b, 118 statt >120 Proben; #70/AP47, nicht main umetikettiert         |

Die PNG/JPEG-Bytes sind unverändert aus dem Browser/Trace übernommen.
JSON wurde ausschließlich mit Prettier formatiert; originale/archivierte
SHA-256 stehen im Manifest. `graph-frames.json.gz` enthält die exakten ursprünglichen
JSON-Bytes. Abgeleitete Zusammenfassungen sind als solche gekennzeichnet.
Die ungekürzten Traces bleiben im jeweiligen Actions-Artefakt (14 Tage);
ausgewählte Rohdaten und Bilder sind hier dauerhaft erhalten. Keine Baselines.

Normal-/Pages-Identität und 143-Dateien-Proof: [identity.json](identity.json),
[main-build-proof.json](main-build-proof.json). Aktuelle feste 4K-Rohfenster:
[main-ap28.json](main-ap28.json). Der frische eigene AP28-Vergleich hat getrennte
Buildidentitäten: [Paarung](ap28-paired-summary.json), [vorher](ap28-paired-before.json),
[nachher](ap28-paired-after.json). Physische GPU-/Screenreader-/Installationsabnahme
und alle AP39-Livepunkte bleiben außerhalb dieser Belege.
