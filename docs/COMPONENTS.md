# Komponenten · AP3

`src/ui/index.ts` ist der öffentliche Einstiegspunkt. Die Modi importieren Bausteine aus `src/ui`; Fachlogik bleibt außerhalb. Jede Komponente hat eine gleichnamige `.tsx`- und `.css`-Datei. Die Hooks und reine SVG-Geometrie benötigen kein CSS. React Aria Components übernimmt Semantik, Press-, Hover-, Fokus-, Auswahl- und Overlayverhalten. Unsere CSS-Dateien übernehmen ausschließlich die Darstellung.

## Konventionen

- Props sind explizit typisiert. React-Aria-Konventionen verwenden `isDisabled`, `isSelected`, `defaultSelected`, `onPress`, `selectedKey`, `onSelectionChange`, `isOpen` und `onOpenChange`. Kontrollierte Werte erhalten ihren Änderungs-Callback; unkontrollierte Werte verwenden `default*`.
- Sichtbare Texte, ARIA-Namen, Beschreibungen und Fehler kommen vom Aufrufer über `t(key, params)` oder `t(key, locale, params)`. Neue Schlüssel immer in `de` und `en` ergänzen. Symbolnamen, Zahlen und API-Bezeichner sind technische Werte.
- Icon-only-Aktionen verlangen `aria-label`. `Icon` ist standardmäßig dekorativ; `label` macht es zu einem benannten Bild. `VisuallyHidden` liefert Text für Assistenztechnik.
- Farben ausschließlich aus `--md-sys-color-*`; Radien aus `--md-sys-shape-*`; Bewegungen aus den AP2-Spring-Tokens. `StateLayer` erzeugt Hover/Focus/Pressed-Überlagerungen aus `currentColor`. Interaktive Ziele haben mindestens 48 × 48 px; visuelle Slider-/Switch-Griffe dürfen kleiner sein.
- Tastaturfokus benutzt einen 3-px-Primary-Ring mit Abstand; Forced Colors benutzt `Highlight`. React Aria veröffentlicht `data-focus-visible`. Der `FocusRing`-Wrapper eignet sich für zusammengesetzte Flächen.
- Full verwendet Spatial-Springs und Effects-Transitions. Reduced und Off deaktivieren räumliche CSS- und JS-Animationen. OS-Reduced-Motion begrenzt Full. `useSpring` retargetet, beendet unterbrochene Animationen und räumt beim Unmount auf. `useMediaQuery` abonniert und entfernt MediaQuery-Listener.
- Ein Card-Container ist keine Schaltfläche. Aktionen liegen als Buttons/Links innerhalb der Card. Input-Chips haben getrennte Aktion und Entfernen-Schaltfläche, keine verschachtelten Buttons. Tooltip-Inhalte enthalten keine interaktiven Aktionen; dafür Popover verwenden.
- Fehler von Formularfeldern verwenden `FieldError`, Beschreibungen `Text slot="description"`. Präfix/Suffix sind dekorativ; Einheiten und fachliche Bedeutung zusätzlich im Label oder Hilfstext erklären.

## Katalog und Tastatur

