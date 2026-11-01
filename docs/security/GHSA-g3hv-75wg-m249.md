# GHSA-g3hv-75wg-m249: begrenzter Toolchain-Fix

Ausgang: main `9b5b3736d8fdeb2d2706658e04bfc357883c3134`.
Das Advisory betrifft die gelockten Entwicklungsabhängigkeiten; Runtimepakete,
Produktcode, Lintregeln, Tests, Budgets und Referenzbilder bleiben unverändert.

## Lösung und API-Vertrag

Fünf verschachtelte Overrides pinnen minimatch exakt auf **11.0.3**:
`eslint`, `@eslint/config-array`, `@eslint/eslintrc`,
`@typescript-eslint/typescript-estree` und `eslint-plugin-jsx-a11y`.
Es gibt keinen globalen Override und keine Peer-Range-Änderung.

| Elternpaket              | Tatsächlicher Aufruf / Anpassung                                         |
| ------------------------ | ------------------------------------------------------------------------ |
| ESLint 9.39.5            | CJS Minimatch.match, auch partial; pattern bleibt vorhanden              |
| Config-Array 0.21.2      | CJS Minimatch.match; ESM-Pfad nicht geladen                              |
| Es­lintrc 3.3.7          | CJS/Interop Minimatch.match und pattern; ESM-Pfad nicht geladen          |
| TypeScript-ESTree 8.71.2 | Benannter minimatch-Export, dot: true                                    |
| JSX-A11y 6.10.2          | Zwei Default-Importstellen auf require("minimatch").minimatch umgestellt |

Die JSX-Anpassung betrifft ausschließlich die Importzeile in
`mayContainChildComponent.js` und `mayHaveAccessibleLabel.js`.
`patch-package@8.0.1` wendet den getrackten Patch im Postinstall mit
`--error-on-fail` an. Regelcode und Regelkonfiguration bleiben unverändert.
Der alternative lokale Adapter über direkte Root-devDependency und
`$minimatch-compat` scheiterte mit npm EUSAGE beim frischen npm ci
(`Missing: minimatch@ from lock file`); er wurde nicht übernommen.

## Nachweise

[Gebündelte Prüfung 41312371229](https://github.com/sl3ndrr/m8e-calc/actions/runs/41312371229)
verwendet Node 24.22.2 und npm 11.19.0 auf identischem main-Quellstand:

- Frisches `npm ci --engine-strict` in einem sauberen Worktree besteht;
  beide ersetzten Importstellen sind danach geprüft. `npm ls --all` und
  `npm ls minimatch --all` bestehen, alle fünf Kopien sind 11.0.3.
- Exaktes `npm audit --json`: Exit 0, keine Befunde.
- Vorher-/Nachher-ESLint-JSON: **359 Dateien**, identische Messages (**0**).
- Temporäre Canaries für JSX-A11y, type-aware TypeScript-ESLint, den Domain-files-Glob
  und eine ignorierte Datei verhalten sich identisch. Die im Produkt nicht
  aktivierte type-aware Regel wird nur in der nicht committeten Probe ergänzt.
- **21 reale zweistellige JSX-A11y-Aufrufe** mit seinen sechs Standardmustern
  und dem Probe-Glob Custom* ergeben alt/neu dieselben Werte.
- Vollständiges `npm run check`: **635 UI-/1744 Domänentests**, alle Checks bestehen.
  **144 Produktionsdateien** sind nach Größe und SHA-256 identisch zur Basis;
  ausschließlich build-info.json ist ausgenommen. Startgraph: **190768 B gzip**
  bei unverändertem Limit **200000 B**.

Normalisierter Produktionsfingerprint ohne build-info.json:
`a22aefd6514e94c921112b007ff33acc8d09268784b733a82f4192e156203a2a`.
Die verbindlichen finalen Head-/Laufidentitäten und vollständigen Pflicht-CI-Ergebnisse
stehen in [PR #90](https://github.com/sl3ndrr/m8e-calc/pull/90).
Die unveränderte main-Matrix erwartet Chromium 249, Firefox/WebKit je 221 + 2 Skips,
Visuals 24, Galerie 75 und Provenienz 36.

## Entfernung und Grenzen

Overrides entfernen, sobald eslint, @eslint/*, typescript-eslint beziehungsweise
JSX-A11y selbst minimatch >=11.0.1 verlangen. Ohne Overrides muss
`npm ls minimatch --all` ausschließlich sichere Versionen zeigen.
Den Patch entfernen, sobald JSX-A11ys eigener Aufruf mit der sicheren Version
kompatibel ist; patch-package und Postinstall danach entfernen, wenn kein Patch
mehr benötigt wird. Erneut Lint-/Canary-Parität und vollständige Pflicht-CI prüfen.
Die Prüfabdeckung bezieht sich auf den vorhandenen Quellstand und die Canaries;
neue Globkonfiguration verlangt erneute Prüfung.

Keine Audit-Ausnahme ist aktiviert. Merge, Release, Tag und Deployment benötigen
eine neue ausdrückliche Freigabe.
