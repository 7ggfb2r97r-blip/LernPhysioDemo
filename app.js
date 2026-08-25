"use strict";
/* LernPhysio – App-Logik. Lernstoff & Fragen liegen in data.js (topics, quizBank, CATEGORIES). */

const STORAGE_KEY = "lernphysio_progress_v2";

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { answers: {} };
    const parsed = JSON.parse(raw);
    if (!parsed.answers) parsed.answers = {};
    return parsed;
  } catch (e) {
    return { answers: {} };
  }
}
function saveProgress(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}
let progress = loadProgress();

function recordAnswer(qid, correct) {
  const rec = progress.answers[qid] || { attempts: 0, correct: 0, wrong: 0, lastCorrect: null };
  rec.attempts += 1;
  if (correct) rec.correct += 1; else rec.wrong += 1;
  rec.lastCorrect = correct;
  rec.ts = Date.now();
  progress.answers[qid] = rec;
  saveProgress(progress);
}

function topicById(id) { return topics.find((t) => t.id === id); }
function catLabel(id) { const c = CATEGORIES.find((c) => c.id === id); return c ? c.label : id; }

// ---------- Statistik ----------
function computeCategoryStats() {
  const out = {};
  CATEGORIES.forEach((c) => (out[c.id] = { total: 0, answered: 0, correct: 0 }));
  quizBank.forEach((q) => {
    const s = out[q.cat];
    if (!s) return;
    s.total += 1;
    const rec = progress.answers[q.id];
    if (rec && rec.attempts > 0) {
      s.answered += 1;
      if (rec.lastCorrect) s.correct += 1;
    }
  });
  return out;
}
function computeTopicStats() {
  const out = {};
  topics.forEach((t) => (out[t.id] = { total: 0, answered: 0, correct: 0 }));
  quizBank.forEach((q) => {
    const s = out[q.topic];
    if (!s) return;
    s.total += 1;
    const rec = progress.answers[q.id];
    if (rec && rec.attempts > 0) {
      s.answered += 1;
      if (rec.lastCorrect) s.correct += 1;
    }
  });
  return out;
}
function pct(correct, answered) { return answered > 0 ? Math.round((correct / answered) * 100) : 0; }

function getWeakQuestions() {
  return quizBank.filter((q) => {
    const rec = progress.answers[q.id];
    return rec && rec.wrong > 0 && rec.wrong >= rec.correct;
  }).sort((a, b) => {
    const ra = progress.answers[a.id], rb = progress.answers[b.id];
    return (rb.wrong - rb.correct) - (ra.wrong - ra.correct);
  });
}
function getWrongQuestions() {
  return quizBank.filter((q) => {
    const rec = progress.answers[q.id];
    return rec && rec.lastCorrect === false;
  });
}
function getOverallStats() {
  let answered = 0, correct = 0;
  Object.values(progress.answers).forEach((r) => { if (r.attempts > 0) { answered += 1; if (r.lastCorrect) correct += 1; } });
  return { answered, correct, total: quizBank.length, pct: pct(correct, answered) };
}

// ---------- Router ----------
const app = document.getElementById("app");
let state = { view: "home", params: {} };

function go(view, params) {
  state = { view, params: params || {} };
  document.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
  const navMap = { home: "home", learn: "learn", "learn-topic": "learn", quizsetup: "quizsetup", quiz: "quizsetup", quizresult: "quizsetup", weak: "weak", progress: "progress" };
  const navBtn = document.querySelector(`.nav-link[data-view="${navMap[view] || view}"]`);
  if (navBtn) navBtn.classList.add("active");
  render();
  window.scrollTo(0, 0);
  document.querySelector(".sidebar").classList.remove("open");
}

