# Komfort · AP14

Alle vier Modi nutzen die Befehlspalette (Strg+K, auf macOS auch Cmd+K), die
zentrale Kürzelübersicht (`?`), versionierte Permalinks, UI-Größe und Präsentation.
Die Palette sucht per Unicode-normalisierter Subsequenz mit zusammenhängenden
Treffern und Wortanfang-Bonus. Modi, Theme, Akzent, Verlauf, JSON-Export,
Einstellungen, Präsentation sowie alle wissenschaftlichen Registry-Funktionen
und Konstanten sind durchsuchbar. Eine vollständige Umrechnung wie `5 km in mi`
zeigt das Ergebnis direkt und öffnet bei Enter den passenden Umrechner-Zustand.
Konstanten/Funktionen werden an der Auswahl des wissenschaftlichen Editors
eingefügt; aus anderen Modi öffnet die Palette dafür Wissenschaftlich.

Der Dialog enthält eine ARIA-Combobox mit `aria-activedescendant` und Listbox.
Pfeile wählen mit Wraparound, Enter führt aus, Escape oder erneutes Strg/Cmd+K schließt. React Aria hält
den Fokus im Modal und stellt den Ausgangsfokus wieder her; Einfügeaktionen
fokussieren anschließend den Editor. Animation und reduzierte Bewegung verwenden
die bestehenden Dialog-/Motion-Tokens.

## Tastenkürzel

Quelle für Dispatch, Tooltips und Übersicht: `src/app/shortcuts.ts`.
Konflikte werden für gleichzeitig aktive Modi und Fokusbereiche geprüft.
Identische Tasten in getrennten Modi oder Editor/Canvas sind zulässig.
Formulare, editierbare Inhalte, Modal-/Menübereiche und inerte Modusflächen
suspendieren globale Rechnerbefehle. Ausdrücklich aktive Editorbefehle und
Strg/Cmd+K sind die dokumentierten Ausnahmen. Native Textbearbeitung bleibt
beim Editor. Die folgende Tabelle beschreibt die Registry; ihre Konsistenz
wird durch Unit-Tests abgesichert.

| Kürzel                      | Aktion                                           | Bereich / Eingabefokus                                              |
| --------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| Strg+K / Cmd+K              | Befehlspalette                                   | Alle Modi, auch Editor                                              |
| ?                           | Übersicht                                        | Alle Modi, außerhalb Eingabefeldern                                 |
| Strg+H                      | Verlauf ein/aus                                  | Alle Modi, außerhalb Eingabefeldern                                 |
| Strg+Umschalt+P             | Präsentation ein/aus                             | Alle Modi, außerhalb Eingabefeldern                                 |
| Strg+,                      | Einstellungen                                    | Alle Modi, außerhalb Eingabefeldern                                 |
| Alt+1 / 2 / 3 / 4           | Einfach / Wissenschaftlich / Umrechner / Graphen | Außerhalb Eingabefeldern                                            |
| 0–9, + − * /, . oder ,      | Zahl / Operator                                  | Einfach, außerhalb Eingabefeldern                                   |
| Enter oder =                | Auswerten                                        | Einfach, außerhalb Eingabefeldern                                   |
| Rücktaste / Entf / Esc / %  | Löschen / CE / C / Prozent                       | Einfach, außerhalb Eingabefeldern                                   |
| /                           | Schnelleingabe fokussieren                       | Umrechner, außerhalb Eingabefeldern                                 |
| 0–9                         | Von-Feld fokussieren und beginnen                | Umrechner, außerhalb Eingabefeldern                                 |
| Strg+Umschalt+S             | Einheiten tauschen                               | Umrechner, außerhalb Eingabefeldern                                 |
| Enter / ↑ ↓ / Esc / Tab     | Auswerten / Verlauf / Leeren / Vervollständigung | Wissenschaftlicher oder Graph-Editor, ausdrücklich innerhalb Editor |
| + oder = / −                | Zoom                                             | Graph-Canvas                                                        |
| Pfeile / Esc / Umschalt+F10 | Trace / Trace schließen / Aktionen               | Graph-Canvas                                                        |

## Permalinks

