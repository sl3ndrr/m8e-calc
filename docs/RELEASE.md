# Release und Pages

## Release-Bilder

```sh
npm run build
npx playwright install chromium
npm run screenshots
```

Der Screenshot-Befehl startet einen lokalen Preview des Produktionsbuilds. Er erzeugt unter [img](img) die vier Modi in Hell und Dunkel sowie die Social Preview. Die CI lädt aktuelle Bilder als Release-Artefakt hoch. Vor einer Veröffentlichung Bilder, [Changelog](../CHANGELOG.md) und Versionsumfang prüfen. Ein GitHub Release und ein Pages-Deploy sind getrennte Vorgänge.

## Qualität und Veröffentlichung

Die [CI](../.github/workflows/ci.yml) läuft für PRs und Pushes auf `main`. Der Produktionsjob prüft mit `npm run check`, versiegelt `dist/` und stellt das Artefakt für die Folgeschritte bereit. Browser, Graphperformance, Galerie, Provenance und Release-Bilder prüfen diesen Build. Die QA misst Bundle, Kontrast, Audit und Lighthouse am aktuellen Stand und vergleicht die laufenden Visualreferenzen.

Der abschließende `Quality gate` verlangt expliziten Erfolg seiner Pflichtjobs. Pages veröffentlicht nur auf einem aktuellen Push auf `main` des Ursprungsrepos. Der Upload enthält die verifizierten Produktionsbytes einschließlich Vite-Manifest. Die Pipeline prüft Artefaktfingerprint, Repository, Commit, Lauf, Versuch und Buildziel. Direkt vor dem Deploy prüft sie den aktuellen main-SHA.

In GitHub Settings → Pages **GitHub Actions** als Quelle wählen. Der Standardpfad ist `/m8e-calc/`. Nach einem Merge den tatsächlichen main-Lauf, den Pages-Job und den geladenen Browserstand getrennt prüfen. Der passive Buildnachweis ist unter [build-info.json](https://sl3ndrr.github.io/m8e-calc/build-info.json) erreichbar.
