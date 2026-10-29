# Komponenten · AP3

`src/ui/index.ts` ist der öffentliche Einstiegspunkt. Die Modi importieren Bausteine aus `src/ui`; Fachlogik bleibt außerhalb. Jede Komponente hat eine gleichnamige `.tsx`- und `.css`-Datei. Die Hooks und reine SVG-Geometrie benötigen kein CSS. React Aria Components übernimmt Semantik, Press-, Hover-, Fokus-, Auswahl- und Overlayverhalten. Unsere CSS-Dateien übernehmen ausschließlich die Darstellung.

## Konventionen

- Props sind explizit typisiert. React-Aria-Konventionen verwenden `isDisabled`, `isSelected`, `defaultSelected`, `onPress`, `selectedKey`, `onSelectionChange`, `isOpen` und `onOpenChange`. Kontrollierte Werte erhalten ihren Änderungs-Callback; unkontrollierte Werte verwenden `default*`.
- Sichtbare Texte, ARIA-Namen, Beschreibungen und Fehler kommen vom Aufrufer über `t(key, params)` oder `t(key, locale, params)`. Neue Schlüssel immer in `de` und `en` ergänzen. Symbolnamen, Zahlen und API-Bezeichner sind technische Werte.
- Icon-only-Aktionen verlangen `aria-label`. `Icon` ist standardmäßig dekorativ; `label` macht es zu einem benannten Bild. `VisuallyHidden` liefert Text für Assistenztechnik.
- Label in Name: Sichtbare Zahlen, Kürzel, Definitionen, Einheiten und Badges gehören vollständig in den zugänglichen Aktionsnamen. Textinhalt bzw. `aria-labelledby` bevorzugen; wo ein expliziter Name nötig ist (etwa dekorativ animierte Zahlen oder eingeklappte Navigation), dieselbe Textquelle wie für die Anzeige verwenden. Eine lokalisierte Aktion ergänzt den Inhalt. Getrennte Textteile brauchen echte Leerzeichen. Vorhandene Live-Regions und MathML erhalten; keine zweite Statusausgabe zur Beschriftung ergänzen. Umsetzung und tatsächliche Prüfgrenzen: [WP04](WP04.md).
- Farben ausschließlich aus `--md-sys-color-*`; Radien aus `--md-sys-shape-*`; Bewegungen aus den AP2-Spring-Tokens. `StateLayer` erzeugt Hover/Focus/Pressed-Überlagerungen aus `currentColor`. Interaktive Ziele haben mindestens 48 × 48 px; visuelle Slider-/Switch-Griffe dürfen kleiner sein.
- Tastaturfokus benutzt einen 3-px-Primary-Ring mit Abstand; Forced Colors benutzt `Highlight`. React Aria veröffentlicht `data-focus-visible`. Der `FocusRing`-Wrapper eignet sich für zusammengesetzte Flächen.
- Full verwendet Spatial-Springs und Effects-Transitions. Reduced und Off deaktivieren räumliche CSS- und JS-Animationen. OS-Reduced-Motion begrenzt Full. `useSpring` retargetet, beendet unterbrochene Animationen und räumt beim Unmount auf. `useMediaQuery` abonniert und entfernt MediaQuery-Listener.
- Ein Card-Container ist keine Schaltfläche. Aktionen liegen als Buttons/Links innerhalb der Card. Input-Chips haben getrennte Aktion und Entfernen-Schaltfläche, keine verschachtelten Buttons. Tooltip-Inhalte enthalten keine interaktiven Aktionen; dafür Popover verwenden.
- Fehler von Formularfeldern verwenden `FieldError`, Beschreibungen `Text slot="description"`. Präfix/Suffix sind dekorativ; Einheiten und fachliche Bedeutung zusätzlich im Label oder Hilfstext erklären.

## Katalog und Tastatur

