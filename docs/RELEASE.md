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
- Release-PR reviewen; den tatsächlichen abschließenden `Quality gate` des
  finalen PR-Heads prüfen (Vertrag und echte Checknamen: [AP31.md](AP31.md)).
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

`node scripts/check-release-docs.mjs` prüft lokale Markdown-Verweise und alle dokumentierten `npm run`-Befehle gegen package.json. Mit `--external` werden zusätzlich externe Markdown-Links per GET geprüft (30 s Timeout je URL, Redirect-Ziel im Log). Der vom CI-Orchestrator aufgerufene Release-Assets-Job führt diese externe Prüfung auf PRs und main aus. Sie bleibt blockierend: Ein Quellenfehler sperrt den Qualitätsstatus und damit die Veröffentlichung, auch wenn der Produktbuild selbst korrekt ist. Ein HTTP-200 allein beweist nicht, dass ein weitergeleitetes Dokument noch denselben Inhalt hat; Quellenänderungen werden zusätzlich redaktionell geprüft.

Beim Linkabgleich am 14.10.2026 wurden der verschobene NIST-Handbook-Link, die IAU-2015-PDF und die NASA-SP-367-Weiterleitung ersetzt. Die FDA-Quelle verweist jetzt auf den offiziellen HHS-Katalogeintrag, weil FDA den CI-Client auf eine Missbrauchserkennungsseite umleitete. Der ISO-2533-Katalogeintrag wurde unabhängig über die offizielle ISO-Seite bestätigt; dort erhält der CI-Client HTTP 403. Auch der HHS-Katalogeintrag wurde unabhängig auf der offiziellen Seite bestätigt und beantwortet den CI-Client mit HTTP 403. Nur diese beiden exakt dokumentierten URL/Status-Kombinationen sind im Prüfer als manuell verifiziert markiert, nicht als erfolgreiche HTTP-Tests. Die Live-URL lieferte HTTP 200; das ersetzt keine vollständige manuelle Pages-Abnahme.

