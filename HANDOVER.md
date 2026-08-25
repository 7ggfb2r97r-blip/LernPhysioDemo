# LernPhysio – Übergabe-Dokumentation

Stand: 2026-08-24. Diese Datei ist für ein anderes KI-Modell (oder einen neuen Chat) gedacht, das direkt an diesem Projekt weiterarbeiten soll. Sie beschreibt Architektur, Dateien, Datenmodell, Design und offene Punkte so vollständig wie möglich.

---

## 1. Projektüberblick

**LernPhysio** ist eine dependency-freie, rein clientseitige Web-App (kein Build-Step, kein Framework, kein Server nötig) zur Prüfungsvorbereitung für eine Physiotherapie-Ausbildung. Sie besteht aus:

- Einem **Lernbereich** ("Lernen") mit strukturierten Themenkarten (Definition, Strukturen, Funktion, Zusammenhänge, Symptome, Diagnostik, Therapie, Physiotherapie-Bezug).
- Einem **Multiple-Choice-Quiz** mit Einstellungen (Kategorie, Thema, Schwierigkeit, Fragenanzahl, Modus) und einem **Prüfungsmodus** (Ergebnis erst am Ende).
- Einem **Schwächenmodus** (häufig falsch beantwortete Fragen bevorzugt wiederholen).
- Einer **Fortschrittsansicht** (Trefferquote je Kategorie/Thema, persistiert in `localStorage`).

**Wichtigstes Prinzip des Projekts:** Alle Lerninhalte und Quizfragen müssen aus den persönlichen Lernquellen des Nutzers (PDFs, DOCX, PPTX, teils JSON) im Ordner `lernquellen/` stammen. Nichts darf frei erfunden werden. Wo notwendiges Grundlagenwissen ergänzt wurde (weil eine Quelle es voraussetzt, aber nicht erklärt), ist das im Datenmodell über `src.t = "ergänzung"` (statt `"quelle"`) gekennzeichnet. Diese Unterscheidung ist zentral und darf bei zukünftigen Erweiterungen nicht aufgeweicht werden.

Es handelt sich **nicht** um eine allgemeine Anatomie-Website, sondern um einen persönlichen Lernassistenten, der 1:1 auf den Materialien des Nutzers aufbaut.

---

## 2. Architektur

- Reines **HTML/CSS/Vanilla-JS**, keine Frameworks, keine npm-Abhängigkeiten, kein Bundler.
- **4 Dateien** bilden die App: `index.html`, `styles.css`, `data.js`, `app.js` (in dieser Reihenfolge im `<script>`-Tag geladen: `data.js` vor `app.js`, da `app.js` die globalen Konstanten aus `data.js` direkt verwendet).
- **State-Management:** Ein einfaches globales `state = { view, params }`-Objekt in `app.js`, kein Router-Framework – eigene `go(view, params)`-Funktion rendert die App neu (`render()` leert `#app` und ruft die passende `renderXxx()`-Funktion auf).
- **Persistenz:** `localStorage` unter dem Key `lernphysio_progress_v2` (siehe Abschnitt 5).
- **Kein Build-Prozess.** Die App kann direkt per Doppelklick auf `index.html` (funktioniert über `file://`, da nur `<script src="...">`-Includes verwendet werden) oder über einen simplen HTTP-Server geöffnet werden:
  ```bash
  cd /Users/steffen/Documents/ChatGPT/LernPhysio
  python3 -m http.server 4173
  # dann http://localhost:4173 öffnen
  ```
- Für die Vorschau im Rahmen dieser Session wurde testweise ein `.claude/launch.json` (Projekt-Root **und** in `lernquellen/`, siehe Abschnitt 8 "Aufräumen") angelegt, das einen lokalen Python-HTTP-Server auf Port 4173 konfiguriert.

---

## 3. Dateistruktur