document.querySelectorAll(".nav-link").forEach((btn) => {
  btn.addEventListener("click", () => go(btn.dataset.view));
});
document.getElementById("menuToggle").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});
document.getElementById("resetData").addEventListener("click", () => {
  if (confirm("Gesamten Lernfortschritt wirklich zurücksetzen?")) {
    progress = { answers: {} };
    saveProgress(progress);
    render();
    toast("Fortschritt wurde zurückgesetzt.");
  }
});

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

function el(html) {
  const d = document.createElement("div");
  d.innerHTML = html.trim();
  return d.firstElementChild;
}
function mount(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html.trim();
  while (tmp.firstChild) app.appendChild(tmp.firstChild);
}
function esc(s) { return (s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

// ---------- Suche ----------
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
searchInput.addEventListener("input", () => {
  const term = searchInput.value.trim().toLowerCase();
  if (term.length < 2) { searchResults.hidden = true; searchResults.innerHTML = ""; return; }
  const matches = topics.filter((t) => (t.title + " " + t.def + " " + t.sub).toLowerCase().includes(term)).slice(0, 8);
  if (!matches.length) { searchResults.hidden = true; return; }
  searchResults.innerHTML = matches.map((t) => `<button class="search-result" data-id="${t.id}"><strong>${esc(t.title)}</strong><small>${esc(catLabel(t.cat))} · ${esc(t.sub)}</small></button>`).join("");
  searchResults.hidden = false;
  searchResults.querySelectorAll(".search-result").forEach((btn) => {
    btn.addEventListener("click", () => {
      searchResults.hidden = true; searchInput.value = "";
      go("learn-topic", { id: btn.dataset.id });
    });
  });
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".global-search") && !e.target.closest(".search-results")) searchResults.hidden = true;
});

// ---------- Render ----------
function render() {
  app.innerHTML = "";
  const view = { home: renderHome, learn: renderLearn, "learn-topic": renderLearnTopic, quizsetup: renderQuizSetup, quiz: renderQuiz, quizresult: renderQuizResult, weak: renderWeak, progress: renderProgress }[state.view];
  (view || renderHome)();
}

function renderHome() {
  const os = getOverallStats();
  const catStats = computeCategoryStats();
  mount(`
    <div class="eyebrow">LernPhysio</div>
    <h1 class="page-title">Dein persönlicher Lernassistent</h1>
    <div class="grid stats">
      <div class="card"><div class="stat-label">Fragen beantwortet</div><div class="stat-value">${os.answered}/${os.total}</div><div class="stat-note">${os.pct}% zuletzt richtig</div></div>
      <div class="card"><div class="stat-label">Lernthemen</div><div class="stat-value">${topics.length}</div><div class="stat-note">aus 10 Lernquellen</div></div>
      <div class="card"><div class="stat-label">Schwächen</div><div class="stat-value">${getWeakQuestions().length}</div><div class="stat-note">Fragen zum Wiederholen</div></div>
      <div class="card"><div class="stat-label">Kategorien</div><div class="stat-value">${CATEGORIES.length}</div><div class="stat-note">aus deinen Quellen abgeleitet</div></div>
    </div>
    <div class="section-header"><h2>Loslegen</h2></div>
    <div class="grid action-grid" id="homeActions">
      <button class="card action-card" data-go="learn"><div class="action-icon">▦</div><strong>Lernen</strong><span>Alle Themen strukturiert nach Kategorien durchsehen.</span></button>
      <button class="card action-card" data-go="quizsetup"><div class="action-icon">✓</div><strong>Quiz starten</strong><span>Multiple-Choice-Fragen nach Thema, Schwierigkeit und Modus.</span></button>
      <button class="card action-card" data-go="weak"><div class="action-icon">⚠</div><strong>Meine Schwächen</strong><span>Gezielt Fragen wiederholen, die oft falsch beantwortet wurden.</span></button>
      <button class="card action-card" data-go="progress"><div class="action-icon">◔</div><strong>Fortschritt</strong><span>Trefferquote je Kategorie und Thema im Überblick.</span></button>
    </div>
    <div class="section-header"><h2>Fortschritt je Kategorie</h2></div>
    <div class="grid two-col">
      <div class="card">
        ${CATEGORIES.map((c) => { const s = catStats[c.id]; return `<div class="progress-row"><div class="progress-label"><span>${esc(c.label)}</span><span>${pct(s.correct, s.answered)}%</span></div><div class="bar"><i style="width:${pct(s.correct, s.answered)}%"></i></div></div>`; }).join("")}
      </div>
      <div class="card">
        <div class="stat-label">Prüfungsmodus</div>
        <p class="subtitle" style="margin-top:8px">Zufällige Fragen ohne sofortige Erklärung, Ergebnis erst am Ende – simuliert eine echte Prüfungssituation.</p>
        <button class="primary" id="startExam">Prüfungsmodus starten</button>
      </div>
    </div>
  `);
  app.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  document.getElementById("startExam").addEventListener("click", () => go("quizsetup", { exam: true }));
}

