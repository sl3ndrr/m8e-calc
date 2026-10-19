# AP36 · Herkunft der Rohbelege

Produkt-/Teststand: `5828cb73bc675e2b467a57139918ddcb8a3fd91c`.
Unveränderte Basis mit eigenem Lockfile: `964f6b4e7d605d7b2e73248c1ed9ac3e32fe2839`.
Alle Dateien stammen aus dem erfolgreichen [Paarlauf 39276448700](https://github.com/sl3ndrr/m8e-calc/actions/runs/39276448700).
Artefakt 12199961626: SHA-256 `a56ffb8c04e7842cb85c3fef3fb6f913f884cbd86936f53b2524d5003aa42944`.

Die NDJSON-Dateien enthalten jeweils ein vollständiges JSON-Objekt pro Zeile.
Die JSON-Werte wurden verlustfrei aus den Playwright-Anhängen, Buildberichten und
Performanceberichten übernommen. Bilder wurden unverändert aus den Traces kopiert.
`browser-frames.ndjson`: 234 Anhänge; `press-release-frames.ndjson`: 10 Datensätze,
insgesamt 360 echte Down-/Up-/Keyboard-Frames. `measurements.ndjson`: acht Datensätze
mit den vollständigen Vorher-/Nachher-Build-, Paket- und Performanceberichten.

## Inhaltlich geprüfte IAU-Downloads

Anonym heruntergeladen und mit Poppler/ripgrep geprüft, im selben Lauf erfolgreich.
Die Adressen stammen aus der aktuellen offiziellen IAU-Resolutionsliste.

- 2012 B2, au exakt 149597870700 m:
  [offizieller Download](https://drive.google.com/file/d/1FBKjaswlP-rTs6z6V4WygXsbdHKVHYcP/view).
  PDF-SHA-256 `cd8a216237c4f3cd5edaf775c5326c754157ed750910d424b0ec5b90bb07ecad`.
- 2015 B2, Parsec exakt (648000/π) au:
  [offizieller Download](https://drive.google.com/file/d/1vL1vXyzFUWjY083Yb5s67dDsc_rxTWWZ/view).
  PDF-SHA-256 `9a169a36228b4bdb6ba1f5cd679886253dc1765ae9b32aa7bf125631d8a1a970`.

## SHA-256 der dauerhaft eingecheckten Dateien

```text
f87ce8b8c24028a978b0268512219e93387fa331f64fe282c80b4e7ab8addcf1  after-demo-os-reset.png
57bcd560bdbd26c930a9cd8a8ac26231681afc4631c09b1930b10f131a698359  after-history-off.png
c7a52f1d3bac9feafbeded5b693d7ee99e0ae8356b299d55b1e40711cfe717a2  before-demo-os-reset.png
ccafc8154b5930412e7f14651cf8124f96124c2bef2a60b41662479b5b2fd576  before-history-off.png
9a341c8a26ab427fee6685070477c91dc8c16ad23d7c3afde46ba5ead062eda6  browser-frames.ndjson
888d62dbda32183825ad8e411937e5d9d73fb95850cb094f71c4ca5ab1611b73  measurements.ndjson
11df6cd2b671c86b253c470643f54fce803fcbf09f5941ffc68c60fe2c91b1a4  operator-press.png
d3d9e8eef3cfcb7006c4dc8614545d7495a92a2dbeb5eebfb8fe9f177d82e693  press-release-frames.ndjson
```
