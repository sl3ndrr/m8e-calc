# Einfach · AP6

Reiner Reducer in `model.ts`, Zahlen-/Clipboard-Adapter in `format.ts`,
Tastaturabbildung in `keyboard.ts` und Browser-/React-Orchestrierung in
`SimpleMode.tsx`. Alle Rechenoperationen verwenden die AP5-Engine.

Wiederverwendbare Anzeige und Tasten: `src/ui/keypad`, exportiert über `src/ui`.
Details zu Zuständen, Verlaufspayload und Tests in `docs/ARCHITECTURE.md`.