// ---------- Lernen ----------
function renderLearn() {
  const topicStats = computeTopicStats();
  const byCat = {};
  CATEGORIES.forEach((c) => (byCat[c.id] = topics.filter((t) => t.cat === c.id)));
  mount(`
    <div class="eyebrow">Lernen</div>
    <h1 class="page-title">Lernübersicht</h1>
    <p class="subtitle">Aus deinen Quellen thematisch zusammengeführt. Jede Karte zeigt Definition, Strukturen, Funktion, Zusammenhänge, Symptome, Diagnostik, Therapie und Physiotherapie-Bezug – sofern in den Quellen vorhanden.</p>
    <div id="learnCats"></div>
  `);
  const holder = document.getElementById("learnCats");
  CATEGORIES.forEach((c) => {
    const list = byCat[c.id];
    if (!list.length) return;
    const section = el(`<div><div class="section-header"><h2>${esc(c.label)}</h2><p>${list.length} Themen</p></div><div class="grid library-grid" data-cat="${c.id}"></div></div>`);
    holder.appendChild(section);
    const grid = section.querySelector(`[data-cat="${c.id}"]`);
    list.forEach((t) => {
      const s = topicStats[t.id];
      const p = pct(s.correct, s.answered);
      grid.appendChild(el(`
        <div class="card structure">
          <button data-id="${t.id}">
            <div class="structure-type">${esc(t.sub)}</div>
            <h3>${esc(t.title)}</h3>
            <p>${esc((t.def || "").slice(0, 110))}${(t.def || "").length > 110 ? "…" : ""}</p>
            <div class="bar" style="margin-top:10px"><i style="width:${p}%"></i></div>
          </button>
        </div>`));
    });
    grid.querySelectorAll("button[data-id]").forEach((b) => b.addEventListener("click", () => go("learn-topic", { id: b.dataset.id })));
  });
}

function fieldRow(label, value) {
  if (!value) return "";
  return `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`;
}
function renderLearnTopic() {
  const t = topicById(state.params.id);
  if (!t) { go("learn"); return; }
  const stats = computeTopicStats()[t.id];
  const srcList = t.src.map((s) => `<span class="chip">${esc(s.q)} · ${s.t === "quelle" ? "Quelle" : "Ergänzung"}</span>`).join(" ");
  mount(`
    <button class="back" id="backLearn">← Zurück zur Übersicht</button>
    <div class="eyebrow">${esc(catLabel(t.cat))} · ${esc(t.sub)}</div>
    <h1 class="detail-title">${esc(t.title)}</h1>
    <p class="latin">${esc(t.def)}</p>
    <dl class="detail-grid">
      ${fieldRow("Wichtige Strukturen", t.struct)}
      ${fieldRow("Funktion", t.func)}
      ${fieldRow("Zusammenhänge", t.zush)}
      ${fieldRow("Symptome", t.sympt)}
      ${fieldRow("Diagnostik", t.diag)}
      ${fieldRow("Therapie", t.ther)}
      ${fieldRow("Physiotherapie", t.physio)}
    </dl>
    <div class="section-header"><h2>Fragen zu diesem Thema</h2><p>${stats.total} verfügbar · ${pct(stats.correct, stats.answered)}% Trefferquote</p></div>
    <button class="primary" id="quizTopic">Quiz zu diesem Thema starten</button>
    <div class="section-header"><h2>Quellen</h2></div>
    <div class="chips">${srcList}</div>
  `);
  document.getElementById("backLearn").addEventListener("click", () => go("learn"));
  document.getElementById("quizTopic").addEventListener("click", () => go("quiz", buildQuizFromFilters({ cat: "all", topic: t.id, diff: "all", count: "all", mode: "alle" })));
}