```
/Users/steffen/Documents/ChatGPT/LernPhysio/
├── index.html              # HTML-Grundgerüst, Sidebar-Navigation, Topbar mit Suche
├── styles.css               # Gesamtes CSS (ein einziger minifizierter Block + wenige Zusatzregeln), Design-Tokens als CSS-Variablen
├── data.js                  # Datenbasis: CATEGORIES, topics[], quizBank[] (~1220 Zeilen, ~360 KB)
├── app.js                   # Gesamte App-Logik: Router, Rendering, Quiz-Engine, Fortschritt, Suche (~514 Zeilen)
├── README.md                 # Kurze, z. T. veraltete Projekt-Kurzbeschreibung (aus dem allerersten Scaffold, nicht durchgängig aktualisiert)
├── neue_quizfragen.js        # Zwischenablage-Datei: 101 vom Nutzer bereitgestellte Rohfragen (q237–q337), bereits VOLLSTÄNDIG in data.js übernommen – redundant, kann gelöscht werden
├── .gitignore                # enthält nur ".DS_Store"
├── .claude/launch.json       # Lokale Preview-Server-Konfiguration (Python http.server, Port 4173)
├── .git/                     # Git-Repo, main-Branch, bisher NUR 1 Commit (siehe Abschnitt 8)
└── lernquellen/               # Alle Original-Lernquellen des Nutzers + Hilfsdateien (siehe Abschnitt 4)
    └── .claude/launch.json    # Duplikat der Preview-Konfig (Testartefakt dieser Session, siehe Abschnitt 8)
```

---

## 4. Ordner `lernquellen/` – Rohquellen

Dies ist die **primäre Wissensbasis**. Enthält:

### 4.1 Original-Lernmaterialien (vom Nutzer bereitgestellt, vollständig ausgewertet)
- `Anatomie Rumpf CI.pdf` (127 Seiten) – Wirbelsäule, Thorax, Rückenmuskulatur, Kopfgelenke, Bauchwand
- `Anatomie Untere Extremitaet CI gesamt - Revision-2.pdf` (166 Seiten; `Revision.pdf` ist byte-identisch, nicht separat verwendet) – Becken, Hüfte, Knie, Unterschenkel, Fuß
- `Arbeitsblatt efferente Leitungsbahnen.docx` – Pyramidenbahn/extrapyramidales System
- `Auftrag Bewusstseinslagen Physiologie.docx` – nur Arbeitsauftrag, kaum Fachinhalt (Bewusstseinsstufen wurden daher größtenteils ergänzt, klar markiert)
- `Das Gehirn Einfuehrung und Telencephalon PDF-2.pdf` (50 Seiten)
- `Hirndurchblutung1.pdf` (1 Seite, reine Gefäß-Beschriftungsgrafik)
- `Hirnstamm Fragen.docx` – enthält faktisch primär Kleinhirn-Inhalte + 10 unbeantwortete Hirnstamm-Fragen
- `Kleinhirn Thieme Zusammenfassung.docx`
- `Lernfeld 4 - HKS neu.pptx` (45 Folien, Herz-Kreislauf-Anatomie)
- `Rindenfelder PDF.pdf` (29 Seiten)
- `Knie TEP.pdf`, `SKL Ortho_*.pdf` (Coxarthrose, DD Knie, Meniskusschäden, VKB, Patellaluxation, HG-Dysplasie, Epiphysiolysis capitis femoris), `SKL Chirugie/Chirurgie *.pdf` (Hüftgelenk/Oberschenkel, Beckenverletzungen, Fallbeispiel) – klinische Themen Knie/Hüfte/Becken

### 4.2 Extern nachgereichte Quellen (nicht im Ordner, aber ausgewertet)
- `~/Downloads/Physiologie - Muskelgewebe.pdf`
- `~/Downloads/Physiologie - Bindegewebe Stuetzgewebe  CI.pdf` (Achtung: doppeltes Leerzeichen im Original-Dateinamen)

### 4.3 JSON-Dateien mit Rohfragen (⚠️ NICHT direkt verwendet, siehe unten)
- `Muskelgewebe_Quizfragen.json`, `Bindegewebe_Quizfragen.json`, `Hirnstamm_Quizfragen.json`, `SKL_Chirurgie_Quiz_25.json`, `SKL_Orthopaedie_Quiz_25.json`

**Wichtig:** Diese 5 JSON-Dateien wurden vom Nutzer nachgereicht, hatten aber gravierende Qualitätsmängel:
- Bei Muskelgewebe/Bindegewebe/Hirnstamm waren die falschen Antwortoptionen wortidentische Platzhalter (`"Falsche Antwort"`, `"Keine passende Aussage"`, `"Nicht relevante Struktur"`) – die richtige Antwort war dadurch ohne Fachwissen erkennbar.
- Bei den SKL-Dateien waren die Erklärungen reine Textbausteine ohne Inhalt (`"Die richtige Antwort beschreibt den zentralen … Zusammenhang"`), die Quellenangabe war nur pauschal (`"SKL-Chirurgie"` statt echtem Dateinamen).

