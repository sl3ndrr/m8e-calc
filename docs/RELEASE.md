# Veröffentlichung vorbereiten

## Reproduzierbare Bilder

Node 24 und das Lockfile verwenden:

```sh
npm ci
npx playwright install chromium
npm run build
npm run screenshots
```

`scripts/release-screenshots.mjs` startet einen eigenen Vite-Preview auf
`127.0.0.1:4175`, wartet auf Bereitschaft und beendet ihn anschließend.
Port 4175 muss frei sein. Der Build muss den Standard-Base-Pfad `/m8e-calc/`
verwenden. Jeder Modus erhält einen frischen Browserkontext: de-DE,
Iris-Akzent, keine Bewegung, keine gespeicherten Nutzerdaten, Device Scale 1.
Fonts und Ergebnisse werden vor der Aufnahme abgewartet. Externe Requests
lassen das Skript fehlschlagen. Produktcode wird dafür nicht verändert.

Ausgaben in `docs/img/`:

- `{simple,scientific,convert,graph}-{light,dark}.png`, jeweils 2560 × 1440.
- `social-preview.png`, 1280 × 640, aus dem dunklen Graphen-Modus erzeugt.

Die Bilder vor dem Commit visuell prüfen. Sie sind Dokumentationsbilder;
die unabhängigen visuellen QA-Referenzen unter `e2e/` werden nicht ersetzt.
Die eingecheckten README-Bilder stammen aus AP16; aktuelle AP25-Abnahmebilder
mit geprüftem SHA stehen in [AP25.md](AP25.md). Die verlinkten Komfortaufnahmen unter `docs/screenshots/` stammen aus Hardening-CI `38593558518` auf dem damaligen Produktcode; unverlinkte ältere AP-Bilder bleiben historische Belege.
Die CI erzeugt Release-Bilder als separates Artefakt zur Reproduktion.

## Vor Veröffentlichung

- LICENSE: MIT und Copyright-Inhaber vom Repository-Eigentümer bestätigen lassen;
  anderenfalls den Entwurf anpassen. Drittanbieter-Lizenzen gelten weiter.
- Release-PR reviewen; `npm run check`, Chromium-Smoke und QA grün prüfen.
- Nach Merge das erfolgreiche Pages-Deployment und die tatsächliche Live-Seite
  prüfen. Manuelle/physische Restabnahmen im [QA-Bericht](QA_REPORT.md) beachten.
- Erst danach `v1.0.0` taggen, das tatsächliche Datum und Vergleichslinks im
  [Changelog](../CHANGELOG.md) ergänzen und die [Release Notes](RELEASE_NOTES_1.0.md)
  als GitHub Release veröffentlichen.
- About-Text, Topics, Homepage und Social Preview manuell in GitHub einstellen;
  Vorschläge stehen im Release-PR. Dieser PR setzt keine Repository-Einstellungen.

Die Versionsnummer 1.0.0 bezeichnet die vorbereitete Version und allein keine
bereits erfolgte Veröffentlichung. Die Releasevorbereitung AP16 ist über PR #21 integriert. MIT-Bestätigung,
Produktfreigabe, Tag und tatsächliches GitHub Release sind dadurch nicht erteilt.
Integrations- und Abnahmestand: [AP25.md](AP25.md).

## Dokumentation prüfen

`node scripts/check-release-docs.mjs` prüft lokale Markdown-Verweise und alle dokumentierten `npm run`-Befehle gegen package.json. Mit `--external` werden zusätzlich externe Markdown-Links per GET geprüft (30 s Timeout je URL, Redirect-Ziel im Log). Die Release-Assets-CI führt diese externe Prüfung aus. Ein HTTP-200 allein beweist nicht, dass ein weitergeleitetes Dokument noch denselben Inhalt hat; Quellenänderungen werden zusätzlich redaktionell geprüft.

Beim Linkabgleich am 14.10.2026 wurden der verschobene NIST-Handbook-Link, die IAU-2015-PDF und die NASA-SP-367-Weiterleitung ersetzt. Die FDA-Quelle verweist jetzt auf den offiziellen HHS-Katalogeintrag, weil FDA den CI-Client auf eine Missbrauchserkennungsseite umleitete. Der ISO-2533-Katalogeintrag wurde unabhängig über die offizielle ISO-Seite bestätigt; dort erhält der CI-Client HTTP 403. Auch der HHS-Katalogeintrag wurde unabhängig auf der offiziellen Seite bestätigt und beantwortet den CI-Client mit HTTP 403. Nur diese beiden exakt dokumentierten URL/Status-Kombinationen sind im Prüfer als manuell verifiziert markiert, nicht als erfolgreiche HTTP-Tests. Die Live-URL lieferte HTTP 200; das ersetzt keine vollständige manuelle Pages-Abnahme.

## Technischer Produktionsnachweis

Künftige Builds enthalten passiv `build-info.json` mit `sourceCommit` aus
`GITHUB_SHA` und dem Ziel `normal`/`gallery`. Ohne CI-SHA steht dort ausdrücklich
`null`. Die App lädt diese Datei nicht; es entstehen keine neuen Laufzeitrequests
oder sichtbaren Entwicklerhinweise. Der Nachweis ersetzt keine UI-Abnahme.
Nach Merge von AP25: Pages-Lauf, Deploy-SHA und direkt abgerufenes Build-Info
abgleichen, dann genau diese Version live prüfen; ältere lokale/Live-Bilder
nicht als Nachweis des neuen Deploys verwenden.