// ---------- Quiz-Einstellungen ----------
function renderQuizSetup() {
  const exam = !!state.params.exam;
  mount(`
    <div class="eyebrow">${exam ? "Prüfungsmodus" : "Quiz"}</div>
    <h1 class="page-title">${exam ? "Prüfungsmodus starten" : "Quiz starten"}</h1>
    <p class="subtitle">${exam ? "Zufällige Fragen, keine sofortige Erklärung, Ergebnis erst am Ende." : "Wähle Kategorie, Thema, Schwierigkeit, Fragenanzahl und Modus."}</p>
    <div class="card">
      <div class="settings settings-2col">
        <div class="field"><label>Kategorie</label>
          <select id="fCat"><option value="all">Alle Kategorien</option>${CATEGORIES.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Thema</label>
          <select id="fTopic"><option value="all">Alle Themen</option></select>
        </div>
      </div>
      <div class="settings" style="margin-top:14px">
        <div class="field"><label>Schwierigkeit</label>
          <select id="fDiff"><option value="all">Gemischt</option><option value="leicht">Leicht</option><option value="mittel">Mittel</option><option value="schwer">Schwer</option></select>
        </div>
        <div class="field"><label>Fragen</label>
          <select id="fCount"><option value="10">10</option><option value="20" selected>20</option><option value="30">30</option><option value="50">50</option><option value="all">Alle verfügbaren</option></select>
        </div>
        <div class="field"><label>Modus</label>
          <select id="fMode">
            <option value="alle">Alle Fragen</option>
            <option value="ungelernt">Noch nicht gelernte Fragen</option>
            <option value="falsch">Falsch beantwortete Fragen</option>
            <option value="schwaeche">Meine Schwächen</option>
            <option value="zufall">Zufällige Fragen</option>
          </select>
        </div>
      </div>
      <p class="stat-note" id="matchCount" style="margin-top:14px"></p>
      <button class="primary" id="startQuiz" style="margin-top:8px">${exam ? "Prüfung starten" : "Quiz starten"}</button>
    </div>
  `);
  const fCat = document.getElementById("fCat"), fTopic = document.getElementById("fTopic"), fDiff = document.getElementById("fDiff"), fCount = document.getElementById("fCount"), fMode = document.getElementById("fMode");
  function refreshTopics() {
    const cat = fCat.value;
    const list = topics.filter((t) => cat === "all" || t.cat === cat);
    fTopic.innerHTML = `<option value="all">Alle Themen</option>` + list.map((t) => `<option value="${t.id}">${esc(t.title)}</option>`).join("");
  }
  function refreshCount() {
    const filters = { cat: fCat.value, topic: fTopic.value, diff: fDiff.value, mode: fMode.value };
    const n = filterQuestions(filters).length;
    document.getElementById("matchCount").textContent = `${n} Fragen passen zu dieser Auswahl.`;
  }
  fCat.addEventListener("change", () => { refreshTopics(); refreshCount(); });
  [fTopic, fDiff, fMode].forEach((elm) => elm.addEventListener("change", refreshCount));
  refreshTopics(); refreshCount();
  document.getElementById("startQuiz").addEventListener("click", () => {
    const params = buildQuizFromFilters({ cat: fCat.value, topic: fTopic.value, diff: fDiff.value, count: fCount.value, mode: fMode.value, exam });
    if (!params.queue.length) { toast("Keine Fragen für diese Auswahl gefunden."); return; }
    go("quiz", params);
  });
}