| Bausteine                             | Verhalten und Varianten                                                                                                                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Button                                | filled, tonal, elevated, outlined, text; xs/sm/md/lg/xl; round/square; Enter und Leertaste. Toggle über `isSelected`/`defaultSelected` und `onSelectedChange`. Radius und leichte Skalierung beim Drücken; ausgewählte Toggle-Form invertiert round/square.                                      |
| IconButton, Icon                      | IconButton nutzt Button-Verhalten; lokale Material Symbols mit interpolierter FILL-Achse. Zwanzig vorhandene Glyphen als `IconName`-Union. Neue Glyphen zuerst in `scripts/subset-fonts.py` aufnehmen und lokal neu generieren.                                                                  |
| ButtonGroup                           | React-Aria-Toolbar mit einem Tab-Einstieg und Pfeilnavigation. `connected` teilt eine feste Breite: gedrückte Aktion wächst, Nachbarn schrumpfen mit Spatial Fast.                                                                                                                               |
| SegmentedControl                      | Native Radios über React Aria, ein Tab-Stopp, Pfeile mit Wraparound und Überspringen deaktivierter Optionen; Home/End zum ersten/letzten aktivierten Segment.                                                                                                                                    |
| Fab, ExtendedFab, FabMenu             | FABs verwenden Button-Press-Verhalten; FAB-Menü verwendet MenuTrigger, Pfeile/Enter und Escape mit Fokus-Rückgabe.                                                                                                                                                                               |
| NavigationRail                        | Links in zugeklappter/aufgeklappter Rail, `aria-current`, Textbadge und JS-Spring-Aktivpille; Tab/Enter für Navigation.                                                                                                                                                                          |
| Switch, Checkbox                      | Native Eingaben mit React Aria, Leertaste, kontrolliert/unkontrolliert; Checkbox zusätzlich indeterminate/invalid.                                                                                                                                                                               |
| Slider                                | Einzelwert, Pfeile/Home/End, Output, Drag-Anzeige, schrumpfender Griff; Input-Ziel 48 px.                                                                                                                                                                                                        |
| Chip                                  | assist/filter/input; Filter toggelt, Input ruft `onRemove` auf. `removeLabel` beschreibt das entfernte Objekt. Der Aufrufer entfernt es aus seiner Collection.                                                                                                                                   |
| TextField                             | filled/outlined, prefix/suffix, description/errorMessage; Standard-Textbearbeitung und native Formvalidierung oder `validationBehavior="aria"`.                                                                                                                                                  |
| Select                                | Auswahl mit Label, Optionen, deaktivierten Keys; `searchable` verwendet ComboBox mit Eingabe, Filter, Pfeilen/Enter und Escape. Ohne Suche verwendet es Select/ListBox.                                                                                                                          |
| Menu                                  | MenuTrigger, optionale Suche, deaktivierte Einträge, `onAction`. Pfeile/Enter/Escape; ArrowDown aus Suche fokussiert den ersten Treffer.                                                                                                                                                         |
| Dialog, SideSheet                     | ModalOverlay mit Dialog und Titel, Fokuscontainment, Escape/Light-Dismiss und Fokus-Rückgabe. SideSheet unterstützt zusätzlich `mode="docked"` als benanntes Aside.                                                                                                                              |
| Popover                               | React-Aria-Popover in DialogTrigger/MenuTrigger/Select/ComboBox-Kontext. Escape, Light-Dismiss und Fokus-Rückgabe gelten auch für verschachtelte Auswahl-Popover.                                                                                                                                |
| Tooltip                               | Schlicht oder `rich`, öffnet bei Hover/Tastaturfokus, Beschreibung über React Aria; Trigger bleibt die einzige Aktion.                                                                                                                                                                           |
| Snackbar                              | React-Aria-ToastRegion mit FIFO-Queue, genau einer sichtbaren Nachricht, Pause bei Hover/Fokus und F6/Shift+F6-Navigation. Undo ruft die Aktion einmal auf und schließt die Nachricht. Nachrichten mit Aktionen ohne Timeout einreihen. Informationsnachrichten optional mit mindestens 5000 ms. |
| Card, List/ListItem, Divider          | Card filled/elevated/outlined. List ist GridList mit Pfeil-/Auswahlbedienung und deaktivierten Keys. Divider horizontal/vertikal mit Separator-Semantik.                                                                                                                                         |
| LoadingIndicator                      | Indeterminierter ProgressBar mit zugänglichem Namen; fünf unterschiedliche SVG-Formen, 32 gemeinsame Kurvensegmente, kontinuierliche Pfadinterpolation und endlos retargeteter Spatial-Slow-Spring. Bei Reduced/Off statische Form.                                                              |
| StateLayer, FocusRing, VisuallyHidden | Kompositionshilfen für Zustand, Fokus und unsichtbaren zugänglichen Text.                                                                                                                                                                                                                        |

## Beispiele