| Bausteine                             | Verhalten und Varianten                                                                                                                                                                                                                                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                                | filled, tonal, elevated, outlined, text; xs/sm/md/lg/xl; round/square; Enter und Leertaste. Toggle über `isSelected`/`defaultSelected` und `onSelectedChange`. Konstante Press-Grundform, leichte Skalierung der internen Oberfläche; ausgewählte Toggle-Form invertiert round/square ohne Radiusinterpolation. |
| IconButton, Icon                      | IconButton nutzt Button-Verhalten; lokale Material Symbols mit interpolierter FILL-Achse. Zwanzig vorhandene Glyphen als `IconName`-Union. Neue Glyphen zuerst in `scripts/subset-fonts.py` aufnehmen und lokal neu generieren.                                                                                 |
| ButtonGroup                           | React-Aria-Toolbar mit einem Tab-Einstieg und Pfeilnavigation. `connected` teilt eine feste Breite: Press verändert weder Zielbreite noch Nachbarlayout.                                                                                                                                                        |
| SegmentedControl                      | Native Radios über React Aria, ein Tab-Stopp, Pfeile mit Wraparound und Überspringen deaktivierter Optionen; Home/End zum ersten/letzten aktivierten Segment.                                                                                                                                                   |
| Fab, ExtendedFab, FabMenu             | FABs verwenden Button-Press-Verhalten; FAB-Menü verwendet MenuTrigger, Pfeile/Enter und Escape mit Fokus-Rückgabe.                                                                                                                                                                                              |
| NavigationRail                        | Links in zugeklappter/aufgeklappter Rail, `aria-current`, Textbadge und JS-Spring-Aktivpille; Tab/Enter für Navigation.                                                                                                                                                                                         |
| Switch, Checkbox                      | Native Eingaben mit React Aria, Leertaste, kontrolliert/unkontrolliert; Checkbox zusätzlich indeterminate/invalid.                                                                                                                                                                                              |
| Slider                                | Einzelwert, Pfeile/Home/End, Output, Drag-Anzeige, schrumpfender Griff; Input-Ziel 48 px.                                                                                                                                                                                                                       |
| Chip                                  | assist/filter/input; Filter toggelt, Input ruft `onRemove` auf. `removeLabel` beschreibt das entfernte Objekt. Der Aufrufer entfernt es aus seiner Collection.                                                                                                                                                  |
| TextField                             | filled/outlined, prefix/suffix, description/errorMessage; Standard-Textbearbeitung und native Formvalidierung oder `validationBehavior="aria"`.                                                                                                                                                                 |
| Select                                | Auswahl mit Label, Optionen, deaktivierten Keys; `searchable` verwendet ComboBox mit Eingabe, Filter, Pfeilen/Enter und Escape. Ohne Suche verwendet es Select/ListBox.                                                                                                                                         |
| Menu                                  | MenuTrigger, optionale Suche, deaktivierte Einträge, `onAction`. Pfeile/Enter/Escape; ArrowDown aus Suche fokussiert den ersten Treffer.                                                                                                                                                                        |
| Dialog, SideSheet                     | ModalOverlay mit Dialog und Titel, Fokuscontainment, Escape/Light-Dismiss und Fokus-Rückgabe. SideSheet unterstützt zusätzlich `mode="docked"` als benanntes Aside.                                                                                                                                             |
| Popover                               | React-Aria-Popover in DialogTrigger/MenuTrigger/Select/ComboBox-Kontext. Escape, Light-Dismiss und Fokus-Rückgabe gelten auch für verschachtelte Auswahl-Popover.                                                                                                                                               |
| Tooltip                               | Schlicht oder `rich`, öffnet bei Hover/Tastaturfokus, Beschreibung über React Aria; Trigger bleibt die einzige Aktion.                                                                                                                                                                                          |
| Snackbar                              | React-Aria-ToastRegion mit FIFO-Queue, genau einer sichtbaren Nachricht, Pause bei Hover/Fokus und F6/Shift+F6-Navigation. Undo ruft die Aktion einmal auf und schließt die Nachricht. Nachrichten mit Aktionen ohne Timeout einreihen. Informationsnachrichten optional mit mindestens 5000 ms.                |
| Card, List/ListItem, Divider          | Card filled/elevated/outlined. List ist GridList mit Pfeil-/Auswahlbedienung und deaktivierten Keys. Divider horizontal/vertikal mit Separator-Semantik.                                                                                                                                                        |
| LoadingIndicator                      | Indeterminierter ProgressBar mit zugänglichem Namen; fünf unterschiedliche SVG-Formen, 32 gemeinsame Kurvensegmente, kontinuierliche Pfadinterpolation und endlos retargeteter Spatial-Slow-Spring. Bei Reduced/Off statische Form.                                                                             |
| StateLayer, FocusRing, VisuallyHidden | Kompositionshilfen für Zustand, Fokus und unsichtbaren zugänglichen Text.                                                                                                                                                                                                                                       |