function filterQuestions(f) {
  let list = quizBank.filter((q) => (f.cat === "all" || q.cat === f.cat) && (f.topic === "all" || q.topic === f.topic) && (f.diff === "all" || q.diff === f.diff));
  const mode = f.mode || "alle";
  if (mode === "ungelernt") list = list.filter((q) => !progress.answers[q.id]);
  else if (mode === "falsch") list = list.filter((q) => { const r = progress.answers[q.id]; return r && r.lastCorrect === false; });
  else if (mode === "schwaeche") list = list.filter((q) => { const r = progress.answers[q.id]; return r && r.wrong > 0; });
  return list;
}
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

function buildQuizFromFilters(f) {
  let list = filterQuestions(f);
  if (f.mode === "schwaeche") {
    list = list.sort((a, b) => { const ra = progress.answers[a.id], rb = progress.answers[b.id]; return (rb.wrong - rb.correct) - (ra.wrong - ra.correct); });
  } else {
    list = shuffle(list);
  }
  const count = f.count === "all" ? list.length : parseInt(f.count, 10);
  const queue = list.slice(0, count);
  return { queue, index: 0, correct: 0, wrong: 0, exam: !!f.exam, results: [] };
}

// ---------- Quiz-Durchführung ----------
function renderQuiz() {
  const s = state.params;
  if (!s.queue || !s.queue.length) { go("quizsetup"); return; }
  if (s.index >= s.queue.length) { go("quizresult", s); return; }
  const q = s.queue[s.index];
  const t = topicById(q.topic);
  mount(`
    <div class="quiz-layout">
      <div class="quiz-meta">
        <span>${s.exam ? "Prüfungsmodus" : "Quiz"}</span>
        <span>Frage ${s.index + 1} / ${s.queue.length}</span>
        <span>${esc(catLabel(q.cat))} · ${esc(t ? t.title : q.sub)}</span>
        <span>Schwierigkeit: ${esc(q.diff)}</span>
      </div>
      <div class="bar"><i style="width:${Math.round((s.index / s.queue.length) * 100)}%"></i></div>
      <div class="question">${esc(q.q)}</div>
      <div class="answers" id="answers"></div>
      <div id="explanationBox"></div>
      <div id="nextBox" style="margin-top:20px"></div>
    </div>
  `);
  const answersBox = document.getElementById("answers");
  q.opts.forEach((opt, idx) => {
    const btn = el(`<button class="answer-option" data-idx="${idx}">${esc(opt)}</button>`);
    answersBox.appendChild(btn);
  });
  answersBox.querySelectorAll(".answer-option").forEach((btn) => {
    btn.addEventListener("click", () => onAnswer(q, parseInt(btn.dataset.idx, 10)));
  });
}

function onAnswer(q, chosenIdx) {
  const correct = chosenIdx === q.a;
  recordAnswer(q.id, correct);
  const s = state.params;
  if (correct) s.correct += 1; else s.wrong += 1;
  s.results.push({ q, chosenIdx, correct });
  document.querySelectorAll(".answer-option").forEach((b) => (b.disabled = true));
  const opts = document.querySelectorAll(".answer-option");
  if (!s.exam) {
    opts[q.a].classList.add("correct");
    if (!correct) opts[chosenIdx].classList.add("wrong");
    const t = topicById(q.topic);
    document.getElementById("explanationBox").innerHTML = `
      <div class="explanation">
        <strong>${correct ? "✓ Richtig" : "✗ Leider falsch"}</strong> – richtige Antwort: <strong>${esc(q.opts[q.a])}</strong>
        <p style="margin:10px 0 0">${esc(q.exp)}</p>
        ${t ? `<p style="margin:8px 0 0;color:var(--muted);font-size:12px">Zusammenhang: ${esc(t.title)} (${esc(catLabel(t.cat))})</p>` : ""}
      </div>`;
  } else {
    opts[chosenIdx].classList.add(correct ? "correct" : "wrong");
  }
  document.getElementById("nextBox").innerHTML = `<button class="primary" id="nextQ">${state.params.index + 1 < state.params.queue.length ? "Nächste Frage" : "Ergebnis anzeigen"}</button>`;
  document.getElementById("nextQ").addEventListener("click", () => {
    state.params.index += 1;
    render();
  });
}

