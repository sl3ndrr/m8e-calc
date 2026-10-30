# Implementierungsstatus

## WP-08 · Wissenschaftlicher Hauptwert nach Zahlenpräferenzen · 30.10.2026

Lokal auf `feat/audit-wp-08` ab `43b0765172223182634f81183dbc8d471ba77052`
einschließlich WP-07 umgesetzt. Bereits korrekter lokalisierter Ergebnistext
jetzt sichtbar als Hauptwert, gemeinsame Quelle für Textkopie/Ansage; Formel
und ausdrücklich benanntes kanonisches LaTeX bleiben ergänzend. Ein persistenter
Ansagekanal verhindert konkurrierende Ausgaben und eine zweite Ergebnisansage
beim nachlaufenden Vorschauabschluss. Zahlenformate, Brüche, komplexe Werte,
Listen, Definition-ohne-Wert und lange vollständige Kopien sind berücksichtigt.
Parser, Decimal-Werte, numerische Grenzen und Workerfluss bleiben erhalten.

Geprüfter Codecommit `ef69c112955b3fe710a797cd0f9fb7c1d66128e5`:
`npm run check` vollständig bestanden, 627 UI-/1744 Domänentests, Build und
Benchmarks; Bundle 190757 Byte gzip < 200000, keine eager Scientificmodule.
Keine längeren Fristen oder gelockerten Assertions. Identitäten, genaue Befehle
und Rohbelege stehen in [WP08](WP08.md). Reguläres npm-ci/npm 11.19.0 und
Browserdownload sind HTTP-403-blockiert; lokale Prüfer aus hashgeprüftem
vorherigem Lockfile-Export. Produktionsbrowserstarts stoppen vor App-Prüfungen;
echter Zoom und Hell-/Dunkel-Sichtprüfung bleiben offen.
Keine ungeprüften Bildbaselines aktualisiert, keine Remoteänderungen/Freigabe.