## Beispiele

Die `ui.*`-Demotexte im folgenden Beispiel gehören zur internen Galerie.
Produktaufrufer übergeben eigene fachliche i18n-Schlüssel; labexklusive Texte
werden im normalen Build nicht ausgeliefert.

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

Das interne `#/design` (Entwicklung oder `npm run build:gallery`) enthält die vollständige Komponentenmatrix. `src/app/galleryEntries.ts` definiert je Komponente alle unterstützten Zustände. Default, Hover, Focus, Pressed, Disabled, Selected und Error werden bei interaktiven/validierenden Bausteinen angezeigt; statische Bausteine bekommen keine erfundenen Auswahl- oder Fehlerzustände. Vorschau-Klassen sind auf die Galerie beschränkt; die Komponenten selbst verwenden reale React-Aria-State-Attribute. Varianten, Größen, Formen, indeterminate, beide Feldtypen, Chip-Arten und docked/modal ergänzen die Matrix. Overlays öffnen über ihre echten Trigger.

```sh
npm ci
npm run check
npx playwright install --with-deps chromium
npm run test:e2e
npm run build:gallery
npm run test:e2e:gallery
# Galerie-Preview in einem eigenen Terminal:
npm run preview:gallery -- --host 127.0.0.1 --port 4174 --strictPort
# Aufnahmen in einem weiteren Terminal:
npm run screenshots:gallery
```

Das Playwright-Skript speichert `docs/screenshots/components-{light,dark}.png` und Overlay-/Tooltip-/Snackbar-Ansichten je Thema. `GALLERY_URL` und `GALLERY_OUTPUT` überschreiben URL und Ziel. Lokale Fonts, Off/Reduced Motion und feste Viewportgröße machen die Aufnahmen reproduzierbar. CI bewahrt sie gemeinsam mit Playwright-Traces als Artefakte auf.

`components.test.tsx` prüft jeden exportierten Baustein mit Testing Library und axe sowie die interaktiven Tastaturabläufe. Hooks und SVG-Geometrie haben separate Tests. In jsdom ist ausschließlich die nicht berechenbare Color-Contrast-Regel ausgenommen; Playwright prüft im echten Browser alle axe-Regeln in Hell/Dunkel und im offenen Dialog. Die AP2-Regressionsprüfungen bleiben bestehen.

## Offen / Folge-Issues

- Rechner-Shell und Verlauf sind in AP4 implementiert; die Modusinhalte folgen den späteren Paketen.
- Weitere Material-Symbol-Glyphen erst bei konkreten Aktionen subsetten; kein externer Fontdownload zur Laufzeit.
- Snackbar kapselt die derzeit als UNSTABLE exportierte React-Aria-Toast-API. Bei deren Stabilisierung nur den Adapter ändern.
- Screenreader-Abnahme und weitere Browser/Plattformen bleiben ergänzend zur automatischen axe-/Chromium-Prüfung spätere Integrationsaufgaben.

## AP6 · Wiederverwendbares Keypad

