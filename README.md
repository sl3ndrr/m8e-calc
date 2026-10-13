# m8e-calc

Desktop-Browser-Taschenrechner mit vier geplanten Modi, Material 3 Expressive und GitHub Pages. Dieses Fundament enthält nur eine Platzhalterseite, noch keine Rechenfunktionen.

```sh
nvm use
npm ci
npm run dev
```

Die App lädt unter `/m8e-calc/`, mit Routen `#/simple`, `#/scientific`, `#/convert`, `#/graph`. `VITE_BASE_PATH=/anderer-pfad/ npm run build` überschreibt den Base-Pfad.

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

E2E benötigt einen vorherigen Build (`npm run check` enthält ihn). Für Linux ggf. `npx playwright install --with-deps chromium` verwenden. `npm run lint` prüft auch Formatierung; `npx prettier --write .` formatiert.

Projektregeln und Befehle: [AGENTS.md](AGENTS.md). Produkt: [PRODUCT_SPEC](docs/PRODUCT_SPEC.md). Schichten und Datenfluss: [ARCHITECTURE](docs/ARCHITECTURE.md). Paketfolge: [ROADMAP](docs/ROADMAP.md).

## GitHub Pages

In Settings → Pages **GitHub Actions** als Quelle auswählen. Nach Merge auf main baut, prüft und veröffentlicht `pages.yml` den Inhalt von `dist/` unter <https://sl3ndrr.github.io/m8e-calc/>. `ci.yml` prüft PRs und main einschließlich Chromium-Smoke am Base-Pfad. Die erste öffentliche Bereitstellung kann erst nach Merge geprüft werden.

## Theming und Design-Lab

`#/design` zeigt Material-3-Farbrollen, Typografie, Formen und alle Springs. Hell/System/Dunkel und Akzentfarbe sind persistent; alle Fonts werden lokal ausgeliefert. Details, Token-Regeneration, Motion-Abweichung und Testumfang: [docs/DESIGN.md](docs/DESIGN.md). Rechner-Modi bleiben Platzhalter.
