# Designfundament · AP2 Theming

`#/design` ist das interne Design-Lab für Komponentenentwicklung und Regressionen.
Es ist bei `npm run dev` sowie im expliziten `npm run build:gallery` verfügbar;
der normale Produktionsbuild enthält vier funktionsfähige Rechnermodi und
Einstellungen. Buildgrenze und Testziele: [AP23.md](AP23.md).

## Farbe

`src/styles/buildScheme.ts` exportiert die reine Funktion `buildScheme(seedHex, variant, isDark, contrast)`. Seed-Eingaben sind sechsstellige Hex-Farben. Varianten: `tonalSpot` (Standard), `expressive`, `vibrant`, `neutral`. Kontrast: `standard` → 0, `medium` → 0,5, `high` → 1. Das eingecheckte npm-Lockfile fixiert Material Color Utilities; Änderungen am Algorithmus werden über Snapshots sichtbar.

Alle 49 öffentlichen M3-Systemrollen werden mit `MaterialDynamicColors` aus dem jeweiligen dynamischen Schema abgeleitet:

- Hintergrund, Surface, Surface Dim/Bright, Surface Variant, alle fünf Surface-Container und deren Textrollen.
- Primary, Secondary, Tertiary und Error inklusive `on-*`, Container und `on-*-container`.
- Primary/Secondary/Tertiary Fixed, Fixed Dim, On Fixed und On Fixed Variant.
- Inverse Surface, Inverse On Surface, Inverse Primary, Surface Tint, Outline, Outline Variant, Shadow und Scrim.

Die CSS-Namen sind `--md-sys-color-*` in kebab-case. `applyTheme` setzt sie auf `:root`, aktualisiert `color-scheme` und `meta[name=theme-color]`. Seed-Literale liegen ausschließlich in `src/styles/seeds.ts` als Eingaben zum Algorithmus; UI-Farben verwenden Rollen. Lokale Rollen für Vorschau und Swatches werden ebenfalls aus `buildScheme` gespeist.

`@property` registriert Systemrollen als vererbte Farben. Akzentänderungen interpolieren die Rollen mit Effects Default. Browser ohne registrierte Custom Properties zeigen die neuen Rollen direkt; Preview-/Swatch-Hintergründe besitzen zusätzlich eine CSS-Transition. Reduced/Off verzichtet auf Farbinterpolation. Kontrasttests prüfen WCAG-Textkontrast ≥ 4,5:1 für die wesentlichen On-/Hintergrundpaare einschließlich Container, Fixed und Inverse, in allen Varianten, Hell/Dunkel und allen Kontraststufen. Outline dient nicht als Textrolle; der sichtbare Tastaturfokus verwendet Primary.

## Persistenz und erster Paint

`useSettingsStore` nutzt Zustand `persist`. Schlüssel: `m8e-calc.settings`, Version 1. Persistiert werden ausschließlich `themeMode`, `accent`, `schemeVariant`, `contrast`, `motionLevel`. Standard: System, Iris `#6750a4`, Tonal Spot, Standardkontrast; Motion Full oder Reduced bei `prefers-reduced-motion`.

Version 0 migriert `theme` → `themeMode` und `seed` → `accent`. Jeder rehydrierte Wert wird validiert; unbekannte zukünftige Versionen werden verworfen. Storage-Zugriffe sind in try/catch gekapselt: beschädigtes JSON, verweigerter Zugriff und Quota-Fehler blockieren die Oberfläche nicht. Einstellungen bleiben dann im Speicher bedienbar.

Der separate Cache `m8e-calc.theme-cache` hält **beide** vollständigen Paletten, eine Cache-Version und den Fingerprint `accent:variant:contrast`. So funktioniert System-Folgen auch bei einem anderen Systemmodus nach einem Neustart. Theme-/Motion-Wechsel benötigen keine neue Palette.

Vite ersetzt `<!-- theme-bootstrap -->` in `index.html` mit einem kleinen Inline-Skript und beiden Standardpaletten, vor Styles und dem App-Modul. Das Skript validiert Settings und alle gecachten Rollen, wählt sofort den wirksamen Modus und setzt Farbrollen, `color-scheme` und Theme-Meta. App-Startup wendet anschließend die gleiche Berechnung an; CSS-Transitions beginnen erst nach `data-theme-ready`. Bei fehlendem oder ungültigem Cache gilt eine passende Standardpalette bis zur App-Initialisierung. Vollständig verweigerte Persistenz kann keinen benutzerdefinierten Seed über Neustarts erhalten.