**Lösung, die in dieser Session umgesetzt wurde:** Die zugrunde liegenden echten PDF-Quellen wurden komplett neu gelesen und daraus **eigene, hochwertige Fragen mit echten Distraktoren** erstellt (siehe Abschnitt 6). Die JSON-Dateien selbst sind **nicht** in `data.js` eingeflossen und dienen nur noch als Referenz/Altlast. Sie könnten bei Bedarf gelöscht werden.

### 4.4 Extraktions-Zwischendateien (⚠️ FLÜCHTIG, existieren nur in der aktuellen Session!)
Während der Bearbeitung wurden strukturierte Markdown-Zwischendateien mit Volltext-Extraktion + fertigen Fragen-Entwürfen erzeugt, u. a. unter:
```
/private/tmp/claude-501/.../scratchpad/extract/*.md   (erste Extraktionsrunde, 10 Dateien)
/private/tmp/claude-501/.../scratchpad/extract2/*.md  (zweite Runde: muskelgewebe.md, bindegewebe.md, knie_klinik.md, huefte_becken_klinik.md)
```
**Diese Pfade liegen im Scratchpad-Verzeichnis der Session und sind NICHT dauerhaft** – ein neuer Chat/Modell hat darauf keinen Zugriff mehr. Falls weitere Fragen aus denselben Quell-PDFs benötigt werden, müssen die PDFs erneut gelesen werden. Der komplette extrahierte Fachinhalt (Definitionen, Fakten, Zusammenhänge) wurde aber bereits in die `topics[]`-Einträge in `data.js` übernommen – nur die Rohtext-Extraktion selbst ist nicht mehr vorhanden.

---

## 5. Datenmodell (`data.js`)

### 5.1 `CATEGORIES` (4 Hauptkategorien, fix)
```js
const CATEGORIES = [
  { id: "anatomie", label: "Anatomie" },
  { id: "physiologie", label: "Physiologie" },
  { id: "klinik", label: "Pathologie & Klinik" },
  { id: "physiotherapie", label: "Physiotherapie" },
];
```
Jedes `topic.cat` und `quizBank[].cat` **muss** einer dieser 4 IDs entsprechen. Das wird in App-Logik (Filter-Dropdowns, Fortschritts-Aggregation) vorausgesetzt.

### 5.2 `topics[]` – Lerninhalte (aktuell 45 Einträge)
Jedes Element:
```js
{
  id: "t_xxx",              // eindeutige ID, wird von quizBank[].topic referenziert
  cat: "anatomie",           // eine der 4 CATEGORIES-IDs
  sub: "Wirbelsäule & Rumpf", // freier Unterkategorie-String (Body-Region/System), wird für Gruppierung in der Lernübersicht verwendet
  title: "…",                 // Kartentitel
  def: "…",                   // Definition (Kurztext)
  struct: "…",                // Wichtige Strukturen
  func: "…",                  // Funktion
  zush: "…",                  // Zusammenhänge
  sympt: "…",                 // Symptome (kann "" sein)
  diag: "…",                  // Diagnostik (kann "" sein)
  ther: "…",                  // Therapie (kann "" sein)
  physio: "…",                // Physiotherapie-Bezug (kann "" sein)
  src: [{ q: "Dateiname.pdf", t: "quelle" }, …]  // Array von Quellenangaben, t ∈ {"quelle","ergänzung"}
}
```
Leere Felder (`""`) werden in `app.js` über `fieldRow()` automatisch ausgeblendet (kein leeres `<dt>/<dd>`-Paar).

**Vorhandene Unterkategorien (`sub`) je `cat`** (Stand jetzt, siehe Live-Auszählung unten):
- `anatomie`: Wirbelsäule & Rumpf (4), Thorax & Atmung (1), Bauch & Becken (2), Hüfte & Becken (2), Knie (2), Unterschenkel & Fuß (2), Herz-Kreislauf (3), Gehirn & Nervensystem (6)
- `physiologie`: Herz-Kreislauf (1), Gehirn & Nervensystem (1), Muskelgewebe (1), Bindegewebe (1)
- `klinik`: Gehirn & Nervensystem (3), Wirbelsäule & Rumpf (1), Herz-Kreislauf (1), Knie (6), Hüfte & Becken (5)
- `physiotherapie`: Gehirn & Nervensystem (1), Wirbelsäule & Rumpf (1), Hüfte & Becken (1)