Die vier Modi bieten die Icon-Aktion „Link teilen“ (außer aktiven Währungen). Schema: `#/<mode>?v=1&s=<base64url-LZW>`.
LZW komprimiert UTF-8-JSON in 16-Bit-Codes, ohne zusätzliche Laufzeitbibliothek.
Eine lesbare wissenschaftliche Eingabe wie `#/scientific?e=sin(30)&a=deg` wird
ebenfalls akzeptiert. Versionen werden vor der Dekodierung geprüft. Grenzen:
32.768 Zeichen komprimierte Daten, 65.536 UTF-8-Bytes nach Dekompression;
modusspezifische Längen-/Schema-/Zahl-/Viewport-Prüfungen folgen danach.
Oversize-/Clipboard-Fehler zeigen eine verständliche Snackbar. Fuzzing umfasst
beliebige Hashes, beschädigte Codes und zufällige JSON-Payloads.

| Modus            | Übertragener Zustand                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Einfach          | Exakte Eingabe, Akkumulator, Operator, Eingabephase und Ausdruck                            |
| Wissenschaftlich | Ausdruck und DEG/RAD/GRAD                                                                   |
| Umrechner        | Kategorie, Quell-/Zieleinheit und exakter Decimal-String                                    |
| Graphen          | Alle Zeilen mit Parametern/Farben/Sichtbarkeit, aktuelle Canvas-Ansicht und Anzeigeoptionen |

Keine gespeicherten Definitionen werden beim Laden ausgeführt. Es werden weder
Environment noch Verlauf übertragen. Ein Hashwechsel stellt auch im selben
Modus wieder her. Ungültige Payloads verwenden den Standardzustand des gültigen
Modus; unbekannte Routen fallen wie bisher auf Einfach zurück. Keine Abstürze.

## Skalierung und Präsentation

Settings-Version 4 migriert Version 0–3 und ergänzt standardmäßig deaktivierte Online-Kurse (AP17). „UI-Größe“ (80–150 %, Standard 100 %)
multipliziert AP4s fluide Root-Schrift, inklusive rem-Typografie und Formen.
„Verlauf in Präsentation anzeigen“ entscheidet, ob ein bereits sichtbarer Verlauf
auch während der Präsentation bleibt. Der Präsentationsmodus blendet Rail,
Toolbars und Werkzeugspalten aus und vergrößert die Anzeige. Ein sichtbarer
Beenden-Button und Strg+Umschalt+P führen zurück. Präsentation selbst ist transient.

## PWA / Offline

`scripts/pwaPlugin.ts` ist der gleichwertige Vite-Build-Adapter ohne zusätzliche
Abhängigkeit. Er erzeugt Manifest und Service Worker für den konfigurierten
Base-Pfad (Standard `/m8e-calc/`). Ein inhaltsabhängiger Cache-Name berücksichtigt
Bundle, Manifest und Icons. Die Installation precacht **alle** erzeugten Assets,
einschließlich lazy Modus-/CodeMirror-/KaTeX-Chunks, lokaler Fonts und Graph-Worker.
Der Cache wird erst nach vollständig erfolgreicher Installation aktiviert;
ein fehlgeschlagenes Update lässt die bisherige Version aktiv.

Cache-first für versionierte lokale Assets und die App-Shell ermöglicht jeden
Modus nach dem ersten erfolgreichen Laden offline, auch ohne vorherigen Besuch.
Fetch-Handling ist auf dieselbe Origin und den Base-Pfad beschränkt. Nach Aktivierung
werden nur alte app-/base-spezifische Caches entfernt. `skipWaiting` erfolgt für
Updates erst nach Klick auf „Jetzt aktualisieren“ in der Snackbar „Neue Version
verfügbar“. Controllerwechsel lädt danach neu. Registrierung prüft beim nächsten
sichtbaren Tabwechsel und stündlich; keine externen Laufzeitrequests durch PWA-Updates; AP17-Kurse sind separat ausdrücklich opt-in.

Manifest: Standalone, Start-URL/Scope unter Base, SVG sowie 192-/512-PNG und
separates opakes maskable-512-PNG. Das neutrale Icon bleibt unabhängig vom Akzent;
sein Motiv liegt in der maskable-Sicherheitszone. Reproduktion:
`npm install --no-save --package-lock=false sharp`, danach
`node scripts/generate-app-icons.mjs` (Sharp nur für Asset-Generierung).
Chromium prüft `Page.getInstallabilityErrors`, Manifestpfade und Offline-Nutzung.
Der Installieren-Button erscheint nur bei `beforeinstallprompt`; andere Browser
verwenden ihre native Installationsoberfläche. HTTPS oder localhost ist nötig.

## Verifikation / Offen