Das Bootstrap-Skript ist bewusst ohne Laufzeitimporte; Tests prüfen Migration und Cache-Validierung. Der E2E-FOUC-Test blockiert alle App-JavaScript-Assets und prüft die bereits korrekten gecachten Rollen und den aktuellen Systemmodus.

## Typografie und lokale Fonts

Alle Fonts werden lokal ausgeliefert, mit `font-display: swap`. Kritische WOFF2-Dateien werden in `index.html` vorgeladen; Vite schreibt die URLs auf gehashte Assets unter dem konfigurierten Base-Pfad um. Keine Font-CDNs oder externen Runtime-Requests.

| Familie                  | Quelle                             | Subset / Achsen                                                                                             |
| ------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Roboto Flex              | `@fontsource-variable/roboto-flex` | Latin für de/en; `wght` 100–1000, `wdth` 25–151, `opsz` 8–144; andere Achsen auf ihre Standardwerte fixiert |
| Roboto Mono              | `@fontsource-variable/roboto-mono` | Latin; variable `wght` 100–700; Ausdrücke und technische Werte                                              |
| Material Symbols Rounded | `material-symbols`                 | Acht verwendete Icons mit Ligaturen und Fill-Glyphen; variable `FILL`, `wght`, `GRAD`, `opsz`               |

Die Font-Lizenzen liegen neben den Assets in `src/styles/fonts/`. Reproduzierbare Regeneration: `python -m pip install fonttools brotli`, dann `python scripts/subset-fonts.py`. Bei neuen Icons die Liste im Skript ergänzen und neu subsetten. GSUB-Layout-Closure ist deaktiviert, damit die ASCII-Zeichen der Ligaturen nicht tausende ungenutzte Icons nachziehen; die verwendeten Basis- und Fill-Glyphen werden ausdrücklich behalten.

`typeScale.ts` definiert 15 M3-Baseline- und 15 Emphasized-Stile für Display/Headline/Title/Body/Label, jeweils Large/Medium/Small. Pro Stil: Font, Größe, Zeilenhöhe, Gewicht, Tracking und Achsen. CSS-Tokens: `--md-sys-typescale-<role>-<size>[-emphasized]-*`; Utilities: `.type-<role>-<size>[-emphasized]`.

Emphasized Display/Headline nutzt Gewicht 500, Body 500, Title/Label gemäß Rolle 500 oder 700. Die Web-Adaption setzt `opsz` passend zur Größe, `wdth` normalerweise 100; Emphasized Display/Headline 95 als bewusste gestalterische Wahl. `.expression` verwendet Roboto Mono und tabellarische Ziffern (`tnum`). Die Lab-Ausdrücke sind reine Schriftproben.

WP-08 verwendet für den wissenschaftlichen Hauptwert `type-display-small` mit
tabellarischen Ziffern und Primary. Vollständiger Text bleibt selektierbar und
darf umbrechen, ohne Ellipse oder neue Animation. Formel/KaTeX sind ergänzend
beschriftet; ihre kanonische Zahlenschreibweise bestimmt nicht die Hauptanzeige.
Format-/Ansagevertrag: [SCIENTIFIC_MODE.md](SCIENTIFIC_MODE.md), tatsächliche
Prüfgrenzen und offene visuelle Abnahme: [WP08.md](WP08.md).

## Formen

WP-09 erhält Umrechnerzahlen als zusammenhängende Zeile in einem eigenen,
tastaturzugänglichen Scrollbereich; Namen und Symbol-/Kopierzeile behalten ihre
Hierarchie. Swap erhält eigenen Gridplatz und ausschließlich die gemeinsame
AP42-Pressoberfläche. Keine Feature-Radius-/Rotationsanimation oder neuen
Farb-/Shape-/Motionwerte. Details und tatsächliche Prüfgrenzen:
[CONVERT_MODE](CONVERT_MODE.md), [WP09](WP09.md).

`shapes.ts` und `tokens.css` definieren None 0, Extra Small 4, Small 8, Medium 12, Large 16, **Large Increased 20**, Extra Large 28, **Extra Large Increased 32**, **Extra Extra Large 48**, Full 9999 px. Utilities: `.shape-<name>`. `.shape-squircle` setzt ausschließlich innerhalb von `@supports (corner-shape: squircle)` die ergänzende Corner-Form; der normale Radius bleibt der sichere Standard.