function renderQuizResult() {
  const s = state.params;
  const total = s.queue.length;
  const p = pct(s.correct, total);
  const byCat = {};
  s.results.forEach((r) => { const c = r.q.cat; byCat[c] = byCat[c] || { correct: 0, total: 0 }; byCat[c].total += 1; if (r.correct) byCat[c].correct += 1; });
  const strengths = Object.entries(byCat).filter(([, v]) => pct(v.correct, v.total) >= 70).map(([k]) => catLabel(k));
  const weaknesses = Object.entries(byCat).filter(([, v]) => pct(v.correct, v.total) < 70).map(([k]) => catLabel(k));
  mount(`
    <div class="eyebrow">${s.exam ? "Prüfungsergebnis" : "Quiz-Ergebnis"}</div>
    <h1 class="page-title">${p}% richtig</h1>
    <p class="subtitle">${s.correct} von ${total} Fragen richtig beantwortet (${s.wrong} falsch).</p>
    <div class="grid stats">
      <div class="card"><div class="stat-label">Punktzahl</div><div class="stat-value">${s.correct}/${total}</div></div>
      <div class="card"><div class="stat-label">Prozent</div><div class="stat-value">${p}%</div></div>
      <div class="card"><div class="stat-label">Stärken</div><div class="stat-value" style="font-size:16px">${strengths.length ? esc(strengths.join(", ")) : "–"}</div></div>
      <div class="card"><div class="stat-label">Schwächen</div><div class="stat-value" style="font-size:16px">${weaknesses.length ? esc(weaknesses.join(", ")) : "–"}</div></div>
    </div>
    ${s.exam ? renderExamReview(s) : ""}
    <div class="section-header"><h2>Wie weiter?</h2></div>
    <div class="grid action-grid">
      <button class="card action-card" id="retry"><div class="action-icon">↻</div><strong>Nochmal üben</strong><span>Gleiche Auswahl erneut starten.</span></button>
      <button class="card action-card" id="toWeak"><div class="action-icon">⚠</div><strong>Schwächen üben</strong><span>Nur falsch beantwortete Fragen wiederholen.</span></button>
      <button class="card action-card" id="toSetup"><div class="action-icon">✓</div><strong>Neues Quiz</strong><span>Andere Einstellungen wählen.</span></button>
      <button class="card action-card" id="toProgress"><div class="action-icon">◔</div><strong>Fortschritt ansehen</strong><span>Trefferquote je Kategorie.</span></button>
    </div>
  `);
  document.getElementById("retry").addEventListener("click", () => go("quiz", { ...s, index: 0, correct: 0, wrong: 0, results: [], queue: shuffle(s.queue) }));
  document.getElementById("toWeak").addEventListener("click", () => go("weak"));
  document.getElementById("toSetup").addEventListener("click", () => go("quizsetup"));
  document.getElementById("toProgress").addEventListener("click", () => go("progress"));
}
function renderExamReview(s) {
  return `
    <div class="section-header"><h2>Antwortübersicht</h2></div>
    <div class="grid" style="gap:10px">
      ${s.results.map((r) => `
        <div class="card" style="padding:14px 18px">
          <div style="font-weight:700">${r.correct ? "✓" : "✗"} ${esc(r.q.q)}</div>
          <div style="font-size:13px;color:var(--muted);margin-top:6px">Richtige Antwort: ${esc(r.q.opts[r.q.a])}${!r.correct ? ` · Deine Antwort: ${esc(r.q.opts[r.chosenIdx])}` : ""}</div>
          <div style="font-size:13px;margin-top:6px">${esc(r.q.exp)}</div>
        </div>`).join("")}
    </div>`;
}