### 5.3 `quizBank[]` – Quizfragen (aktuell 542 Einträge)
Jedes Element:
```js
{
  id: "qNNN",                 // eindeutig, fortlaufend vergeben (aktuell bis q542, siehe Nummernräume unten)
  topic: "t_xxx",              // MUSS auf existierende topics[].id verweisen (wird strikt geprüft)
  cat: "anatomie",              // MUSS mit topics[topic].cat übereinstimmen (wird nicht automatisch synchronisiert, siehe Abschnitt 7!)
  sub: "Wirbelsäule & Rumpf",   // Unterkategorie, i. d. R. identisch zu topics[topic].sub
  diff: "leicht" | "mittel" | "schwer",
  type: "fakt" | "verstaendnis" | "zuordnung" | "anatomie" | "klinik" | "physio" | "fall" | "diagnostik" | "funktion", // freier String, aktuell NICHT für UI-Filterung genutzt (nur informativ)
  q: "Fragetext?",
  opts: ["A", "B", "C", "D"],  // GENAU 4 Optionen
  a: 0,                          // Index (0–3) der korrekten Antwort in opts
  exp: "Erklärungstext",        // wird nach Beantwortung angezeigt (außer im Prüfungsmodus)
  src: { q: "Dateiname.pdf", t: "quelle" | "ergänzung" }
}
```

**ID-Nummernräume (chronologisch entstanden, für Nachvollziehbarkeit):**
- `q1–q153`: erste Runde, alle 32 ursprünglichen Themen (Anatomie/Physiologie/Klinik/Physiotherapie aus den 10 Kern-PDFs/DOCX/PPTX)
- `q154–q236`: zweite Erweiterungsrunde (mehr Fragen zu denselben 32 Themen)
- `q237–q337`: vom Nutzer bereitgestellte 101 Fragen (`neue_quizfragen.js`), unverändert übernommen
- `q338–q537`: dritte Runde – 200 neue Fragen zu 13 NEUEN Themen (Muskelgewebe, Bindegewebe, 6× Knie-Klinik, 5× Hüfte/Becken-Klinik), erzeugt aus den echten PDFs als Ersatz für die minderwertigen JSON-Dateien
- `q538–q542`: 5 ergänzende Hirnstamm-Fragen (echte Distraktoren statt JSON-Platzhalter), `src.t = "ergänzung"`

**Validierungsregeln, die beim Erweitern IMMER geprüft werden sollten** (wurden in dieser Session jedes Mal per Node-Script verifiziert):
```bash
node --check data.js   # Syntax
node -e '
$(cat data.js)
// 1. keine doppelten quizBank[].id
// 2. jede quizBank[].topic verweist auf existierende topics[].id
// 3. jede quizBank[].cat ist eine gültige CATEGORIES-id
// 4. jedes topics[].cat ist eine gültige CATEGORIES-id
// 5. jede opts hat genau 4 Einträge, a ist 0-3
// 6. jedes topic hat mindestens 1 Frage
'
```

---

## 6. `app.js` – App-Logik im Detail

### 6.1 Progress-Persistenz
```js
const STORAGE_KEY = "lernphysio_progress_v2";
// localStorage-Schema:
{
  answers: {
    "q123": { attempts: 3, correct: 2, wrong: 1, lastCorrect: true, ts: 1234567890 },
    …
  }
}
```
- `recordAnswer(qid, correct)` aktualisiert diesen State bei jeder Quiz-Antwort und speichert sofort.
- `computeCategoryStats()` / `computeTopicStats()` aggregieren `{total, answered, correct}` je Kategorie/Thema über `quizBank`.
- `getWeakQuestions()`: Fragen, bei denen `wrong >= correct` (Schwächen-Kandidaten), sortiert nach größtem Rückstand.
- `getWrongQuestions()`: Fragen, deren **letzte** Antwort falsch war (`lastCorrect === false`).
- `getOverallStats()`: globale Trefferquote über alle beantworteten Fragen.

### 6.2 Router / Views
`state = { view, params }`, `go(view, params)` wechselt View + rendert neu + scrollt nach oben + schließt mobiles Sidebar-Menü.