## Motion und Abweichung vom Auftrag

Die im Auftrag genannten räumlichen Springs 1400/700/300 mit Dämpfung 0,9 entsprechen dem offiziellen **Standard-Schema**. Gemäß der gewünschten Priorität der offiziellen Spezifikation verwendet AP2 stattdessen die offiziellen **Expressive-Tokens**:

| Familie                               | Fast       | Default    | Slow      |
| ------------------------------------- | ---------- | ---------- | --------- |
| Spatial: Steifigkeit / Dämpfungsratio | 800 / 0,6  | 380 / 0,8  | 200 / 0,8 |
| Effects: Steifigkeit / Dämpfungsratio | 3800 / 1,0 | 1600 / 1,0 | 800 / 1,0 |

`springToLinear(stiffness, damping)` löst den gedämpften Oszillator analytisch bei Masse 1 und Anfangsgeschwindigkeit 0. Die Dauer reicht bis zu einer dauerhaft unter 0,1 % liegenden Restamplitude; der Stop erfolgt nicht an einem zufälligen Nulldurchgang. Abtastung mit 240 Hz, letzter Wert exakt 1. Spatial darf leicht überschwingen, Effects ist kritisch gedämpft und monoton. Ausgabe: `{ easing: 'linear(...)', duration: <Millisekunden>, samples }`.

CSS-Properties: `--md-sys-motion-<spatial|effects>-<fast|default|slow>-<duration|easing|stiffness|damping>`. JS-Animationen verwenden `motion`; dort wird die Ratio in den Dämpfungskoeffizienten `2 × ratio × √stiffness` umgerechnet. Motion-Demos brechen laufende Animationen bei Änderungen der Animationsstufe oder OS-Präferenz ab.

- **Full:** Springs, Thumb-Bewegung/Formwechsel, Farbinterpolation, kreisförmiger Theme-Reveal.
- **Reduced:** ausschließlich Opacity-Fades in den Demos; keine räumliche Bewegung, Thumb-Wechsel oder Farbinterpolation. Theme-Wechsel sofort.
- **Off:** alles sofort, keine Animation.

`prefers-reduced-motion` setzt den Standard auf Reduced und begrenzt auch ein zuvor gespeichertes Full auf Reduced. Off bleibt Off. CSS- und JS-Pfade respektieren dieselbe wirksame Stufe.

## ThemeSwitch und AccentPicker

ThemeSwitch: drei Segmente Sonne / Auto / Mond; `radiogroup` mit `radio`, `aria-checked` und einem Tab-Stopp. Pfeile bewegen mit Wraparound, Home/End springen zum ersten/letzten Segment. Tooltips und die ARIA-Beschriftung des Systemsegments zeigen den live wirksamen Modus. Der Thumb verwendet Spatial Fast und Form-Tokens.

Theme-Wechsel mit View Transitions: Kreis vom Mittelpunkt des Schalters bis zum äußersten Viewport-Eckpunkt. Ein neuer Wechsel überspringt den vorherigen; veraltete Callbacks dürfen den zuletzt gewählten Modus nicht überschreiben. Während des Reveals wird die Rollen-Transition deaktiviert, damit die neue Ansicht die endgültigen Farben besitzt. Ohne View Transitions überblendet ein inertes, für Assistenztechnik verstecktes Snapshot-Overlay die alte Ansicht. Reduced/Off wechselt synchron.

AccentPicker: React-Aria-Popover mit Escape/Light-Dismiss, Fokus auf der ersten Seed-Farbe beim Öffnen. 16 benannte Seeds, nativer Color-Input und wahrnehmungsbasierter HCT-Hue-Regler, Live-Vorschau Primary/Secondary/Tertiary, Variante und Kontrast. „Farben zurücksetzen“ setzt nur die Farbeinstellungen zurück und erhält Theme-/Motion-Auswahl.

## Generierung und Verifikation

`npm run tokens` generiert und formatiert `src/styles/tokens.css` aus den zentralen Definitionen. Die Datei ist eingecheckt; die Tokenwerte werden nicht in Komponenten dupliziert. `npm run check` prüft lint, Typen, Unit-/UI-Tests und Build; danach `npm run test:e2e` gegen den Produktionsbuild.

