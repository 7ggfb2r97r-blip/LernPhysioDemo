# LernPhysio

Eine dependency-freie Browser-App zum Lernen von Anatomie und Physiologie.

## Starten

Die Datei [index.html](/Users/steffen/Documents/ChatGPT/LernPhysio/index.html) kann direkt im Browser geöffnet werden. Für eine lokale Entwicklungsumgebung:

```bash
python3 -m http.server 4173
```

Danach `http://127.0.0.1:4173` öffnen.

## Enthaltene Funktionen

- Dashboard mit Lernempfehlung und Statistiken
- Durchsuchbare Anatomie-Datenbank mit deutsch-lateinischen Detailseiten
- Karteikarten mit einfacher Spaced-Repetition-Priorisierung
- Multiple-Choice-Quiz mit fachlichen Erklärungen
- Permanenter Lernfortschritt per `localStorage`
- Fortschrittsansicht mit Stärken, Schwächen und Regionen
- Prüfungsquiz für Media-, Kleinhirn- und Hirnstamminfarkt mit Filterung nach Thema, Themenbereich, Schwierigkeit und Lernmodus
- Eigene Prüfungsfortschrittsauswertung mit Stärken und wiederkehrenden Fehlern

Neue Inhalte werden zentral im Array `structures` in [app.js](/Users/steffen/Documents/ChatGPT/LernPhysio/app.js) ergänzt; Quizfragen liegen in `quizBank`.

Prüfungsfragen liegen getrennt in `examBank`.