Auf ausdrücklichen Folgeauftrag ist [PR #87](https://github.com/sl3ndrr/m8e-calc/pull/87)
als Entwurf veröffentlicht. Erste eigene CI besteht beide Node-Checks, Build,
Galerie, Performance, Provenienz und weitere Gates, findet aber den 27-px-
Bühnenüberlauf bei 1920×1080, ungeeignete Radio-Pointeraktionen, mehrdeutige
Definitionstextselektoren und genau sechs beauftragte Bildabweichungen.
Scoped Bühnenhöhe mit internem Scrollen, echte Tastaturaktionen und vollständige
Output-/Sichtbarkeitsassertions korrigieren die Befunde. Sechs wissenschaftliche
Referenzen sind nach dokumentiertem Alt-/Neu-Sichtvergleich gezielt übernommen;
18 andere Referenzen und sämtliche Prüfgrenzen bleiben erhalten. Echte native
Zoommessungen sind vorhanden; ihre Bildaufnahme verwendet nun den AP19-DIP/CSS-
Vertrag. Aktuelle vollständige Pflicht-CI auf dem Korrekturhead bleibt erforderlich.
Identitäten und Originalbefunde: [WP08](WP08.md), aktueller Abschluss im PR.

Zweiter Lauf: 24/24 Visuals, 75/75 Galerie, 36/36 Provenienz und alle sieben
Chromium-WP-08-Fälle bestehen. Ein bestehender AP22-Test erzeugt laut Trace
`(t,t^2)r=1` durch DOM-Fill; er nutzt jetzt den vorhandenen CodeMirror-
Tastaturhelper mit zusätzlicher exakter Textprüfung. Zoomaufnahmen schließen
die zuvor verdeckende Kopiermeldung über ihren realen lokalisierten Button.
Keine Produktänderung dafür; neue vollständige CI und Bildsichtung erforderlich.

## WP-07 · Wissenschaftliche Berechnungen im Worker · 29.10.2026

Lokal auf `feat/audit-wp-07` ab aktuellem main
`8351329bced1bab62ac387e911f7549a1dac4458` einschließlich WP-06 umgesetzt.
Vorschau, Enter und STO laufen über einen lokalen, tatsächlich terminierbaren
Modulworker. Protokoll 1 validiert serialisierte Ergebnisse/Environments;
eine laufende Arbeit und ein neuester Vorschau-Nachfolger begrenzen die Queue.
Explizite Snapshots committen einmalig gegen die Environmentrevision, ohne
neuere Eingaben zu überschreiben. Preview bleibt ohne Persistenz/Verlauf.
de/en-Arbeits-/Abbruchzustand, Cleanup, Vertrags- und Regressionsergänzungen;
keine Domänen-, Toleranz-, Dependency-, Lockfile- oder Baselineänderung.

Erster lokaler Abschluss vor dem PR-Folgeauftrag: Ergänzende Nodequellproben
(77 Assertions sowie 34 registrierte Fälle /
182 Assertions) und zwei echte Nodeworkerfälle bestehen; Syntax von 17 TS/TSX-
Dateien geprüft. Das sind keine regulären Vitest-/React-/Produktionsbrowserläufe.
**Pflichtabnahme blockiert:** npm 11.19.0 und `npm ci` scheitern an Registry-403;
check, Build und die vorgesehenen Browser-/Bundlegates starten ihre Prüfer nicht.
Keine WP-07-PR-/main-CI-, Pages- oder Livefreigabe. Vollständige Herkunft,
Codeidentität, Befehle, Befunde und Grenzen: [WP07.md](WP07.md).

Folgeauftrag: [Draft-PR #86](https://github.com/sl3ndrr/m8e-calc/pull/86) ist
veröffentlicht. Erste CI `40949828861` installiert regulär, scheitert vor
Typen/Tests/Build an Formatabweichungen. Die geprüften npm-ci-Werkzeuge sind
über einen temporären Diagnoseexport lokal verfügbar; der Export ist wieder
aus der Pipeline entfernt. Formatierung, zwei ungültige Testing-Library-Optionen
und ein redundanter Cleanup-Refzugriff sind korrigiert. Typen/ESLint und 45
gezielte echte Vitestfälle bestehen. Die vollständige lokale UI-Suite bleibt
mit einem unveränderten 5-s-WP-02-Timeout rot (604 bestanden); keine Lockerung.
Der finale Korrekturhead braucht seine eigene vollständige PR-CI, dokumentiert
im PR und im [WP07-Bericht](WP07.md). Keine Merge-/Deployfreigabe.

Der Korrekturlauf `40951346563` besteht danach vollständiges check auf beiden
Node-Versionen (605 UI/1744 Domäne), Galerie, 24 unveränderte Visuals,
Provenienz und Performance. Chromium/Firefox/WebKit decken je drei Font-CSP-Verstöße
auf: Vite inlinet KaTeX Size3, obwohl `font-src 'self'` das sperrt. Die
hashgeprüfte Basis enthält bytegleiches CSS. Alle Workerassertions davor
bestehen; keine Workerursache. Fontdateien werden nun größenunabhängig lokal
ausgegeben und Size3 im Offline-Precache geprüft. Policy und Null-CSP-Assertion
bleiben unverändert; eigener vollständiger finaler CI-Nachweis erforderlich.
Trace-/Artefakthashes und Einordnung: [WP07](WP07.md).

## WP-06 · Zoll-Queries und Wortseparatoren · 29.10.2026

Lokal auf `feat/audit-wp-06` umgesetzt, Code-/Regressionen-/Vertragscommit
`cb52217c9302e7f8bc17740fc07281a425c25a4f`, tatsächliche Basis-main nach WP-05
`0d088b8c890b6d0b8826ba6eba46645e4ee4ea0b`. Pfeile bleiben vorrangig;
Worttrennstellen werden über gültige Größen und Ziele derselben Kategorie
geprüft. Zollquellen einschließlich Compound funktionieren mit in/to/nach;
mehrere gültige Lesarten werden kontrolliert als mehrdeutig abgewiesen.
4096 Zeichen und höchstens 32 Wortkandidaten begrenzen den Aufwand. Katalog,
Präzision, öffentliche Signaturen und Lockfile bleiben unverändert.
de/en-Meldungen, Fachverträge und Parser-/Reducer-/UI-/Produktionsbrowser-
Regressionen sind ergänzt.

Originalfehler in beiden Sprachen mit echten Parser-/Reducerquellen reproduziert;
836 ergänzende Korrekturprüfungen, strikte Domänen-/Modelltypprüfung sowie
Syntax-/Format-/Dokumentprüfungen bestehen. **Pflichtabnahme blockiert:** npm
11.19.0 und `npm ci` scheitern an Registry-HTTP-403. Check, Vitest, normaler
Produktionsbuild und Drei-Engine-Quickinput starten ihre Prüfer nicht. Keine
PR-/main-CI-, Pages- oder Live-Freigabe für diesen lokalen Diff. Vollständige
Identitäten, Befehle, Runtimegrenzen und Offen / Folgearbeiten: [WP06](WP06.md).

Fortsetzung: Der ergänzende Katalogvergleich erhält 8.124 bisher gültige Queries
exakt und bestätigt sechs neu akzeptierte Zollqueries. Produktcode unverändert;
Registry-403 und reguläre lokale Abnahme bleiben blockiert. Die Basis-main-CI
ist inzwischen wegen zweier externer Joblink-Antworten (502/503) rot, Pages
skipped; sie enthält den lokalen WP-06-Diff nicht. Nachweise im WP06-Bericht.

Auf Folgeauftrag ist [PR #85](https://github.com/sl3ndrr/m8e-calc/pull/85)
veröffentlicht, initialer Head `368588a2…`, geprüfter Build `e0542921…`.
Check auf beiden Node-Versionen (584 UI/1744 Domäne), Galerie, Visuals,
Provenienz und Graph-/Releaseprüfungen bestehen. Chromium/Firefox scheitern
im neuen englischen Fall: Die zweite Navigation auf denselben Hash führt das
Sprach-Init-Script nicht aus; der Originalsnapshot ist weiterhin deutsch.
WebKit besteht beide Sprachen. Echtes Reload und eine ausdrückliche
html.lang-Assertion korrigieren die Fixture; alle fachlichen Assertions und
Grenzen bleiben erhalten. Eigener vollständiger CI-Nachweis auf dem
Korrekturhead erforderlich. Originalbeleg und Einordnung: [WP06](WP06.md).

## WP-05 · Gallery-WebKit und Attempt-Provenienz · 29.10.2026

Begrenzte lokale Diagnose auf `feat/audit-wp-05`, Basis-main
`c50efc82e4b9cf38788b369c83fb70085cdbf545` nach WP-04. Originaltrace/-logs
und Artefakt-Hashes aus Run `40102607931` gesichert: Attempt 1 scheitert an
der leeren Motion-Probe bei erfolgreich geschaltetem/fokussiertem Switch;
Attempt 2 wird bereits vor Tests korrekt wegen fremder Producerattempt gesperrt.
Das historische Normalartefakt besteht lokal die vollständige Byteprüfung
unter seiner ursprünglichen Identität und wird für Attempt 2 abgelehnt.

Die fünf unmittelbar betroffenen Switch-/Proben-/Test-/Konfigurationsdateien
sind gegenüber dem Audit bytegleich. Auch die grüne aktuelle Basis-main-CI
beweist deshalb keine konkrete Fehlerbehebung. **Ursache/Reproduktion offen:**
Registry-HTTP-403 verhindert reguläre Installation, Gallerybuild und Browser.
9/9 unveränderte Pipeline-Vertragstests bestehen mit lokalem TMPDIR; kein
spekulativer Produktfix, keine abgeschwächten Assertions oder Herkunftsregeln.
Gesicherte Befunde, Prüfgrenzen und kontrollierter Folgeweg: [WP05.md](WP05.md).
Der spätere Abschluss erfordert die vollständige neue CI einschließlich
Producer und Konsumenten derselben Attempt, keinen Failed-Jobs-Rerun.

## WP-01 · Wissenschaftliche Persistenz · 27.–28.10.2026

Lokal umgesetzt auf `feat/audit-wp-01`, Codecommit
`b2e09dab2e028a336041171defc1664b560d64b0`, Ausgangs-main
`de0fcd0a0846f56226e148c14f7b3bf5d1cb387f`.

Strukturelle Environment-Validierung ohne Auswertung erhält normale Namen,
Programmer-Funktionskörper, alle Wertarten und die wissenschaftliche ans-Historie.
Kontextkonflikte liefern kontrollierte Fehler. Fehlerhafte, zu große oder nicht
lesbare Altbestände sperren automatische Schreibzugriffe; Original und zuletzt
speicherbarer Bestand bleiben erhalten. Eine de/en-Meldung erklärt die nur in der
Sitzung gültigen Änderungen und bietet ausdrückliches erneutes Laden mit
Fokusrückgabe an. Fachverträge und Engine-/Store-/UI-/Browserregressionen ergänzt.

Die isolierte Node-Probe bestätigt den ursprünglichen Datenverlust und besteht
mit dem Fix; Engine-Typprüfung, begrenzte Modell-/Store-Typprüfung, Syntax- und
Formatprüfungen bestehen. **Die verbindliche Abnahme ist blockiert:** npm 11.19.0
und `npm ci` scheitern an Registry-HTTP-403. `check`, Vitest, Produktionsbuild und
Playwright starten deshalb nicht. Keine PR-CI, main-CI, Pages- oder Live-Freigabe
für diesen Diff. Vollständige Identitäten, Befehle, Grenzen und Offen / Folgearbeiten:
[WP01.md](WP01.md).

Fortsetzung vom 28.10.: Auf Testcommit
`68be8302ca06dbf0e4e12e85f464a3796cdc4299` sind zusätzlich Store-Neuerzeugung
mit Funktions-/Parameterkonflikten und erfolgreicher Browser-Retry samt
Editorfokus, unverändertem Reparaturbestand und erneutem Reload abgedeckt.
Produktcode und Lockfile bleiben unverändert. Erweiterte Node-Probe und die
begrenzten Prüfungen bestehen erneut; die regulären Tests starten wegen der
erneut bestätigten Registry-403 weiterhin nicht. Keine neue Abnahmefreigabe.

Auf ausdrücklichen Folgeauftrag ist [Draft-PR #80](https://github.com/sl3ndrr/m8e-calc/pull/80)
erstellt. Die erste PR-CI konnte regulär installieren und scheiterte an
`prefer-const` für den verzögert initialisierten Fehlerreporter. Lokaler
Korrekturcommit `926c369f3e0337bb7f82eeff66468b787ff26eb3` verwendet dort
`const`; Regeln und Assertions bleiben unverändert. Die zusätzliche lokale Probe
und begrenzten Prüfungen bestehen; die vollständige CI des neuen PR-Stands
bleibt separat abzunehmen. Keine Merge-/Deployfreigabe.

## WP-02 · Verlustfreies Bearbeiten von Definitionen · 28.10.2026

Lokal umgesetzt auf `feat/audit-wp-02`, Codecommit
`e6034bd0353d0f6022a55be2448535dfeac911db`, tatsächliche Basis nach WP-01
`56cc9b03b6d04e2a26a4c8816137437aef6c92f3`. Kanonischer Quelltext mit voller
Decimal-Präzision ist von der lokalisierten Anzeige getrennt. Unverändertes
Bearbeiten erhält skalare Werte unabhängig von Editor-/Programmereinstellungen;
Funktionsbestätigung führt keinen Körper aus und erhält den AST. Listen bleiben
sichtbar/einfügbar, Bearbeiten ist mit de/en-Erklärung deaktiviert. Die WP-01-
Persistenzschutzmechanismen bleiben erhalten; Fachverträge und Regressionen sind
aktualisiert, keine Abhängigkeits-/Lockfile-/Baselineänderung.

Der strikte Engine-/Modell-Typcheck, die ergänzende originale Node-Probe sowie
Syntax-/Format-/Diffprüfungen bestehen. **Die Pflichtabnahme bleibt blockiert:**
npm 11.19.0 und `npm ci` scheitern an Registry-HTTP-403; check, Vitest, Build und
beide Produktionsbrowserauswahlen starten ihre Prüfer nicht. Keine Freigabe für
diesen lokalen Diff. PR #80 ist inzwischen gemergt und seine PR-CI grün; die
main-CI der Basis ist wegen Gallery/Quality gate rot, Pages skipped. Diese
Vorgängernachweise sind keine WP-02-Abnahme. Exakte Identitäten, Befehle,
Hypothesen, Ergebnisse, Runtimegrenzen und Offen / Folgearbeiten: [WP02.md](WP02.md).

WP-02-Fortsetzung: [Draft-PR #81](https://github.com/sl3ndrr/m8e-calc/pull/81)
ist veröffentlicht. Seine erste Pflicht-CI und AP22 scheitern an zwei neuen
Paneltests: Gruppierte Festkommaausgabe wird fälschlich im auto-Modus erwartet.
Korrekturcommit `fe4a1101d3e18614b07a6db0b23a49a44b26a8cd` wählt für diese Fälle
explizit fixed und ergänzt zwei exakte de/en-auto-Fälle. Bestehende Wert-,
ARIA-, Tastatur-, Listen- und Seiteneffektprüfungen bleiben erhalten; Produkt und
Schutzmechanismen unverändert. Ergänzende lokale Prüfungen bestehen erneut,
reguläre Installation/Tests bleiben lokal durch Registry-403 blockiert. Neuer
veröffentlichter Head und tatsächlicher CI-Abschluss werden im PR separat
festgehalten; kein Erfolg des neuen Diffs aus dem roten Originallauf abgeleitet.
Befund, Jobs und Befehle stehen im [WP02-Bericht](WP02.md).

Auf dem ersten WP-02-Korrekturhead bestehen inzwischen check auf beiden Node-
Versionen (539 UI/1702 Domänentests), die vier Paneltests und AP22. Die regulären
Browser decken einen weiteren neuen Testaufbaufehler auf: Direkter Klick auf das
native Radioinput wird von dessen sichtbarem Label abgefangen. Commit
`09eb146878c3adb55dbbaea69cafdde77c9f7b78` verwendet im kompakten Testpfad die
bestehende Fokus-/Leertastenbedienung und ergänzt Fokus-, Auswahl- und
Panelsichtbarkeitsassertions. Fachliche Assertions und Fristen bleiben erhalten;
Produkt unverändert. Der neue Head benötigt seinen eigenen vollständigen
CI-Nachweis, dokumentiert in PR #81. Einzelheiten und lokale Grenzen: [WP02](WP02.md).

## WP-03 · Zustimmung bei asynchronem Settingsimport · 28.10.2026

Lokal implementiert auf `feat/audit-wp-03`, Code-/Regressionencommit
`5a6b33073102b54214d802b9fcaa33b69c2847a2`, tatsächliche Basis nach WP-01/WP-02
`ecdf8509d1261ba4d349121eba633b6f749564dc` (main, 28.10., 22:39:33 Europe/Berlin).
Abschließender Code-/Teststand nach expliziter Typisierung der Browser-Testsignale:
`5c914ee697222a1b7ec98521e2d832aec43ba3e5`; Produktcode unverändert.
Die atomare Storeaktion übernimmt validierte Einstellungen und erhält dabei die
**beim Abschluss aktuelle** Zustimmung. Strenge Validierung, Größenlimit,
Fehlermeldungen und Kursclient-Abbruch bleiben erhalten. Regressionen für Store,
de/en-Dialog und alle drei konfigurierten Produktionsbrowser decken kontrollierte
Dateipromises, beide Zustimmungswechsel/Abschlussfolgen, unveränderte Zustimmung,
Persistenz/Reload, Fehler und Requests/verspätete Antworten ab.

Die ergänzende native Quellcode-/Modellprobe bestätigt das ursprüngliche Rennen
und besteht mit dem Fix (18 Gegenproben, drei Fehlerfälle); Syntax-/Format-/
Diffprüfungen bestehen. **Die Pflichtabnahme bleibt blockiert:** npm 11.19.0 und
`npm ci` scheitern an Registry-HTTP-403; Vitest, check, Build und Playwright
starten ihre Prüfer nicht. Kein beobachteter unerlaubter Browserrequest behauptet,
keine WP-03-Freigabe. Die inzwischen grüne main-/Pages-Kette der Basis
40773772912 enthält diesen lokalen Diff nicht. Ausgangs-/Codeidentitäten,
Dateien, exakte Befehle, Runtime-/Browsergrenzen, Belege und Offen / Folgearbeiten:
[WP03.md](WP03.md). Keine Remoteänderungen ausgeführt.

WP-03-Folgeauftrag: [Draft-PR #82](https://github.com/sl3ndrr/m8e-calc/pull/82)
ist veröffentlicht. Erste Pflicht-CI 40778367449 auf Head `ab12dd8e…` / Build
`f269743c…`: check auf beiden Node-Versionen (565 UI/1702 Domäne), Chromium
227, Firefox 200, Galerie 75, Visuals 24 und Provenienz 36 bestanden.
WebKit scheitert in 14 neuen Fällen: Native ResizeObserver-Meldung bereits beim
Settingsöffnen vor Dateiauswahl erzeugt eine globale Snackbar vor der erwarteten
Importmeldung. Die konkrete Observer-Ursache ist noch nicht bewiesen.
Die Fixture wartet jetzt auf den bestehenden Modus-/Font-/Frame-Ready-Helfer und
verlangt zusätzlich null Browserfehler. Sämtliche fachlichen und Meldungsassertions
bleiben erhalten; Produktcode, Fristen, Retries und Baselines unverändert.
Neuer aktueller CI-Nachweis erforderlich; der rote Originallauf bleibt erhalten.
Details und lesbare Originaltrace-Auszüge: [WP03](WP03.md).

## WP-04 · Label in Name aus PR #65 · 29.10.2026

Lokal auf `feat/audit-wp-04` umgesetzt, Code-/Regressionencommit
`d147e905b4c09b3aa7c0fdc2dd7ba2d5d1a106c7`, tatsächliche Basis
`7525d315184f83c23406671a488241856e594d0e` einschließlich WP-01 bis WP-03.
Der weiterhin offene PR #65 liefert die benötigten Produktkorrekturen für
Ergebniswert, Speicher-/Funktionskürzel, Verlauf, Einheiten-/Währungskarten und
Rail-Badges. WP-02s bereits korrekte lokalisierte Definitionsnamen bleiben
bytegleich erhalten. Nur die zusammengehörigen Playwright-/axe-Updates aus dem
PR übernommen; keine unabhängigen Dependency-, Grenz- oder Baselineänderungen.
de/en-Regressionen aktivieren die Label-in-Name-Regel ausdrücklich im vollständigen
axe-Scan und ergänzen vier Modi, Währungen, lange Werte, Fokus und Einzelansagen.

**Pflichtabnahme blockiert:** npm 11.19.0 und `npm ci` scheitern an Registry-403;
check, Vitest, Produktionsbuild, Browsermatrix, Visuals und separate Galerie
starten ihre Prüfer nicht. Ergänzende i18n-/Quell-/Syntax-/Formatprüfungen bestehen
(32 Quellgegenproben, 27 Syntaxdateien). Grüne historische PR-65-CI und aktuelle
main-/Pages-Kette der Basis enthalten diesen Diff nicht. Physische Screenreader- /
Sprachsteuerungsabnahme separat offen. Keine Remoteänderungen oder Freigabe.
Identitäten, Dateien, exakte Befehle, Ergebnisse, Runtimegrenzen und
Offen / Folgearbeiten: [WP04](WP04.md).

WP-04-Folgeauftrag: [Draft-PR #83](https://github.com/sl3ndrr/m8e-calc/pull/83)
ist veröffentlicht, initialer Head `08c7ae3d…`, Prüf-/Build-SHA `b6c504c4…`.
Erste Pflicht-CI 40845905012 besteht check auf beiden Node-Versionen
(576 UI-/1702 Domänentests), Galerie 75, Visuals 24 und Provenienz 36;
AP22/AP28 sind ebenfalls grün. Chromium und Firefox decken einen Fehler der
neuen Testassertion auf: axe meldet reine Symbolzeichen bestimmungsgemäß als
manuell zu prüfen, während der Test pauschal keine `incomplete`-Befunde verlangt.
Die Korrektur prüft jeden solchen Knoten auf konkretes Ziel, exaktes Zeichen
und sprechbaren de/en-Aktionsnamen. Unbekannte/abweichende Befunde bleiben Fehler;
Gegenproben sichern falsche Namen, unbekannte Symbole und Formelmismatches ab.
Vollständige Scans und alle fachlichen Assertions/Grenzen bleiben bindend,
Produkt unverändert. Finaler Korrekturhead benötigt einen eigenen vollständigen
CI-Nachweis; Originalfehler und Quellen sind in [WP04](WP04.md) dokumentiert.

Der typkorrigierte Head `7a99ac8…` besteht check. Seine weiterlaufende Suite
bestätigt danach einen Paar-Namensverstoß (`km → m` gegenüber „km to m“) und
doppelte Namen der Einheitenauswahlpfeile im echten Browserartefakt. Gemeinsamer
sichtbarer Paartext als Namenspräfix und einmalige Feldlabel-Verknüpfung per
`aria-labelledby` korrigieren diese Produktbefunde; de/en-Komponenten-/Browsertests
sichern beide Fälle. Die konkrete Symbolprüfung berücksichtigt den Auswahlpfeil
zusammen mit seinem tatsächlichen Feldlabel. Die zwei negativen Gegenproben
bestehen bereits; bestätigte Verstöße bleiben weiter blockierend. Neue vollständige
CI auf dem finalen Head erforderlich, keine Freigabe aus einem roten Lauf.

Head `443b72a…` besteht check mit 580 UI-/1702 Domänentests und Galerie.
Sechs Visualfälle stoppen am alten exakten Paar-Namensselektor, vor jedem
Pixelvergleich. Visual-/Persistenztest und AP18-Aufnahmeskript erwarten nun
den vollständigen korrigierten Namen. Keine Bildreferenz oder Prüfgrenze
geändert; eigener vollständiger CI-Nachweis auf diesem Folgehead bleibt nötig.

Die abgeschlossenen Graphscans im Chromiumartefakt desselben Vorgängerlaufs
bestätigen null axe-Verstöße, aber zwei noch nicht erfasste Symbolaktionen
(`↕`, `⋯`). Deren konkrete Prüfung verlangt jetzt Funktionszeile, Glyph und
exakten de/en-Aktionsnamen mit Nummer. Währungs-/Fokusfälle und Gegenproben
bestehen bereits; endgültiger Lauf auf der vollständigen Korrektur folgt in #83.

Wiederaufnahme nach Umgebungsausfall: CI 40855404744 bestätigt sämtliche neuen
Label-in-Name-Fälle in drei Engines, check, Galerie und 24 unveränderte Visuals.
Ein bestehender WebKit-Motion-Fall bleibt rot. Sein ausgewerteter Trace bestätigt
einen unbeabsichtigten Dokumentreload im als warm vorbereiteten Test; die
Hypothese einer überlebenden Exit-blockierenden Probe ist widerlegt. Echte
Moduslinks, zusätzliche Dokumentidentitätsassertions, auf den Zielmodus begrenzte
Tastenselektoren und begrenzte Lebensdauer der Messprobe korrigieren die
Vorbereitung. Alle Motion-/Cold-Load-Prüfungen und Grenzen bleiben bindend;
eigene finale Pflicht-CI erforderlich. Details und Rohbeleg: [WP04](WP04.md).