`Keypad({ label, children })` liefert das zugängliche Tastenraster;
`KeypadKey({ id, label, colorRole, pressed, active, disabled, onPress, children })`
verwendet Button/React Aria. Rollen: digit, operator, equals, clear, function,
memory. `pressed` bildet globale Tastaturbefehle ab, `active` einen wartenden
Operator. Features legen Reihenfolge und Raster ausschließlich per CSS fest.

`CalculatorDisplay({ value, expression, copyLabel, resultLabel, expressionLabel,
error, onCopy })` zeigt eine Ausdruckszeile, animierte Zeichen mit tabellarischen
Ziffern, an gemessene Breite angepasste Schrift und ein Live-Output. Alle lokalisierten Texte
und die formatierte Zahl kommen vom Aufrufer; der Baustein kennt keine Engine.
AP8 kann dieselben Exporte aus `src/ui` verwenden.

Der Kopiername verwendet `value` plus `copyLabel`. Die animierten Ziffern bleiben
dekorativ; genau ein persistentes Live-Output meldet das Ergebnis bzw. den Fehler.
`copyLabel` bleibt ein Aktionsname ohne zusätzlichen Zahlenwert; die öffentliche
Prop-API ist unverändert.

AP11 ergänzt `SelectOption.group`: Optionen mit Gruppe werden in benannten ListBox-Sections mit Überschrift dargestellt und bleiben durchsuchbar. `historyStore.replace(id, data)` ersetzt einen Eintrag atomar unter Erhalt von ID und Pin (Umrechner-Ruheverlauf).

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

Die Komponentenbibliothek bleibt erhalten; nur das Lab wird aus der normalen
Auslieferung ausgeschlossen. Getrennte Build-/QA-Nachweise: [AP23.md](AP23.md).

## AP42 · Gemeinsamer Buttonvertrag

Button, IconButton und ihre Ableitungen behalten beim normalen Press/Release
ihre rollenbezogene Rundung. Der native Button bleibt untransformiertes,
unverändertes Klickziel (mindestens 48×48 px) mit äußerem Fokusring. Eine interne
Oberfläche enthält Hintergrund, Rand, Schatten, den geclippten State-Layer und
Inhalt. Ein einziger Transform skaliert sie synchron mit Button-Press-Tokens:
0,97 und vorhandenes Spatial Fast (421ms), einschließlich kleinem, geprüftem
Scale-Überschwingen (0,965 < Scale < 1,005). State-Layer nutzt Effects Fast;
kein Radius wird mit einem Spring interpoliert.
Paint-Anpassungen verwenden `--ui-button-background`, `--ui-button-border` und
`--ui-button-shadow`; die Form kommt weiterhin vom Radius des Buttons.
Abstände setzen `--ui-button-padding-block/inline`, die Randbreite
`--ui-button-border-width`. Das native Ziel selbst behält Padding null.
Connected-Gruppen ändern beim Press keine Flexbreiten.

Selected invertiert weiterhin round/square, setzt den Zielradius aber unmittelbar.
Es gibt keinen Spring zwischen Full und einem kleinen Radius. CSS-Transitions
setzen Press/Release vom aktuellen sichtbaren Wert fort, ohne Timer, Mindesthold
oder Verzögerung von React-Aria-Aktionen. Globale Keypad-Kürzel nutzen denselben
visuellen Pfad. Reduced/Off und OS-Reduktion unterdrücken die Skalierung und
beenden laufende CSS-Bewegung; Entfernen aus dem DOM beendet deren Animationen.
Details, gemessene Grenzen und Reproduktion: [AP42](AP42.md).

Full verwendet für bedienbare Oberflächen schon vor der Eingabe einen
Transform-Hinweis an den Compositor; dafür ist kein Hover-Frame erforderlich.
Disabled, Reduced, Off und OS-Reduktion entfernen den Hinweis.