```tsx
import { Button, TextField, Select, Snackbar, createSnackbarQueue } from '../ui';

<Button variant="tonal" size="lg" shape="square" onPress={save}>
  {t('ui.action', locale)}
</Button>
<Button isSelected={selected} onSelectedChange={setSelected}>
  {t('ui.selected', locale)}
</Button>
<TextField label={t('ui.name', locale)} variant="filled"
  description={t('ui.help', locale)} isInvalid={invalid}
  validationBehavior="aria" errorMessage={t('ui.invalid', locale)} />
<Select label={t('accent.variant', locale)} searchable options={options}
  selectedKey={key} onSelectionChange={setKey} />

const queue = createSnackbarQueue();
queue.add({ message: t('ui.saved', locale), actionLabel: t('ui.undo', locale),
  onAction: restore });
<Snackbar queue={queue} label={t('ui.notifications', locale)}
  closeLabel={t('ui.close', locale)} />
```

Ein Dialog kann kontrolliert (`isOpen`/`onOpenChange`) oder innerhalb des React-Aria-`DialogTrigger` benutzt werden. Ein Standalone-Popover braucht `triggerRef` und einen expliziten Open-State; innerhalb eines Trigger-Kontexts erhält es diese automatisch. Popover-Inhalte mit Formularaktionen in einen benannten React-Aria-Dialog einbetten.

## AP2-Kompatibilität

ThemeSwitch verwendet SegmentedControl und Icon. Die drei Optionen, Systemstatus, Wraparound/Home/End, ein Tab-Stopp und Theme-Reveal bleiben erhalten. React Aria verwendet echte Radio-Inputs: Tests prüfen `checked` statt ein redundantes `aria-checked`-Attribut.

AccentPicker verwendet Button/IconButton, Slider, Select und Popover/DialogTrigger. Die zentrierte Platzierung und die 16 Seeds, HCT-Hue-Berechnung, Color-Input, Palette, Kontrast/Variante und Reset bleiben erhalten. Reset verändert weiterhin ausschließlich Farbeinstellungen; der erste Seed erhält beim Öffnen Fokus. Die Auswahlfelder haben dieselben Werte, verwenden jetzt zugängliche React-Aria-Popover statt nativer Select-Listen.

## Galerie, Screenshots und Prüfungen

`#/design` enthält die vollständige Komponentenmatrix. `src/app/galleryEntries.ts` definiert je Komponente alle unterstützten Zustände. Default, Hover, Focus, Pressed, Disabled, Selected und Error werden bei interaktiven/validierenden Bausteinen angezeigt; statische Bausteine bekommen keine erfundenen Auswahl- oder Fehlerzustände. Vorschau-Klassen sind auf die Galerie beschränkt; die Komponenten selbst verwenden reale React-Aria-State-Attribute. Varianten, Größen, Formen, indeterminate, beide Feldtypen, Chip-Arten und docked/modal ergänzen die Matrix. Overlays öffnen über ihre echten Trigger.

```sh
npm ci
npm run check
npx playwright install --with-deps chromium
npm run test:e2e
# In einem separaten Terminal:
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
npm run screenshots:gallery
```

Das Playwright-Skript speichert `docs/screenshots/components-{light,dark}.png` und Overlay-/Tooltip-/Snackbar-Ansichten je Thema. `GALLERY_URL` und `GALLERY_OUTPUT` überschreiben URL und Ziel. Lokale Fonts, Off/Reduced Motion und feste Viewportgröße machen die Aufnahmen reproduzierbar. CI bewahrt sie gemeinsam mit Playwright-Traces als Artefakte auf.

`components.test.tsx` prüft jeden exportierten Baustein mit Testing Library und axe sowie die interaktiven Tastaturabläufe. Hooks und SVG-Geometrie haben separate Tests. In jsdom ist ausschließlich die nicht berechenbare Color-Contrast-Regel ausgenommen; Playwright prüft im echten Browser alle axe-Regeln in Hell/Dunkel und im offenen Dialog. Die AP2-Regressionsprüfungen bleiben bestehen.

## Offen / Folge-Issues

- Rechner-Shell und Verlauf sind in AP4 implementiert; die Modusinhalte folgen den späteren Paketen.
- Weitere Material-Symbol-Glyphen erst bei konkreten Aktionen subsetten; kein externer Fontdownload zur Laufzeit.
- Snackbar kapselt die derzeit als UNSTABLE exportierte React-Aria-Toast-API. Bei deren Stabilisierung nur den Adapter ändern.
- Screenreader-Abnahme und weitere Browser/Plattformen bleiben ergänzend zur automatischen axe-/Chromium-Prüfung spätere Integrationsaufgaben.
