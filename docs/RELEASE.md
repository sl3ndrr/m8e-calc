# Release und Pages

## Release-Bilder

```sh
npm run build
npx playwright install chromium
npm run screenshots
```

Der Screenshot-Befehl startet einen lokalen Preview des Produktionsbuilds. Er erzeugt unter [img](img) die vier Modi in Hell und Dunkel sowie die Social Preview. Die CI lädt aktuelle Bilder als Release-Artefakt hoch. Vor einer Veröffentlichung Bilder, [Changelog](../CHANGELOG.md) und Versionsumfang prüfen. Ein GitHub Release und ein Pages-Deploy sind getrennte Vorgänge.

## Qualität und Veröffentlichung

Die [CI](../.github/workflows/ci.yml) läuft für PRs und Pushes auf `main`. Im vollständigen Lauf prüft der Produktionsjob mit `npm run check`, versiegelt `dist/` und stellt das Artefakt für die Folgeschritte bereit. Browser, Graphperformance, Galerie, Provenance und Release-Bilder prüfen diesen Build. Die QA misst Bundle, Kontrast, Audit und Lighthouse am aktuellen Stand und vergleicht die laufenden Visualreferenzen.

Der abschließende `Quality gate` verlangt expliziten Erfolg seiner Pflichtjobs. Pages veröffentlicht nur auf einem aktuellen Push auf `main` des Ursprungsrepos. Der Upload enthält die verifizierten Produktionsbytes einschließlich Vite-Manifest. Die Pipeline prüft Artefaktfingerprint, Repository, Commit, Lauf, Versuch und Buildziel. Direkt vor dem Deploy prüft sie den aktuellen main-SHA.

Für PRs aus dem Ursprungsrepo nach `main` hinterlegt das grüne `Quality gate` die ID und SHA-256-Prüfsumme des geprüften Pages-Archivs. Auf `main` gleicht der Job `Reuse approved PR artifact` den gemergten PR, den erfolgreichen Workflow-Versuch, das Gate und den Git-Tree der geprüften Merge-Revision mit dem aktuellen Stand ab. Er prüft das Archiv gegen den Freigabenachweis und lädt dieselben Bytes im aktuellen Lauf für Pages hoch. Bei fehlendem, abgelaufenem oder abweichendem Nachweis, etwa nach einem Direktpush, einem Fork-PR oder einer Änderung des Git-Trees beim Merge, läuft die vollständige CI auf `main`.

Für einen CI-Neulauf in GitHub Actions **Re-run all jobs** wählen. Der Produktionsjob erstellt das versiegelte Artefakt für den neuen Versuch. Übernimmt eine Teilwiederholung das Produktionsartefakt aus dem vorigen Versuch, beendet die Provenienzprüfung den Job vor den Browsertests.

In GitHub Settings → Pages **GitHub Actions** als Quelle wählen. Der Standardpfad ist `/m8e-calc/`. Nach einem Merge den tatsächlichen main-Lauf, den Pages-Job und den geladenen Browserstand prüfen. [build-info.json](https://sl3ndrr.github.io/m8e-calc/build-info.json) nennt den geprüften Build-SHA. Bei Wiederverwendung nennt die Laufzusammenfassung zusätzlich den zugehörigen PR-Versuch, den veröffentlichten main-SHA und den gemeinsamen Git-Tree.