Auch Radio-Segmente und der Theme-Thumb setzen ihre Selected-Radien diskret;
die räumliche Translation des Theme-Thumbs behält ihren bisherigen Spring.
Die AP36-Selected-Fälle prüfen deren echte Zwischenwerte bei Wiederholung.

Bei flächenfüllenden Umrechner-Aktionen in Scrollrastern liegt derselbe
Fokusring mit −4px Offset innerhalb der Karte, damit der Scrollclip ihn nicht
abschneidet. Der native Button trägt auch dort den Ring; seine isolierte
Stapelreihenfolge hält die gesamte animierte Oberfläche unter dem Fokusring.
AP19s gemeinsamer Bilddecoder prüft zusätzlich dessen tatsächliche Farbfläche.

Ein während Press/Release deaktivierter Button beendet auch die internen
Transitions unmittelbar und zeigt den neutralen Disabled-Zustand.

## AP44 · Verschachtelter AccentPicker

Der bestehende AccentPicker wird innerhalb des Einstellungsdialogs verwendet.
React Aria verwaltet den Overlaystapel und suspendiert den äußeren Fokusbereich
für das aktive Kind; es gibt keine zweite manuelle Fokusfalle. Der montierte
Popover-Rahmen enthält beim kalten Import einen benannten Ladedialog mit
Progressbar. Escape und Fokus-Rückgabe gelten auch dort, danach für Select,
Farbpanel und Einstellungen jeweils einzeln. `triggerRef` erlaubt dem
Einstellungsdialog dieselbe stabile Fokusadresse nach einem verbrauchten
Installationsprompt; geplante Rückgaben werden beim Unmount abgebrochen. [AP44](AP44.md) dokumentiert
Produktzugänge und Prüfgrenzen.

## AP45 · Overlaypräsenz und Effects

Dialog und Popover müssen beim Schließen montiert bleiben; `isOpen` steuert
React Aria, kein äußeres `isOpen &&` darf die Exitphase entfernen. Lazy Controller
können erst beim ersten Öffnen geladen werden und danach geschlossen montiert
bleiben. React Aria entfernt Portal und FocusScope nach der nativen Transition;
Exit-Inhalt ist inert und pointerdurchlässig. Motionbedingtes Transition-Cancel
verwirft ausschließlich den geschlossenen Scope, gewöhnliche Umkehr erhält ihn.
Der gemeinsame Ref-Adapter setzt Inertheit am gesamten Overlay einschließlich
der React-Aria-Dismiss-Buttons und räumt seinen lokalen Observer beim Unmount auf.
Die vorhandenen Fokus-/Escape-/Light-Dismiss-Verträge bleiben erhalten.
[AP45](AP45.md) enthält die verbindliche Matrix und Prüfgrenzen.

`Popover.onAfterClose` meldet die tatsächliche Entfernung eines Exit-Scopes,
solange der Controller montiert bleibt. Externer Komponenten-Unmount bricht
stattdessen alle geplanten Rückgaben ab.

Der Adapter erfasst noch selbst gehaltenen Fokus beim logischen Close vor
Inertheit. Popover verwendet den slotted React-Aria-Triggerref, Dialog das vor
seinem Mount aktive Ziel. Da Aria-Outside-Isolation den Trigger noch inert
halten kann, gibt er nach dem passiven Isolation-Cleanup Fokus zurück, damit
der nächste native Key den übergeordneten Scope erreicht. Nach Scope-Entfernung
prüft der gemeinsame Kaltstartfallback zusätzlich genau einen rAF. Reduced/Off
erfassen die eigene Rückgabe auch ohne data-exiting bei sofortiger Entfernung. Er ersetzt ausschließlich Body, das Ziel selbst oder den umgebenden
Dialog. Neuer nativer Input, Wiederöffnen und Komponenten-Unmount brechen Frame
und Listener ab. Neuer aktiver Fokus bleibt erhalten. React Aria verwaltet
weiterhin Containment, Overlaystapel und reguläre Rückgabe.