Views (Funktion in `app.js`):
| view-Name | Funktion | Beschreibung |
|---|---|---|
| `home` | `renderHome()` | Dashboard: Stats-Kacheln, 4 Action-Cards (Lernen/Quiz/Schwächen/Fortschritt), Fortschritt je Kategorie, Prüfungsmodus-Einstieg |
| `learn` | `renderLearn()` | Themen gruppiert nach Kategorie, als Karten-Grid mit Mini-Fortschrittsbalken |
| `learn-topic` | `renderLearnTopic()` | Detailansicht eines Themas (alle Felder aus 5.2) + "Quiz zu diesem Thema starten"-Button + Quellen-Chips |
| `quizsetup` | `renderQuizSetup()` | Filter-Formular (Kategorie→Thema kaskadierend, Schwierigkeit, Anzahl, Modus) + Live-Zähler passender Fragen |
| `quiz` | `renderQuiz()` | Fragen-Durchführung, eine Frage nach der anderen, Fortschrittsbalken |
| `quizresult` | `renderQuizResult()` | Ergebnis (Punktzahl, %, Stärken/Schwächen je Kategorie ≥/< 70%), im Prüfungsmodus zusätzlich vollständige Antwortübersicht (`renderExamReview()`) |
| `weak` | `renderWeak()` | Zwei Einstiege: "Schwächen-Quiz" (nach Rückstand sortiert) und "Falsch beantwortete Fragen" (zufällig gemischt) |
| `progress` | `renderProgress()` | Fortschritt je Kategorie (Balken) + je Thema (Karten-Grid, klickbar zurück zu `learn-topic`) |

### 6.3 Quiz-Filterlogik
```js
filterQuestions(f)  // f = {cat, topic, diff, mode}
// mode ∈ "alle" | "ungelernt" (noch nie beantwortet) | "falsch" (letzte Antwort falsch)
//        | "schwaeche" (schon mal falsch beantwortet) | "zufall" (= "alle", nur andere Sortierung)
buildQuizFromFilters(f)  // wendet filterQuestions an, shuffelt (außer bei "schwaeche" → nach Rückstand sortiert), schneidet auf f.count zu
// erzeugt: { queue, index, correct, wrong, exam, results }
```
`onAnswer(q, chosenIdx)` markiert Antwort-Buttons (grün=richtig, rot=falsch), zeigt im Nicht-Prüfungsmodus sofort die Erklärung, im Prüfungsmodus nicht (nur farbliche Markierung der gewählten Antwort, Ergebnis komplett erst am Ende über `quizresult`).

### 6.4 Suche
Topbar-Suchfeld (`#searchInput`) filtert `topics` client-seitig über `(title + def + sub).toLowerCase().includes(term)`, zeigt Dropdown mit bis zu 8 Treffern, Klick → `go("learn-topic", {id})`.

### 6.5 Hilfsfunktionen
- `el(html)` / `mount(html)`: einfache HTML-String→DOM-Helfer (kein virtuelles DOM, jedes Rendering baut den `#app`-Inhalt komplett neu auf).
- `esc(s)`: XSS-Escaping für `&`, `<`, `>` beim Einfügen von Nutzerdaten/Quellinhalten in `innerHTML`.
- `toast(msg)`: kurze Erfolgsmeldung unten rechts (z. B. nach Reset).
- `shuffle(arr)`: Fisher-Yates.

---

## 7. Design-System (`styles.css`)

- **Ein Design-Token-System über CSS-Variablen im `:root`**, alle Komponenten referenzieren `var(--xxx)` statt Literalfarben (mit Ausnahme einiger fest kodierter Werte, siehe unten).
- **Aktuelle Farbpalette (Rot-Weiß-Theme, seit dieser Session):**
  ```css
  --ink:#271416;      /* Haupttextfarbe (fast schwarz mit Rotstich) */
  --muted:#8c6b6c;     /* gedämpfter Text */
  --surface:#fff;       /* Kartenhintergrund */
  --canvas:#fdf6f6;      /* Seitenhintergrund (sehr helles Rosa) */
  --line:#f2d9d9;         /* Rahmen/Trennlinien */
  --teal:#c8202f;          /* PRIMÄRFARBE (Rot) – Variablenname ist historisch/irreführend! */
  --blue:#8a1420;           /* Sekundärfarbe (dunkleres Rot) */
  --mint:#fbe3e3;             /* helle Akzentfläche (Rosa statt Mint) */
  --orange:#d97706;            /* unverändert, für Marker/Warnfarbe */
  --red:#dc4c54;                 /* "falsch"-Farbe im Quiz, semantisch, unverändert */
  --shadow:0 10px 30px #7a1a1a14;
  ```
  ⚠️ **Wichtiger Hinweis für Weiterarbeit:** Die CSS-Variablennamen `--teal`, `--blue`, `--mint` sind **historisch aus dem ursprünglichen Türkis-Theme** und wurden NICHT umbenannt, nur ihre Werte geändert. Das ist funktional unproblematisch (alle Komponenten nutzen `var(--teal)` etc.), aber verwirrend beim Lesen des Codes. Falls ein neues Theme kommt, entweder Variablennamen konsequent umbenennen (z. B. `--accent`, `--accent-dark`, `--accent-light`) und alle Vorkommen in `styles.css` mitziehen, oder die Benennung bewusst so belassen und dokumentieren.