// ---------- Schwächen ----------
function renderWeak() {
  const weak = getWeakQuestions();
  const wrongOnly = getWrongQuestions();
  mount(`
    <div class="eyebrow">Meine Schwächen</div>
    <h1 class="page-title">Gezielt wiederholen</h1>
    <p class="subtitle">Hier werden Fragen angezeigt, die du häufig falsch beantwortet hast, sowie alle zuletzt falsch beantworteten Fragen.</p>
    <div class="grid two-col">
      <div class="card">
        <div class="stat-label">Schwächen-Fragen</div>
        <div class="stat-value">${weak.length}</div>
        <p class="subtitle" style="margin:8px 0 16px">Fragen, bei denen du bisher öfter falsch als richtig geantwortet hast.</p>
        <button class="primary" id="startWeak" ${weak.length ? "" : "disabled"}>Schwächen-Quiz starten</button>
      </div>
      <div class="card">
        <div class="stat-label">Zuletzt falsch beantwortet</div>
        <div class="stat-value">${wrongOnly.length}</div>
        <p class="subtitle" style="margin:8px 0 16px">Alle Fragen, deren letzte Antwort falsch war.</p>
        <button class="secondary" id="startWrong" ${wrongOnly.length ? "" : "disabled"}>Falsch beantwortete Fragen üben</button>
      </div>
    </div>
  `);
  if (weak.length) document.getElementById("startWeak").addEventListener("click", () => go("quiz", { queue: weak, index: 0, correct: 0, wrong: 0, results: [], exam: false }));
  if (wrongOnly.length) document.getElementById("startWrong").addEventListener("click", () => go("quiz", { queue: shuffle(wrongOnly), index: 0, correct: 0, wrong: 0, results: [], exam: false }));
}

// ---------- Fortschritt ----------
function renderProgress() {
  const os = getOverallStats();
  const catStats = computeCategoryStats();
  const topicStats = computeTopicStats();
  mount(`
    <div class="eyebrow">Fortschritt</div>
    <h1 class="page-title">Dein Lernfortschritt</h1>
    <p class="subtitle">${os.answered} von ${os.total} Fragen bearbeitet · ${os.pct}% zuletzt richtig.</p>
    <div class="section-header"><h2>Nach Kategorie</h2></div>
    <div class="card">
      ${CATEGORIES.map((c) => { const s = catStats[c.id]; return `<div class="progress-row"><div class="progress-label"><span>${esc(c.label)} (${s.answered}/${s.total})</span><span>${pct(s.correct, s.answered)}%</span></div><div class="bar"><i style="width:${pct(s.correct, s.answered)}%"></i></div></div>`; }).join("")}
    </div>
    <div class="section-header"><h2>Nach Thema/Unterthema</h2></div>
    <div class="grid library-grid" id="topicProgress"></div>
  `);
  const holder = document.getElementById("topicProgress");
  topics.forEach((t) => {
    const s = topicStats[t.id];
    holder.appendChild(el(`
      <div class="card structure">
        <button data-id="${t.id}">
          <div class="structure-type">${esc(catLabel(t.cat))} · ${esc(t.sub)}</div>
          <h3>${esc(t.title)}</h3>
          <p>${s.answered}/${s.total} beantwortet</p>
          <div class="bar" style="margin-top:10px"><i style="width:${pct(s.correct, s.answered)}%"></i></div>
        </button>
      </div>`));
  });
  holder.querySelectorAll("button[data-id]").forEach((b) => b.addEventListener("click", () => go("learn-topic", { id: b.dataset.id })));
}

render();
