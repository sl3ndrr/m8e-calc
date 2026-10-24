# P1 · Label in Name und PR #65

## Ausgangspunkt

Untersucht wird main `de0fcd0a0846f56226e148c14f7b3bf5d1cb387f` vom
24. Oktober 2026. PR #65 hatte ursprünglich nur Playwright 1.64.0 → 1.64.1
und `@axe-core/playwright` / dessen axe-core 4.13.0 → 4.14.0 geändert.
Die separat installierte axe-core-Abhängigkeit war bereits 4.14.0;
der bisherige Playwright-Adapter verwendete seine verschachtelte 4.13.0.

Die [Originalläufe](https://github.com/sl3ndrr/m8e-calc/actions/runs/39512695733)
bleiben historische Belege ihres ursprünglichen Produkts:

| Job | Fehlgeschlagene Tests | Befund |
| --- | ---: | --- |
| [Chromium](https://github.com/sl3ndrr/m8e-calc/actions/runs/39512695733/job/118938039476) | 15 | `label-content-name-mismatch` |
| [Firefox](https://github.com/sl3ndrr/m8e-calc/actions/runs/39512695733/job/118938039200) | 13 | `label-content-name-mismatch` |
| [WebKit](https://github.com/sl3ndrr/m8e-calc/actions/runs/39512695733/job/118938039224) | 13 | `label-content-name-mismatch` |
| [Galerie](https://github.com/sl3ndrr/m8e-calc/actions/runs/39512695733/job/118938039109) | 1 | Rail-Link mit sichtbarem Badge `3` |

## Geändertes Prüfverhalten

Der [Upstreamvergleich von axe 4.13.0 und 4.14.0](https://github.com/dequelabs/axe-core/compare/v4.13.0...v4.14.0)
enthält zwei relevante Änderungen: Die Regel ist erstmals standardmäßig aktiv
([#5421](https://github.com/dequelabs/axe-core/pull/5421)); ihr Vergleich arbeitet
nun mit zusammenhängenden Wortfolgen und zusätzlicher Unicode-Normalisierung
statt mit einem Teilstringvergleich. Klammerinhalte und bestimmte Rollen mit
Werttext werden ebenfalls anders behandelt. Ein früher grüner Standardscan
belegt deshalb nicht, dass die bestehenden Namen korrekt waren.

`label-toolchain-evidence.yml` baut genau den oben festgehaltenen main-Stand,
ohne Produktreparaturen, mit allen vier Kombinationen von Playwright
1.64.0/1.64.1 und axe 4.13.0/4.14.0. Chromium, Firefox und WebKit prüfen jeweils
Einfach, Wissenschaftlich einschließlich Definition und zweiter Tastenebene,
Einheiten, gemockte Währungen und Galerie. Jeder Fall sichert sowohl den
Standardscan als auch eine ausdrücklich aktivierte Regel, Versionen,
Selektoren, HTML und ein Bild. Die JSON-Anhänge liegen in den vier
`label-evidence-pw-…-axe-…`-Artefakten. Der Workflow prüft die erwartete
4.13-/4.14-Unterscheidung; er ist kein Ersatz für die Produkt-CI.

## Produktkorrekturen

- Speicher- und Funktionstasten behalten ihre sichtbaren Texte wie `MC`,
  `CE`, `√x`, `x²` und `1/x` im lokalisierten Namen. Die zweite wissenschaftliche
  Tastenebene erhält auch das sichtbare `d/dx` statt allein `deriv`.
- Der Kopiername der Ergebnisanzeige enthält den aktuellen Zahlenwert.
  Die einzelne Live-Ausgabe und die dekorativen animierten Ziffern bleiben
  erhalten.
- Der Verlaufsschalter nennt seinen sichtbaren Zähler. Wiederherstellen nennt
  sowohl Ausdruck als auch sichtbares Ergebnis. Definitionen behalten den
  vollständigen sichtbaren Quelltext und die Einfügeaktion im Namen.
- Einheiten- und Währungskarten verwenden ihren sichtbaren Inhalt als Namen,
  ergänzt um die bereits übersetzte Kopieraktion. Namen, Zahlen, Symbole,
  Währungscodes und Systemzuordnung werden nicht mehr von `aria-label` ersetzt.
- NavigationRail verwendet den Namen aus ihrem Inhalt, einschließlich Badge.

Die Änderungen betreffen Semantik und Namen; Bildreferenzen werden nicht
ersetzt. Deutsch und Englisch werden gepflegt. Es gibt keine ausgeschaltete
axe-Regel, keine ausgeschlossenen Produktknoten und keinen Versionsrückschritt.

## Abnahme

`e2e/label-in-name.spec.ts` prüft die Namen und vollständige axe-Scans in beiden
Sprachen, einschließlich Rechenergebnis, Verlaufsänderung, Definition und
beider wissenschaftlicher Tastenebenen. Der Fall gehört zur regulären
Chromium-/Firefox-/WebKit-Matrix. Bestehende Galerie-, Währungs-, Kontrast-,
Screenshot-, Performance-, PWA-, Provenienz- und Buildgates bleiben bindend.
`npm run check` enthält weiterhin vollständige UI-/Engine-Läufe und Benchmarks.

Maßgeblich sind die tatsächlich abgeschlossenen Checks des finalen PR-Heads,
verlinkt in PR #65. PR-Erfolg ist kein Nachweis eines main-Merges oder einer
Pages-Veröffentlichung.
