# Lokaler Betrieb und Einheitenumrechnung

Die vier Modi rechnen ausschließlich lokal. Währungsumrechnung, Kursprovider,
Kursclient, Zustimmungsschalter und die externe CSP-Freigabe sind entfernt.
Der Umrechner behält seine 286 lokalen Einheiten in 32 Kategorien, Favoriten,
Verlauf, Schnelleingabe, Zahlenpräferenzen und Permalinks.

## Einstellungen und Altbestände

Settings-Version 5 liest die bisherigen Versionen 0–4 und verwirft das frühere
Netzwerkfeld. Andere gültige Einstellungen bleiben erhalten. Alte Exportdateien
mit einem booleschen Altflag bleiben importierbar; neue Dateien enthalten es
nicht. Unbekannte Felder neuer Dateien und ungültige Werte werden abgewiesen.
Der Einstellungsimport bleibt eine atomare Storeübernahme nach Dateiprüfung.

Beim Appstart werden ausschließlich die beiden alten Kurs-/Abrufschlüssel
bestmöglich entfernt. Verweigerter Speicherzugriff blockiert den Start nicht;
der nächste Start versucht die Bereinigung erneut. Definitionen, Verlauf,
Umrechnerfavoriten und Offline-Dateien werden dabei nicht entfernt.

## Netzwerk und Prüfungen

`connect-src 'self'` erlaubt ausschließlich Verbindungen zur eigenen Origin.
App-, Asset- und Updateabrufe bleiben für Laden und PWA erhalten. Die entfernte
Provider-Quellenprüfung gehört nicht mehr zum Quality gate; alle übrigen
Pflichtjobs und die Commit-/Run-/Attempt-/Bytebindung bleiben bestehen.

Schema-/Import- und Altbestandsregressionen liegen neben den zuständigen
Adaptern. `e2e/local-only.spec.ts` prüft beide Sprachen, Altbestandsbereinigung,
lokale Requests, CSP und den Select-/Settings-Öffnungspfad ohne Browserfehler.
Der historische WP03-Nachweis bleibt seinem damaligen Stand zugeordnet.

Die frühere Planung für Währungsbelege (WP14) entfällt vollständig. Der
verbindliche weitere Ablauf steht in [WORK_PLAN.md](WORK_PLAN.md).