Am 18.10.2026 blockierte derselbe externe Prüfer AP33 wegen HTTP 400 an zwei
IAU-Übersichtsseiten (Issue #51). Die Quellenkorrektur im eigenen Commit von
PR #49 verlinkt stattdessen die konkreten IAU-Resolutionen 2012 B2 und 2015 B2
sowie die NASA/JPL-Tabelle für Tag, Julianisches Jahr und Lichtgeschwindigkeit.
Die fachliche Zuordnung steht in [UNITS.md](UNITS.md); Referenzfälle erhalten
passende Quellenlinks bei identischen Eingaben und Erwartungswerten. Keine
neue Statusausnahme und keine Änderung am externen Prüfer. Maßgeblich für die
Freigabe sind die tatsächlichen Pflichtchecks des aktualisierten PR-Heads,
nicht der frühere rote Lauf `39157938093`.

## Technischer Produktionsnachweis

Builds enthalten passiv `build-info.json` mit Schema 1, `sourceCommit` aus
`GITHUB_SHA` und Ziel `normal`/`gallery`. Ohne gültigen CI-SHA steht dort
`null`. Die App lädt diese Datei nicht und zeigt keine Entwickleranzeige.
Der Worker behandelt die Datei auch bei Adresszeilen-Navigation ausschließlich
über das Netzwerk mit `cache: 'no-store'`; offline muss der Abruf fehlschlagen.
Kein App-Shell-Fallback, Precache oder alter Cache darf als Versionsbeleg dienen.
Der Routingvertrag und seine echte Browserregression stehen in [AP29.md](AP29.md).

Nach einem später ausdrücklich freigegebenen Merge/Deployment:

1. Erfolgreichen Pages-Lauf, Deployment und den **vollständigen Build-SHA**
   notieren. Bei PR-CI synthetischen Merge-SHA und Branch-Head unterscheiden;
   der spätere Pages-SHA kann ein anderer sein.
2. Online `/m8e-calc/build-info.json` direkt im bereits vom Produktionsworker
   kontrollierten Tab aufrufen. Antwort muss echtes JSON sein, nicht nur HTTP 200.
   `schemaVersion === 1`, `target === 'normal'` und exakte Gleichheit von
   `sourceCommit` mit dem notierten Pages-Build-SHA verlangen. Ein anderer Commit,
   `null`, HTML, Offlinefehler oder fehlender Nachweis bestätigt den Deploy nicht.
3. Alternativ/zusätzlich in der Browserkonsole des kontrollierten App-Tabs prüfen
   (den Platzhalter durch den vollständigen erwarteten SHA ersetzen):

   ```js
   const expectedCommit = 'VOLLSTAENDIGER_PAGES_BUILD_SHA';
   const response = await fetch('/m8e-calc/build-info.json', {
     cache: 'no-store',
   });
   if (
     !response.ok ||
     !response.headers.get('content-type')?.includes('application/json')
   )
     throw Error('Kein JSON-Nachweis');
   const build = await response.json();
   if (
     !/^[a-f0-9]{40}$/i.test(expectedCommit) ||
     build.schemaVersion !== 1 ||
     build.target !== 'normal' ||
     build.sourceCommit !== expectedCommit
   )
     throw Error('Deployment stimmt nicht mit erwartetem Commit überein');
   console.log(build);
   ```

4. Eine zuvor installierte ältere Workerfassung muss zunächst regulär aktualisiert
   werden; AP29 kann deren bereits laufenden Routingcode nicht rückwirkend ändern.
   Ein aktueller Servernachweis allein aktualisiert den sichtbaren App-Tab nicht.
   Updateangebot annehmen, Reload und genau diesen UI-/Offline-/Hashlinkstand
   separat prüfen. Erst diese Abnahme mit Datum, URL, SHA und Browser dokumentieren.

Die Datei ist Buildmetadatum, kein kryptografischer Beweis sämtlicher Assets.
Server/CDN können weiterhin einen alten oder inkonsistenten Deploy ausliefern;
SHA-Abgleich muss solche Abweichungen ablehnen. Preview-/CI-Erfolg wird nicht
als bestandener Live-Abruf ausgegeben. Ältere Bilder bleiben ihrem ursprünglichen
Build zugeordnet; bisherige Live-Grenzen aus [AP25.md](AP25.md) bleiben dokumentiert.

## Gemeinsame CI-/Pages-Kette (AP31)

Nur `.github/workflows/ci.yml` startet PR-/main-Prüfungen und nach erfolgreicher
main-Freigabe Pages. Die bisherigen unabhängigen Pages-Prüfungen entfallen;
Hardening, AP29 und Release-Assets werden als wiederverwendbare Jobs aufgerufen.
`npm run check` baut einmal normal. Alle aktuellen Verbraucher prüfen den vom
Buildjob ausgegebenen Fingerprint und alle Dateien vor und nach ihren Tests.
Historische QA-/AP28-Vergleichsbuilds und AP29-Fixtures bleiben getrennte Belege
und werden nicht veröffentlicht. Galerie schreibt ausschließlich `dist-gallery/`.

`checked-normal-<run>-<attempt>` enthält `dist/` und `build-proof.json`: Repository,
Commit, Ref, Ereignis, Lauf/Versuch, Ziel `normal`, Base-Pfad und SHA-256 jeder
Datei. Der Fingerprint ist der SHA-256 der kanonisch geordneten Belegdaten;
er identifiziert die geprüften Bytes, keine externe Signatur. Vertrauen entsteht
zusätzlich durch unveränderliche Artefakt-ID aus demselben Workflow und den
über Jobausgaben weitergereichten erwarteten Fingerprint. Kein erneuter
Produktionsbuild für den Upload. Das Pages-TAR wird wieder entpackt und vollständig
gegen diesen Beleg geprüft, dann unverändert als eigenes Pages-Artefakt hochgeladen.
Der Deployjob kontrolliert dessen TAR-SHA-256 nochmals vor dem Pages-Aufruf.

Standardberechtigung `contents: read`; nur `Deploy Pages` erhält Pages/OIDC-Write.
Dieser Job akzeptiert ausschließlich `push` auf aktuelles upstream `main`,
erfolgreichen `Quality gate` und das Artefakt dieses Laufs. Kein PR-/Fork-Deployment,
kein `workflow_run`, keine manuelle Dispatch-/SHA-Eingabe. Main-Läufe und der
Pages-Job sind ohne Abbruch serialisiert; unmittelbar vor dem Deploy-API-Aufruf
wird `refs/heads/main` erneut gelesen. Ein alter Rerun nach neuerem main wird
abgewiesen. Ein während eines bereits gestarteten Deploys eintreffender Push
wartet in derselben Reihenfolge; ein älterer Deploy kann keinen neueren überholen.
Fehlschläge lassen die zuletzt veröffentlichte Seite bestehen.

Nach späterem Merge ausdrücklich separat prüfen und in AP31 nachtragen:

1. Tatsächlichen main-SHA und zugehörigen CI-Lauf aufzeichnen; alle Pflichtjobs
   und `Quality gate` müssen erfolgreich sein. PR-Merge-Ref und main-SHA unterscheiden.
2. Build-Artefakt-ID, Fingerprint, `build-info.json`, Pages-Artefakt-ID und TAR-Hash
   desselben Laufs abgleichen; erfolgreicher `Deploy Pages` muss genau daran hängen.
3. Die reale Pages-/Environment-URL und den netzgebundenen Buildnachweis im
   kontrollierten Produktionstab wie oben prüfen. UI-/Update-/Offlineabnahme separat.
4. Erst dann die Kette als erfolgreich dokumentieren. Ein grüner AP31-PR nimmt
   keinen dieser Schritte vorweg. Regeln, Tag, Release und Merge bleiben manuell.

Rulesets später ausschließlich mit aus GitHub ausgelesenen Checknamen konfigurieren;
die beobachteten Namen stehen in AP31. Keine bedingten historischen Evidence-Jobs
pauschal verlangen. Bei abweichender Laufversuchsnummer den kompletten CI-Workflow
neu ausführen; ein Teil-Rerun darf ältere Artefakte nicht stillschweigend übernehmen.