- **Fest kodierte (nicht Variable-basierte) Farben, absichtlich unverändert:**
  - `.answer-option.correct` → Grün (`#34a874` / `#e6f8ed`) – semantische Erfolgsfarbe, sollte unabhängig vom Theme immer Grün bleiben.
  - `.answer-option.wrong` → Rot (`#e17075` / `#fff0f0`) – im aktuellen Rot-Theme thematisch passend, war aber schon vorher rot (semantisch "falsch").
  - Sidebar-Hintergrund (`#2c0d10`, dunkles Rot-Braun) ist fest kodiert, nicht über Variable.
- **Layout:** CSS Grid für App-Shell (Sidebar 244px + Content), responsive Breakpoints bei 850px (Sidebar wird zu Off-Canvas-Menü mit Hamburger-Button) und 550px (einspaltige Grids).
- **Kein Dark-Mode.** Die App hat aktuell nur ein einziges (helles, rot-weißes) Theme, keine `prefers-color-scheme`-Unterstützung. Falls das gewünscht wird, müsste ein komplettes Dark-Palette-Set ergänzt werden (aktuell nicht vorhanden – anders als bei Claude-Artifacts wird hier kein Dark-Mode erwartet, da es eine eigenständige lokale App ist, kein Artifact).

---

## 8. Bekannte offene Punkte / TODOs

1. **Git-Historie ist minimal:** Es gibt nur 1 Commit (`33563c2`, Initial commit mit generischem Scaffold). **Alle** seitherigen Änderungen (komplette Neuentwicklung von `data.js`/`app.js`/`styles.css`/`index.html`, alle 45 Themen, alle 542 Fragen, Rot-Theme, Texte) sind **uncommitted** im Working Tree. Vor größeren weiteren Änderungen sollte der Nutzer fragen, ob committed werden soll (nur auf explizite Anfrage tun!).
2. **Testartefakte aufräumen:**
   - `.claude/launch.json` existiert doppelt (Projekt-Root und `lernquellen/.claude/launch.json`) – wurde nur für die Live-Vorschau in dieser Session angelegt. Kann bei Bedarf entfernt oder als dauerhafte Dev-Konfiguration behalten werden.
   - `neue_quizfragen.js` im Projekt-Root ist eine reine Zwischenablage-Datei (Inhalt vollständig in `data.js` übernommen) – kann gelöscht werden, wird aktuell nicht mehr referenziert.
   - `README.md` ist inhaltlich veraltet (beschreibt noch das ursprüngliche generische Anatomie-Scaffold mit Karteikarten/Prüfungsquiz-Konzept, das so nicht mehr existiert) – sollte aktualisiert werden.
