# Einfach · AP6

Reiner Reducer in `model.ts`, Zahlen-/Clipboard-Adapter in `format.ts`,
Tastaturabbildung in `keyboard.ts` und Browser-/React-Orchestrierung in
`SimpleMode.tsx`. Alle Rechenoperationen verwenden die AP5-Engine.

Wiederverwendbare Anzeige und Tasten: `src/ui/keypad`, exportiert über `src/ui`.
Details zu Zuständen, Verlaufspayload und Tests in `docs/ARCHITECTURE.md`.

Tastatur: Ziffern, Punkt/Komma, + − * /, Enter/=, Backspace, Esc (C),
Delete (CE) und %. Strg+V fügt eine einzelne lokalisierte Zahl ein.

## AP19 · Zahlen und Tasten

Zahlen verwenden gemessene Fontbreiten mit seitlicher Tintenreserve und einem
begrenzten Animationsviewport. Rechentasten behalten ihre rollenbezogene
Grundform auch bei Press/Active; gemeinsame Motion-/Shape-Tokens gelten auch
im wissenschaftlichen Tastenfeld. Konzept und reproduzierbare Browsernachweise:
[AP19.md](../../../docs/AP19.md).
