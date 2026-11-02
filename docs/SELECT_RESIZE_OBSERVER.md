# Suchbare Selects und ResizeObserver

React Aria Components 1.22.1 erwartet bei der ComboBox eine `Group` um
Input und Button. Der Group-Ref vermeidet den Legacy-Callback, der während
einer ResizeObserver-Lieferung synchron nachmisst und den Menüzustand setzt.
Der globale Fehlerhandler bleibt unverändert.

Messstand: main `b6f52bf0e23851ffd4c27cee57204f87cd64549c`,
Lauf **41442402402 A1**, Playwright 1.64.1, WebKit mit einem Worker, Retries 0.

- `currency.spec.ts:235`: native ResizeObserver-Fehler 29/30, sichtbarer Toast 29/30.
- Einstellungen vor Opt-in: native Fehler 29/30, sichtbarer Toast 29/30.

Regressionsfehler ohne Fix / mit Fix, jeweils 30 Wiederholungen:

- WebKit: 29/30 / 0/30.
- Chromium: 0/30 / 0/30.
- Firefox: 0/30 / 0/30.

Der Test in `e2e/currency.spec.ts` zeichnet Window-Fehler ab der Navigation
auf, prüft die gerenderten Umrechnerkarten und öffnet die Einstellungen ohne
Opt-in. Nach Font-/Frame-Abschluss verlangt er eine leere Fehlerliste und
keinen generischen Fehler-Toast. Fehlerereignisse werden nicht unterdrückt.
Chromium und Firefox verwenden die reguläre Worker-Vorgabe.