Browserprüfungen: Persistenz, Tastatursteuerung, live `emulateMedia`, FOUC ohne App-JS, Reduced Motion, Fallback/rasche Wechsel, beschädigter Storage, lokale Fonts, Screenshots Hell/Dunkel/Popover und schmale Breiten. Der bestehende Smoke prüft weiterhin alle Routen, Laufzeitfehler und externe Requests. Screenshots werden als CI-Artefakte aufbewahrt; geprüfte Ansichten liegen zusätzlich in `docs/screenshots/theming-{light,dark,accent-picker}.png`.

## Quellen

- [M3 Motion-Spezifikation](https://m3.material.io/styles/motion/overview/specs).
- [Offizielle AndroidX ExpressiveMotionTokens](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ExpressiveMotionTokens.kt), v0_14_0, geprüft am 13.10.2026.
- [Offizielle M3 Typescale-Tokens](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/TypeScaleTokens.kt).
- [Material Color Utilities](https://github.com/material-foundation/material-color-utilities).
- [Fontsource Roboto Flex](https://fontsource.org/fonts/roboto-flex) und [Variable-Font-Achsen](https://fontsource.org/docs/api/variable).

## Offen / Folge-Issues

AP3 erweitert das allgemeine Komponenten-System und Accessibility-Hardening. Die vollständige Shell/Verlauf bleibt AP4; Engines und Modusinhalte folgen ihren Paketen. PWA/Offline, plattformübergreifende Browserabnahme und UI-Skalierung bleiben gemäß Roadmap späteren Paketen vorbehalten.

## AP3-Komponenten

Die Implementierung und Konventionen der wiederverwendbaren Bausteine stehen in [COMPONENTS.md](COMPONENTS.md). ThemeSwitch verwendet nun React-Aria-Radios; AccentPicker verwendet die neuen Buttons, Slider und Selects bei unveränderter Settings-/Reset-Logik. Die Galerie enthält alle unterstützten Zustände und Varianten sowie live bedienbare Overlays.

## AP4-Shell-Ergänzungen

Die Settings nutzen jetzt Version 2 (Version 0/1 wird migriert) und ergänzen Sprache, Zahlenformat und Verlaufslimit. Der frühe Theme-Bootstrap akzeptiert alle drei bekannten Versionen. Die Shell skaliert die root-Schrift von 12 bis 32 px, mit Full HD als 16-px-Referenz und Höhenbegrenzung für Ultrawide. Shape-Tokens verwenden jetzt rem, genauso wie die Typografie. NavigationRail kann die Aktivpille mit `scaled` in rem-Schritten animieren; die Galerie behält ihre bisherigen px-Slots.

Das lokale Material-Symbol-Subset enthält die zwölf zusätzlichen Shell-Glyphen (Rechnermodi, Verlauf, Einstellungen, Navigation und Verlaufsaktionen), insgesamt zwanzig. `scripts/subset-fonts.py` bleibt die Quelle. Die vier Modus-Chunks zeigen ausschließlich Leerzustände; die Verlaufs-API, Shell und Einstellungen stehen in `ARCHITECTURE.md`.

## AP15 · Kontrast und Browser-Fallbacks

Die vollständige Matrix bestätigt die vorhandenen M3-Textrollen auf sämtlichen
Surface-Ebenen (Minimum 4,57:1 am Ausgangsstand). Funktionale Outline-Ränder
verfehlen das UI-Ziel in dunklen Standard-Paletten knapp und werden nun auf

> =3:1 abgesichert. `scripts/qa-contrast.mjs` prüft sämtliche 16 Seeds × vier
> Varianten × drei Kontraststufen × zwei Themen mit WCAG-sRGB-Luminanz, einschließlich
> Fixed-/Container-/Inverse-Paaren. Paletten-Snapshots bleiben als Zusatzkontrolle
> erhalten. Native Animationen auf dem Startpfad verwenden die gleichen zentralen
> Spring-Tokens und unterstützen Abbruch sowie Reduced/Off.

`browserMotion.ts` erkennt die Unterstützung eines Easing-Werts vor Übergabe an
WAAPI und verwendet sonst `ease-out`. Der vorhandene View-Transitions-Fallback
und das `@supports (corner-shape: squircle)` bleiben bestehen. Reduced/Off gilt in
allen Pfaden. Browserzoom erhält mindestens die konfigurierte Standardschrift.

## AP18 · Teilen

Das lokale Material-Symbol-Subset ergänzt `share` (21 Symbole). Quelle bleibt
`scripts/subset-fonts.py`; IconButton und Tooltip verwenden die vorhandenen
Fokus-, Farb- und Formtokens. Die sekundäre Aktion nutzt On Surface Variant
und mindestens 48×48 px Bedienfläche. Keine externen Assets.

## AP19 · Zahlen und Tasten

Zahlen verwenden gemessene Fontbreiten mit seitlicher Tintenreserve und einem
begrenzten Animationsviewport. Rechentasten behalten ihre rollenbezogene
Grundform auch bei Press/Active; gemeinsame Motion-/Shape-Tokens gelten auch
im wissenschaftlichen Tastenfeld. Konzept und reproduzierbare Browsernachweise:
[AP19.md](AP19.md).

## AP20 · Checkbox und Theme-Schalter

Die gemeinsame Checkbox definiert eine 24px-Border-Box ohne Flex-Shrink und
zentriert Haken (20px, Zeilenhöhe 1) sowie Indeterminate-Strich im 20px-Innenraum.
Beide dekorativen Markierungen bleiben für die kurze Effects-Fast-Überblendung
montiert. Nur Full ohne OS-Reduktion ergänzt eine dezente Skalierung; Reduced/Off
wechseln gemäß den globalen Motionregeln sofort. Invalid-Auswahl verwendet
Error/On Error; Hover, Pressed, Fokus und Disabled bleiben React-Aria-Zustände.

ThemeSwitch zeigt genau Sonne / Auto / Mond. Der aktuelle Systemzustand bleibt
im zugänglichen Namen und Tooltip des Auto-Segments, ohne zusätzlichen sichtbaren
Indikator. Tests und Bildreproduktion: [AP20.md](AP20.md).

## AP42 · Press ohne Formverlust

Normales Button-Feedback verändert keine Shape-Geometrie. Die zentralen
`--md-sys-motion-button-press-*`-Tokens koppeln 0,97 Skalierung an den vorhandenen
Spatial-Fast-Spring (421ms). Sein Scale-Überschwingen bleibt zwischen 0,965 und
1,005; kein Radius verwendet diese Kurve. State-Layer nutzt Effects Fast.
Die globalen Spatial-/Effects-Springs bleiben unverändert.
Klickziel und Fokusring stehen still; eine gemeinsame Oberfläche mitsamt Inhalt skaliert.
Selected-Formen wechseln diskret zwischen den vorhandenen Shape-Endpunkten.
State-Layer erbt den Radius der Oberfläche und bleibt innerhalb ihrer Rundung.
Die Oberfläche liegt innerhalb des isolierten Buttons unter dessen nativem
Fokusring; das gilt auch für innen liegende Ringe in Scrollrastern.
Full bereitet bedienbare Oberflächen vor der Eingabe mit `will-change: transform`
vor; Disabled, Reduced, Off und OS-Reduktion entfernen den Hinweis.
Vertrag und Messnachweise: [COMPONENTS](COMPONENTS.md), [AP42](AP42.md).

Auch Radio-Segmente und der Theme-Thumb setzen ihre Selected-Radien diskret;
die räumliche Translation des Theme-Thumbs behält ihren bisherigen Spring.
Die AP36-Selected-Fälle prüfen deren echte Zwischenwerte bei Wiederholung.

## AP44 · Akzentzugang

Im Produkt öffnet Einstellungen → Erscheinungsbild denselben AccentPicker.
ThemeSwitch bleibt in der Shell; das interne Lab behält seine Demonstration.
SettingsDialog und AccentPanel bleiben lazy, die Farblogik unverändert.
Prüfstatus und Grenzen: [AP44](AP44.md).

## AP45 · Gemeinsame Bewegung

Die kurze verbindliche [Bewegungsmatrix](AP45.md) ergänzt den bestehenden
Motionvertrag: Overlay-Opacity und Zustandsfarben verwenden monotones Effects
Fast. Dialog/Backdrop und gemeinsame Popover haben symmetrische Enter-/Exit-
Transitions; ihre Platzierung bleibt stabil. Reduced/Off zeigen hier unmittelbar
den Zielzustand. CSS und JS respektieren die wirksame OS-Begrenzung.
Selected-Radien bleiben diskret; Sliderwerte und Thumbposition bleiben direkt.