3. **`cat`-Feld ist nicht automatisch synchron:** `quizBank[].cat` wird beim Anlegen einer Frage manuell gesetzt und **nicht** aus `topics[topic].cat` abgeleitet. Bei künftigen Erweiterungen darauf achten, dass beide übereinstimmen (wurde in dieser Session per Skript vor jedem Merge geprüft und normalisiert – s. Abschnitt 5.3).
4. **`type`-Feld wird nicht in der UI genutzt.** Es ist im Datenmodell vorhanden (Faktenwissen/Verständnis/Zuordnung/Fallbeispiel etc., wie ursprünglich vom Nutzer gefordert), aber `quizsetup` filtert aktuell nur nach `cat`, `topic`, `diff`, `mode` – **nicht** nach Fragetyp. Falls der Nutzer das explizit will, müsste ein weiteres Dropdown in `renderQuizSetup()` + `filterQuestions()` ergänzt werden.
5. **Kein Bilder-Bereich** (laut ursprünglicher Anforderung des Nutzers bewusst weggelassen – "Erstelle KEINEN separaten Bereich Bilder lernen").
6. **Ungleichmäßige Themen-Abdeckung:** Manche `sub`-Kategorien (z. B. "Thorax & Atmung") haben nur 1 Thema mit wenigen Fragen, andere (z. B. "Gehirn & Nervensystem" in Anatomie, "Knie" in Klinik) sind deutlich umfangreicher. Das spiegelt einfach wider, wie viel Material in den jeweiligen Original-Quellen vorhanden war – kein Bug, aber ggf. für den Nutzer erwähnenswert, falls er "ausgewogenere" Abdeckung wünscht.
7. **Lernquellen-Ordner enthält noch ungenutzte Rohdateien:** Die 5 JSON-Dateien (Abschnitt 4.3) liegen weiterhin im Ordner, werden aber von der App nicht geladen (nur `data.js`/`app.js` werden von `index.html` eingebunden). Rein informativ/historisch, kein technisches Problem.
8. **Keine Tests, kein Linting, kein CI.** Qualitätssicherung erfolgte in dieser Session ausschließlich durch manuelle Node-Skripte (Syntax-Check, Referenz-Integrität) – siehe Validierungsregeln in Abschnitt 5.3. Diese sollten bei jeder künftigen Erweiterung erneut ausgeführt werden.

---

## 9. Empfohlene nächste Schritte (falls der Nutzer weitermacht)

Mögliche, vom Nutzer bisher nicht explizit beauftragte, aber naheliegende nächste Schritte:
1. Aufräumen der Testartefakte (Abschnitt 8, Punkt 2) und `README.md` aktualisieren.
2. Entscheiden, ob/wann committed werden soll (Git-Historie ist aktuell fast leer).
3. Weitere noch nicht ausgewertete Themenfelder ergänzen, falls der Nutzer neue Lernquellen nachreicht (gleiches Vorgehen wie in dieser Session: PDF/DOCX/PPTX vollständig lesen lassen → strukturierte Extraktion mit `[QUELLE]`/`[ERGÄNZUNG]`-Kennzeichnung → daraus Topics + Fragen mit echten Distraktoren bauen → in `data.js` mergen → Integritäts-Checks laufen lassen).
4. Falls gewünscht: Fragetyp-Filter (`type`) in der Quiz-UI ergänzen (Punkt 4 in Abschnitt 8).
5. Falls gewünscht: Ausgewogenere Fragenanzahl pro Unterthema (aktuell sehr heterogen, s. Abschnitt 8 Punkt 6).
6. Design/Copy-Feinschliff bei Bedarf (der Nutzer hat in dieser Session mehrfach einzelne Texte/Farben nachjustiert – z. B. Homepage-Untertitel, Sidebar-Tipp-Text, "powered by Steffen"-Credit, komplettes Rot-Weiß-Rebranding).

---

## 10. Wichtige Verhaltensregeln aus dieser Session (bitte beibehalten)

- **Niemals Fakten erfinden.** Jede neue Frage/jeder neue Lerninhalt muss nachweislich aus einer echten Quelle stammen (`src.t: "quelle"`) oder als notwendig ergänztes Grundlagenwissen klar gekennzeichnet sein (`src.t: "ergänzung"`), wenn eine Quelle etwas voraussetzt, aber nicht erklärt.
- **Keine Platzhalter-Distraktoren.** Falsche Antwortoptionen müssen fachlich plausibel und thematisch passend sein – niemals generische Füllwörter wie "Falsche Antwort".
- **Keine Leer-Erklärungen.** `exp` muss immer einen echten, inhaltlichen Erklärungssatz enthalten.
- **Vor jedem Merge neuer Fragen in `data.js`:** Node-Syntax-Check + Integritätsprüfung (eindeutige IDs, gültige `topic`-Referenzen, gültige `cat`-Werte, genau 4 Optionen, `a` im Bereich 0–3, jedes Thema hat ≥1 Frage) – siehe Abschnitt 5.3.
- **Quellenangaben immer mit exaktem Original-Dateinamen**, nicht mit pauschalen Sammelbegriffen (Lehre aus den fehlerhaften JSON-Dateien, siehe Abschnitt 4.3).