Unit: Fuzzy-Suche, Query-Auswertung, Kürzelkonflikte/Input-Scope, Settings-Migration,
Permalink-Roundtrips, Unicode-Kompression und Fuzzing. E2E: Palette/Fokus/ARIA/axe,
Roundtrip jedes Modus, ungültige Links, Skalierung/Präsentation und vier Modi mit
Playwright-Offline-Emulation nach ausschließlich dem ersten Einfach-Laden.
Aktualisierte Aufnahmen aus Hardening-CI `38593558518` (Produktcode seit diesem Lauf unverändert): [Palette](screenshots/comfort-palette.png), [Präsentation](screenshots/comfort-presentation.png); E2E erzeugt sie erneut im CI-Artefakt.
Weitere Browser und physische Betriebssystem-Installation bleiben AP15-Abnahme.

Stand der vollständigen Verifikation: 1.978 Unit-/Komponententests und 81
Chromium-E2E bestanden. Die Bildschirmprüfung hat die KaTeX-Schrift für die
Präsentation zusätzlich vergrößert; die E2E prüft ihre tatsächliche CSS-Größe.

## AP18 · Ruhige Modusköpfe und Teilen

Der aktive Modus steht einmal oben links als Hauptüberschrift im Shellkopf,
auch bei offenem Verlauf und kleinen Breiten. Die Hauptregion ist darüber
benannt; Feature-Regionen tragen den lokalisierten Modusnamen. Präsentation
ersetzt den ausgeblendeten Shelltitel durch eine visuell versteckte H1.
Funktionale Feld-, Abschnitts- und Dialogbeschriftungen bleiben erhalten.

„Link teilen“ / „Share link“ ist eine sekundäre Icon-Aktion mit Tooltip und
mindestens 48×48 px Bedienfläche am rechten Rand der jeweiligen Werkzeugzeile.
Einfach verwendet die bestehende Speicherstatuszeile, Wissenschaftlich und
Graphen ihre kompakten Werkzeugzeilen, der Umrechner die Schnelleingabezeile.
Die Aktion kopiert weiterhin den bestehenden Permalink; Erfolg und Fehler
erscheinen lokalisiert in der Snackbar. Es gibt keinen Sharingdienst.
Währungen bieten weiterhin keinen Permalink an. Graphlinks lesen weiterhin
den aktuellen Canvas-Viewport und erhalten AP21s `fitBasis`.

Gezielte Regressionen: `src/app/CopyLinkButton.test.tsx`,
`e2e/ap18-ui.spec.ts`, `e2e/comfort.spec.ts`, `e2e/currency.spec.ts` und
`e2e/graph.spec.ts`. Echte Bildaufnahmen gegen einen Produktions-Preview:
`AP18_PHASE=after node scripts/ap18-screenshots.mjs`; vor AP18 mit demselben
Skript und `AP18_PHASE=before`. Ansichten: 1280×800, 1920×1080, 3440×1440,
Hell/Dunkel, UI-Größen 80/100/150 % und tatsächlicher Chromium-Tabzoom 200 %.
Bilder und Geometriemessungen entstehen in `ap18-evidence/`.

Kurze Fenster verwenden im Einfach-Modus kompaktere Tasten und Abstände bei
weiterhin mindestens 48 px Bedienfläche. Der Graphen-Arbeitsbereich lässt sich
bei kleinen, niedrigen Fenstern vollständig scrollen, statt Werkzeuge außerhalb
der sichtbaren Fläche abzuschneiden. Rechen- und Viewport-Logik bleiben unverändert.

Die 24 Referenzbilder für 1920/2560/3840 px in Hell/Dunkel wurden nach Sichtprüfung
übernommen. Dauerhafte Vorher-/Nachher-Belege für alle vier Modi bei 1920×1080
liegen in [screenshots/ap18](screenshots/ap18/). Ausgangspunkt: `bdc7528` (aktueller
`main`, einschließlich AP21), nicht nur der ältere Befund `f48afe1`.
Aktuelle Laufnachweise und die vollständige Bildmatrix: [PR #25](https://github.com/sl3ndrr/m8e-calc/pull/25).

Der Teilen-Tooltip ist am rechten Buttonrand ausgerichtet und liegt außerhalb
der scrollenden Modusbühne. Sein Öffnen darf deren Scrollbreite nicht verändern
oder einen ResizeObserver-Fehler erzeugen; die de/en-Tastaturregression prüft dies.
Umrechner-Referenzen warten auf den abgeschlossenen Ruheverlauf und das zuletzt
genutzte Paar, damit Timer keinen wechselnden Screenshotzustand erzeugen.
