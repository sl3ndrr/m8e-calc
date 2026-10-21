# AP45 · Erhaltene echte Zwischenframes

Quelle: `1a9cdf4f88260bb661199f9f261248f30d1cb32d`,
[AP36-Lauf 39565656007](https://github.com/sl3ndrr/m8e-calc/actions/runs/39565656007),
Artefakt `12330887231`. Diese ausgewählten erfolgreichen Framefälle sind
historische Bildbelege; die dort noch roten Kaltstart-/Fokusfälle stehen in
[AP45](../AP45.md). Spätere Kandidaten benötigen eigene Checks.

`frames.ndjson` bewahrt 66 unveränderte JSON-Anhänge mit Fall, Engine/Ziel,
Quell-SHA und Lauf: Enter/Exit, echte Umkehr, Werte und aktive Animationen.
`manifest.json` enthält SHA-256 der Bilder und Rohdaten. Die PNGs stammen aus
pausierten nativen CSS-Transitions, nicht aus nachgestellten CSS-Zuständen.
Die Live-Umkehrwerte sind eigenständige, nicht pausierte Folgeframes.

- Chromium: Accent [Enter](simple-accent-enter-middle.png) /
  [Exit](simple-accent-exit-middle.png), [Select-Exit](simple-select-exit-middle.png),
  [Dialog/Backdrop-Exit](simple-dialog-backdrop-exit-middle.png).
- Firefox: [Dialog-Exit](dialog-firefox-Dialog-exit-middle.png).
- WebKit: [Select-Exit im Graphmodus](graph-webkit-select-exit-middle.png).

Beispiel Firefox-Dialog: Opacity nach 40 von 151 ms **0,295032**, Oberfläche
noch verbunden, eine echte pausierte Transition mit Ziel 1 → 0. Nach nativem
Wiederöffnen derselbe Knoten: **0,995754 → 0,998874 → 1**, anschließend null
Animationen. Zentrierungstransforms werden nicht animiert.
