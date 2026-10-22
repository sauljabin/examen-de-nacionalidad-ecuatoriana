"use strict";

// Static practice exam. Questions come from data/cards.json.

const REPO_URL = "https://github.com/sauljabin/examen-de-nacionalidad-ecuatoriana";
const DEFAULT_SETTINGS = { fontSize: "m", theme: "auto", spacing: "normal", contrast: "", motion: "" };

const app = document.getElementById("app");
const root = document.documentElement;

const state = {
  categories: [],
  selected: new Set(), // "<categoryId>/<subcategoryId>"
  queue: [],
  index: 0,
  missed: [],
  revealed: false,
  cardsById: new Map(),
  cardsByCode: new Map(),
  // Where "Salir" and the result screen go back to.
  exit: { back: showHome, label: "Volver al inicio" },
  print: { cards: [], title: "" },
};

// Helpers --------------------------------------------------------------------

function cloneTemplate(id) {
  return document.getElementById(id).content.cloneNode(true);
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function plainText(segments) {
  return (segments || []).map((segment) => segment.text).join("");
}

function issueUrl(template, fields = {}) {
  const params = new URLSearchParams({ template, ...fields });
  return `${REPO_URL}/issues/new?${params}`;
}

function storage(action, value) {
  try {
    if (action === "read") return JSON.parse(localStorage.getItem("settings") || "{}");
    localStorage.setItem("settings", JSON.stringify(value));
  } catch {
    return {};
  }
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

function askConfirm({ title, text, ok, cancel = "Cancelar" }) {
  const dialog = document.getElementById("confirm-dialog");
  dialog.querySelector("h2").textContent = title;
  dialog.querySelector(".confirm-text").textContent = text;
  dialog.querySelector(".confirm-ok").textContent = ok;
  dialog.querySelector(".confirm-cancel").textContent = cancel;
  dialog.returnValue = "";
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "ok"), { once: true });
  });
}

// Saved lists ----------------------------------------------------------------

// Kept only in this browser, by card id: questions answered wrong (missed),
// questions the person marked (marked), saved exams (exams) and the exam
// being built (draft).
const progress = readProgress();

function readProgress() {
  const empty = { missed: [], marked: [], exams: [], draft: { title: "", ids: [] } };
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem("progress") || "{}") };
  } catch {
    return empty;
  }
}

function saveProgress() {
  try {
    localStorage.setItem("progress", JSON.stringify(progress));
  } catch {}
}

function setInList(list, id, on) {
  const at = list.indexOf(id);
  if (on && at === -1) list.push(id);
  else if (!on && at !== -1) list.splice(at, 1);
  else return;
  saveProgress();
}

// Questions removed from cards.json after they were saved are skipped.
function cardsFromIds(ids) {
  return ids.map((id) => state.cardsById.get(id)).filter(Boolean);
}

function sameIds(a, b) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function findSavedExam(ids) {
  return progress.exams.find((exam) => sameIds(exam.ids, ids));
}

// Updates the exam with this id, or the one with the same questions, or adds a new one.
function saveExam({ id, title, ids }) {
  let exam = progress.exams.find((item) => item.id === id) || findSavedExam(ids);
  if (!exam) {
    exam = { id: Date.now().toString(36) };
    progress.exams.unshift(exam);
  }
  exam.title = title || exam.title || `Examen ${progress.exams.length}`;
  exam.ids = [...ids];
  saveProgress();
  return exam;
}

function openSavedExam(exam) {
  showShared({ cards: cardsFromIds(exam.ids), title: exam.title });
}

const BOOKMARK_ICON = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>';

function markButton(card) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost mark";
  button.innerHTML = `${BOOKMARK_ICON}<span></span>`;
  const sync = () => {
    const marked = progress.marked.includes(card.id);
    button.setAttribute("aria-pressed", String(marked));
    button.querySelector("span").textContent = marked ? "Marcada" : "Marcar";
  };
  button.addEventListener("click", () => {
    setInList(progress.marked, card.id, !progress.marked.includes(card.id));
    sync();
  });
  sync();
  return button;
}

// Accessibility settings -----------------------------------------------------

function currentSettings() {
  return { ...DEFAULT_SETTINGS, ...storage("read") };
}

function applySettings(settings) {
  for (const [key, value] of Object.entries(settings)) {
    if (value && value !== DEFAULT_SETTINGS[key]) root.dataset[key] = value;
    else delete root.dataset[key];
  }
  const changed = Object.fromEntries(
    Object.entries(settings).filter(([key, value]) => value !== DEFAULT_SETTINGS[key]),
  );
  storage("write", changed);
}

function syncSettingsForm(settings) {
  const form = document.querySelector("#settings form");
  for (const input of form.querySelectorAll("input[type=radio]")) {
    input.checked = settings[input.name] === input.value;
  }
  for (const input of form.querySelectorAll("input[type=checkbox]")) {
    input.checked = settings[input.dataset.setting] === input.value;
  }
}

function setupSettings() {
  const dialog = document.getElementById("settings");
  const form = dialog.querySelector("form");
  document.getElementById("open-settings").addEventListener("click", () => {
    syncSettingsForm(currentSettings());
    dialog.showModal();
  });
  form.addEventListener("change", (event) => {
    const input = event.target;
    const settings = currentSettings();
    if (input.type === "radio") settings[input.name] = input.value;
    else settings[input.dataset.setting] = input.checked ? input.value : "";
    applySettings(settings);
  });
  document.getElementById("reset-settings").addEventListener("click", () => {
    applySettings(DEFAULT_SETTINGS);
    syncSettingsForm(DEFAULT_SETTINGS);
  });
}

// Rich text ------------------------------------------------------------------

function renderSegments(segments, { revealCloze }) {
  const fragment = document.createDocumentFragment();
  for (const segment of segments || []) {
    let node;
    if (segment.cloze) {
      node = document.createElement("mark");
      node.className = revealCloze ? "cloze revealed" : "cloze";
      node.textContent = revealCloze ? segment.text : "?";
      if (!revealCloze) node.setAttribute("aria-label", "texto oculto");
    } else if (segment.bold || segment.color) {
      node = document.createElement(segment.bold ? "strong" : "span");
      node.textContent = segment.text;
    } else {
      node = document.createTextNode(segment.text);
    }
    if (segment.color && node.nodeType === Node.ELEMENT_NODE) {
      node.classList.add(`color-${segment.color}`);
    }
    fragment.append(node);
  }
  return fragment;
}

function renderImage(image, { revealed }) {
  const figure = document.createElement("figure");
  figure.className = "occlusion";
  if (image.width && image.height) {
    figure.style.aspectRatio = `${image.width} / ${image.height}`;
  }
  const img = document.createElement("img");
  img.src = image.src;
  img.alt = revealed
    ? "Imagen con la respuesta visible"
    : "Imagen con una parte tapada: ¿qué hay debajo del recuadro marcado?";
  figure.append(img);
  for (const block of image.blocks) {
    if (revealed && block.active) continue;
    const mask = document.createElement("div");
    mask.className = block.active ? "mask active" : "mask";
    mask.setAttribute("aria-hidden", "true");
    Object.assign(mask.style, {
      left: `${block.x * 100}%`,
      top: `${block.y * 100}%`,
      width: `${block.width * 100}%`,
      height: `${block.height * 100}%`,
    });
    if (block.active) {
      const mark = document.createElement("span");
      mark.textContent = "?";
      mask.append(mark);
    }
    figure.append(mask);
  }
  return figure;
}

function renderPhoto(photo) {
  const figure = document.createElement("figure");
  figure.className = "photo";
  const img = document.createElement("img");
  img.src = photo.src;
  img.alt = photo.alt;
  const caption = document.createElement("figcaption");
  const source = document.createElement("a");
  source.href = photo.url;
  source.target = "_blank";
  source.rel = "noopener";
  source.textContent = "Wikimedia Commons";
  caption.append(`${photo.alt}. Foto: ${photo.credit} · ${photo.license} · `, source);
  figure.append(img, caption);
  return figure;
}

// Search ---------------------------------------------------------------------

const SEARCH_LIMIT = 50;

// Lowercase without accents, so "ecuador" matches "Ecuador" and "region" matches "región".
function normalize(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function searchableText(card) {
  return normalize([
    plainText(card.front),
    plainText(card.back),
    // Only the right options: wrong ones would make unrelated questions match.
    card.type === "choice" ? correctAnswerText(card) : "",
    card.explanation || "",
    card.subcategory,
    card.topic || "",
  ].join(" "));
}

// "action" is the button shown next to the topic: mark, add or remove.
function renderSearchResult(card, action) {
  const item = document.createElement("li");
  const head = document.createElement("div");
  head.className = "result-head";
  const crumbs = document.createElement("p");
  crumbs.className = "result-crumbs";
  crumbs.textContent = [card.category, card.subcategory, card.topic].filter(Boolean).join(" › ");
  head.append(crumbs, action);
  item.append(head);
  if (card.front?.length) {
    const question = document.createElement("p");
    question.className = "result-question";
    question.append(renderSegments(card.front, { revealCloze: true }));
    item.append(question);
  }
  if (card.image) item.append(renderImage(card.image, { revealed: true }));
  if (card.type === "basic" || card.type === "choice") {
    const answer = document.createElement("p");
    answer.className = "result-answer";
    if (card.type === "choice") answer.textContent = correctAnswerText(card);
    else answer.append(renderSegments(card.back, { revealCloze: true }));
    item.append(answer);
  }
  if (card.explanation) item.append(renderExplanation(card.explanation));
  return item;
}

// Shows the matches inside "container", which holds .search-status and .search-results.
function runSearch(container, query, renderItem) {
  const status = container.querySelector(".search-status");
  const list = container.querySelector(".search-results");
  const words = normalize(query).split(/\s+/).filter(Boolean);
  list.replaceChildren();
  if (!words.length || words.join("").length < 2) {
    status.textContent = "";
    return;
  }
  const matches = state.allCards.filter((card) => {
    const text = searchableText(card);
    return words.every((word) => text.includes(word));
  });
  if (!matches.length) {
    status.textContent = "No hay preguntas con esas palabras.";
  } else if (matches.length > SEARCH_LIMIT) {
    status.textContent = `${matches.length} preguntas encontradas. Se muestran las primeras ${SEARCH_LIMIT}; escribe más palabras para afinar la búsqueda.`;
  } else {
    status.textContent = `${matches.length} ${matches.length === 1 ? "pregunta encontrada" : "preguntas encontradas"}.`;
  }
  list.append(...matches.slice(0, SEARCH_LIMIT).map(renderItem));
}

function cardSummary(card) {
  const text = plainText(card.front).replace(/\s+/g, " ").trim();
  return card.type === "image" ? `${text} (imagen de ${card.subcategory})` : text;
}

// Home -----------------------------------------------------------------------

function subcategoryKey(category, subcategory) {
  return `${category.id}/${subcategory.id}`;
}

function selectedCards() {
  return state.categories.flatMap((category) =>
    category.subcategories
      .filter((sub) => state.selected.has(subcategoryKey(category, sub)))
      .flatMap((sub) => sub.cards),
  );
}

function showHome() {
  // Leaving a shared exam: drop its link from the address bar.
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  app.replaceChildren(cloneTemplate("home-template"));
  setupInstall();
  setupPractice();
  let searchTimer;
  app.querySelector("#search").addEventListener("input", (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(
      app.querySelector(".search"),
      event.target.value,
      (card) => renderSearchResult(card, markButton(card)),
    ), 150);
  });
}

// Practice by topics ---------------------------------------------------------

function showTopics() {
  app.replaceChildren(cloneTemplate("topics-template"));
  app.querySelector(".back-home").addEventListener("click", showHome);
  app.querySelector("#question-count").value = state.topicCount || "20";
  app.querySelector("#shuffle").checked = state.topicShuffle ?? true;
  const list = app.querySelector("#categories");
  state.categories.forEach((category, position) => {
    const node = cloneTemplate("category-template");
    const article = node.querySelector(".category");
    const total = category.subcategories.reduce((sum, sub) => sum + sub.cards.length, 0);
    article.dataset.category = category.id;
    node.querySelector(".index").textContent = String(position + 1).padStart(2, "0");
    node.querySelector(".name").textContent = category.title;
    node.querySelector(".count").textContent = `${total} preguntas`;
    const chips = node.querySelector(".chips");
    for (const sub of category.subcategories) {
      const chip = document.createElement("label");
      chip.className = "chip";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = subcategoryKey(category, sub);
      input.checked = state.selected.has(input.value);
      const title = document.createElement("span");
      title.textContent = sub.title;
      const count = document.createElement("small");
      count.textContent = sub.cards.length;
      chip.append(input, title, count);
      chips.append(chip);
    }
    list.append(node);
  });

  list.addEventListener("change", (event) => {
    const input = event.target;
    const article = input.closest(".category");
    if (input.classList.contains("category-check")) {
      for (const chip of article.querySelectorAll(".chip input")) {
        chip.checked = input.checked;
        toggleSelection(chip.value, input.checked);
      }
    } else {
      toggleSelection(input.value, input.checked);
    }
    updateTopics();
  });
  for (const button of app.querySelectorAll("[data-select]")) {
    button.addEventListener("click", () => {
      const all = button.dataset.select === "all";
      for (const chip of list.querySelectorAll(".chip input")) {
        chip.checked = all;
        toggleSelection(chip.value, all);
      }
      updateTopics();
    });
  }
  app.querySelector("#print").addEventListener("click", () => openPrintDialog(selectedCards()));
  app.querySelector("#shuffle").addEventListener("change", (event) => {
    state.topicShuffle = event.target.checked;
  });
  app.querySelector("#start").addEventListener("click", () => {
    const cards = selectedCards();
    if (!cards.length) return;
    const ordered = app.querySelector("#shuffle").checked ? shuffle(cards) : cards;
    const count = app.querySelector("#question-count").value;
    startExam(count === "all" ? ordered : ordered.slice(0, Number(count)), {
      exit: { back: showTopics, label: "Volver a los temas" },
    });
  });
  updateTopics();
  app.focus();
}

function toggleSelection(key, on) {
  if (on) state.selected.add(key);
  else state.selected.delete(key);
}

function updateTopics() {
  for (const article of app.querySelectorAll(".category")) {
    const chips = [...article.querySelectorAll(".chip input")];
    const checked = chips.filter((chip) => chip.checked).length;
    const box = article.querySelector(".category-check");
    box.checked = checked === chips.length;
    box.indeterminate = checked > 0 && checked < chips.length;
    article.classList.toggle("is-selected", checked > 0);
  }
  const available = selectedCards().length;
  const count = app.querySelector("#question-count").value;
  const total = count === "all" ? available : Math.min(available, Number(count));
  const start = app.querySelector("#start");
  start.disabled = available === 0;
  app.querySelector("#print").disabled = available === 0;
  start.textContent = available
    ? `Comenzar · ${total} ${total === 1 ? "pregunta" : "preguntas"}`
    : "Elige al menos un tema";
  app.querySelector("#question-count").onchange = (event) => {
    state.topicCount = event.target.value;
    updateTopics();
  };
}

// Practice modes -------------------------------------------------------------

// The real exam has 30 questions and is passed with 90 % (27 right answers),
// per article 67 of the Reglamento a la Ley Orgánica de Movilidad Humana.
const MOCK_SIZE = 30;
const MOCK_PASS = 27;

// Random questions spread evenly over the categories, with at most one card
// per text: cloze cards made from the same text show each other's answers.
function mockExam() {
  const used = new Set();
  const pools = state.categories.map((category) =>
    shuffle(category.subcategories.flatMap((sub) => sub.cards)));
  const picked = [];
  while (picked.length < MOCK_SIZE && pools.some((pool) => pool.length)) {
    for (const pool of pools) {
      while (pool.length) {
        const card = pool.pop();
        const key = card.type === "cloze" ? card.id.split(".")[0] : card.id;
        if (used.has(key)) continue;
        used.add(key);
        picked.push(card);
        break;
      }
      if (picked.length === MOCK_SIZE) break;
    }
  }
  return shuffle(picked);
}

function setupPractice() {
  app.querySelector("#start-mock").addEventListener("click", () => {
    startExam(mockExam(), { passMark: MOCK_PASS });
  });
  app.querySelector("#start-missed").addEventListener("click", () => {
    startExam(shuffle(cardsFromIds(progress.missed)));
  });
  app.querySelector("#start-marked").addEventListener("click", () => {
    startExam(shuffle(cardsFromIds(progress.marked)));
  });
  app.querySelector("#clear-missed").addEventListener("click", async () => {
    if (await askConfirm({
      title: "¿Vaciar las falladas?",
      text: "Se borrará la lista de preguntas que respondiste mal en este dispositivo.",
      ok: "Vaciar",
    })) {
      progress.missed.length = 0;
      saveProgress();
      updatePractice();
    }
  });
  app.querySelector("#clear-marked").addEventListener("click", async () => {
    if (await askConfirm({
      title: "¿Quitar todas las marcas?",
      text: "Se borrará la lista de preguntas que marcaste en este dispositivo.",
      ok: "Quitar marcas",
    })) {
      progress.marked.length = 0;
      saveProgress();
      updatePractice();
    }
  });
  app.querySelector("#open-topics").addEventListener("click", showTopics);
  app.querySelector("#open-builder").addEventListener("click", showBuilder);
  updatePractice();
}

function renderSavedExam(exam) {
  const cards = cardsFromIds(exam.ids);
  const item = document.createElement("li");
  const info = document.createElement("div");
  info.className = "exam-info";
  const title = document.createElement("strong");
  title.textContent = exam.title;
  const meta = document.createElement("small");
  const categories = [...new Set(cards.map((card) => card.category))];
  meta.textContent = `${plural(cards.length, "pregunta", "preguntas")} · ${joinList(categories)}`;
  info.append(title, meta);
  const start = document.createElement("button");
  start.type = "button";
  start.className = "primary";
  start.textContent = "Empezar";
  start.addEventListener("click", () => startExam(cards));
  const open = document.createElement("button");
  open.type = "button";
  open.className = "ghost";
  open.textContent = "Compartir";
  open.setAttribute("aria-label", `Compartir, imprimir o editar «${exam.title}»`);
  open.addEventListener("click", () => openSavedExam(exam));
  item.append(info, start, open);
  return item;
}

function updatePractice() {
  const missed = cardsFromIds(progress.missed).length;
  const marked = cardsFromIds(progress.marked).length;
  const draft = cardsFromIds(progress.draft.ids).length;
  const exams = progress.exams.filter((exam) => cardsFromIds(exam.ids).length);
  app.querySelector(".missed-summary").textContent = missed
    ? `${plural(missed, "pregunta que respondiste mal", "preguntas que respondiste mal")}. Cuando aciertes una, sale de la lista.`
    : "Aquí se guardan las preguntas que respondes mal, para repasarlas después.";
  app.querySelector(".marked-summary").textContent = marked
    ? `${plural(marked, "pregunta marcada", "preguntas marcadas")} para repasar.`
    : "Durante un examen o en el buscador, toca «Marcar» para guardar una pregunta aquí.";
  app.querySelector("#start-missed").disabled = !missed;
  app.querySelector("#start-marked").disabled = !marked;
  app.querySelector("#clear-missed").hidden = !missed;
  app.querySelector("#clear-marked").hidden = !marked;
  app.querySelector("#open-builder").textContent = draft ? `Seguir creando (${draft})` : "Crear examen";
  app.querySelector(".exams-empty").hidden = exams.length > 0;
  app.querySelector(".exam-list").replaceChildren(...exams.map(renderSavedExam));
}

// Exam -----------------------------------------------------------------------

function startExam(cards, { passMark, exit } = {}) {
  state.queue = cards;
  state.index = 0;
  state.missed = [];
  state.passMark = passMark;
  state.exit = exit || { back: showHome, label: "Volver al inicio" };
  state.startedAt = Date.now();
  showCard();
}

function showCard() {
  const card = state.queue[state.index];
  const total = state.queue.length;
  state.revealed = false;
  app.replaceChildren(cloneTemplate("card-template"));
  const counter = app.querySelector(".counter");
  counter.textContent = `${state.index + 1} / ${total}`;
  counter.setAttribute("aria-label", `Pregunta ${state.index + 1} de ${total}`);
  app.querySelector(".meter > div").style.width = `${(state.index / total) * 100}%`;
  app.querySelector(".crumbs").textContent =
    [card.category, card.subcategory, card.topic].filter(Boolean).join(" › ");
  app.querySelector(".exam-bar").append(markButton(card));
  renderCardFace(card);
  // Start loading the answer photo now so it shows up right away on reveal.
  if (card.photo) new Image().src = card.photo.src;
  app.querySelector(".report").href = issueUrl("error.yml", {
    title: `[Error] ${cardSummary(card).slice(0, 70)}`,
    pregunta: `${cardSummary(card)}\n\nID: ${card.id}`,
  });
  app.querySelector(".exit").addEventListener("click", confirmExit);
  // Tapping the card also shows the answer, which is handy on phones.
  app.querySelector(".question").addEventListener("click", (event) => {
    if (card.type !== "choice" && !event.target.closest("a")) reveal();
  });
  app.querySelector(".reveal").addEventListener("click", reveal);
  app.querySelector(".next").addEventListener("click", () => grade(state.choiceResult));
  app.querySelector(".check-answer").addEventListener("click", checkSelection);
  if (card.type === "choice") {
    app.querySelector(".reveal").hidden = true;
    app.querySelector(".check-answer").hidden = !isMultiChoice(card);
    app.querySelector(".options button")?.focus();
    return;
  }
  app.querySelector(".right").addEventListener("click", () => grade(true));
  app.querySelector(".wrong").addEventListener("click", () => grade(false));
  app.querySelector(".reveal").focus();
}

function renderCardFace(card) {
  const front = app.querySelector(".front");
  const revealed = state.revealed;
  front.replaceChildren();
  if (card.front?.length) {
    const text = document.createElement("p");
    text.append(renderSegments(card.front, { revealCloze: revealed }));
    front.append(text);
  }
  if (card.image) front.append(renderImage(card.image, { revealed }));
  if (card.type === "choice") front.append(renderOptions(card));
  if (card.type === "cloze" && revealed && card.photo) front.append(renderPhoto(card.photo));
  if (card.type === "basic" && revealed) {
    app.querySelector(".back").replaceChildren(renderSegments(card.back, { revealCloze: true }));
    if (card.photo) app.querySelector(".back").after(renderPhoto(card.photo));
    app.querySelector(".answer").hidden = false;
  }
}

// A choice card has one right answer ("answer": 2) or several ("answer": [0, 2]).
function isMultiChoice(card) {
  return Array.isArray(card.answer);
}

function correctOptions(card) {
  return isMultiChoice(card) ? card.answer : [card.answer];
}

function joinList(items) {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} y ${items.at(-1)}` : items[0];
}

function correctAnswerText(card) {
  return joinList(correctOptions(card).map((index) => card.options[index]));
}

function renderOptions(card) {
  const fragment = document.createDocumentFragment();
  if (isMultiChoice(card)) {
    const hint = document.createElement("p");
    hint.className = "choice-hint";
    hint.textContent = "Selecciona todas las respuestas correctas.";
    fragment.append(hint);
  }
  const list = document.createElement("ol");
  list.className = "options";
  // Keep the shuffled order for this card while it is on screen.
  state.optionOrder = shuffle(card.options.map((_, index) => index));
  state.selection = new Set();
  state.optionOrder.forEach((optionIndex, position) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.option = optionIndex;
    if (isMultiChoice(card)) button.setAttribute("aria-pressed", "false");
    const key = document.createElement("kbd");
    key.textContent = position + 1;
    button.append(key, card.options[optionIndex]);
    button.addEventListener("click", () => choose(optionIndex));
    item.append(button);
    list.append(item);
  });
  fragment.append(list);
  return fragment;
}

function choose(optionIndex) {
  if (state.revealed) return;
  const card = state.queue[state.index];
  if (!isMultiChoice(card)) {
    finishChoice(new Set([optionIndex]));
    return;
  }
  // Multiple answers: toggle the option and wait for "Comprobar".
  if (state.selection.has(optionIndex)) state.selection.delete(optionIndex);
  else state.selection.add(optionIndex);
  const button = app.querySelector(`.options button[data-option="${optionIndex}"]`);
  button.classList.toggle("is-selected", state.selection.has(optionIndex));
  button.setAttribute("aria-pressed", String(state.selection.has(optionIndex)));
}

function checkSelection() {
  if (state.revealed || !state.selection?.size) return;
  finishChoice(state.selection);
}

function finishChoice(selected) {
  state.revealed = true;
  const card = state.queue[state.index];
  const correct = new Set(correctOptions(card));
  state.choiceResult = selected.size === correct.size && [...selected].every((index) => correct.has(index));
  for (const button of app.querySelectorAll(".options button")) {
    const index = Number(button.dataset.option);
    button.disabled = true;
    button.classList.remove("is-selected");
    if (correct.has(index)) {
      button.classList.add("is-correct");
      if (!selected.has(index)) button.classList.add("is-missed");
    } else if (selected.has(index)) {
      button.classList.add("is-wrong");
    }
  }
  const feedback = document.createElement("p");
  feedback.className = state.choiceResult ? "feedback is-right" : "feedback is-wrong";
  const label = correct.size > 1 ? "Las respuestas correctas son" : "La respuesta es";
  feedback.textContent = state.choiceResult
    ? "¡Correcto!"
    : `Incorrecto. ${label}: ${correctAnswerText(card)}.`;
  app.querySelector(".options").after(feedback);
  let last = feedback;
  if (card.explanation) {
    last = renderExplanation(card.explanation);
    feedback.after(last);
  }
  if (card.photo) last.after(renderPhoto(card.photo));
  app.querySelector(".check-answer").hidden = true;
  app.querySelector(".question").classList.add("is-revealed");
  app.querySelector(".next").hidden = false;
  app.querySelector(".next").focus();
}

function renderExplanation(text) {
  const explanation = document.createElement("p");
  explanation.className = "explanation";
  explanation.textContent = text;
  return explanation;
}

function reveal() {
  if (state.revealed || state.queue[state.index].type === "choice") return;
  state.revealed = true;
  const card = state.queue[state.index];
  if (card.type === "image") {
    // Remove only the mask so the image is not reloaded.
    app.querySelector(".mask.active")?.remove();
    app.querySelector(".occlusion img").alt = "Imagen con la respuesta visible";
  } else {
    renderCardFace(card);
  }
  app.querySelector(".question").classList.add("is-revealed");
  app.querySelector(".reveal").hidden = true;
  app.querySelector(".grade").hidden = false;
  app.querySelector(".right").focus();
}

function grade(knewIt) {
  if (!state.revealed || knewIt === undefined) return;
  state.choiceResult = undefined;
  const card = state.queue[state.index];
  card.lastResult = knewIt;
  if (!knewIt) state.missed.push(card);
  setInList(progress.missed, card.id, !knewIt);
  state.index += 1;
  if (state.index < state.queue.length) showCard();
  else showResult();
}

async function confirmExit() {
  if (await askConfirm({
    title: "¿Salir del examen?",
    text: "Se perderá el resultado de este intento. Las preguntas que ya fallaste quedan guardadas en «Falladas».",
    ok: "Salir",
    cancel: "Seguir respondiendo",
  })) state.exit.back();
}

// Result ---------------------------------------------------------------------

function durationText(ms) {
  const minutes = Math.round(ms / 60000);
  return minutes < 1 ? "en menos de un minuto" : `en ${plural(minutes, "minuto", "minutos")}`;
}

function showResult() {
  const total = state.queue.length;
  const right = total - state.missed.length;
  app.replaceChildren(cloneTemplate("result-template"));
  app.querySelector(".score").textContent = `${Math.round((right / total) * 100)}%`;
  app.querySelector(".summary").textContent =
    `Acertaste ${right} de ${total} preguntas ${durationText(Date.now() - state.startedAt)}.`;
  const verdict = app.querySelector(".verdict");
  if (state.passMark) {
    const passed = right >= state.passMark;
    verdict.hidden = false;
    verdict.classList.add(passed ? "is-right" : "is-wrong");
    verdict.textContent = passed
      ? `¡Aprobado! Se necesitan ${state.passMark} aciertos.`
      : `No aprobado: se necesitan ${state.passMark} aciertos y te ${state.passMark - right === 1 ? "faltó" : "faltaron"} ${state.passMark - right}.`;
  }

  const byCategory = new Map();
  for (const card of state.queue) {
    const entry = byCategory.get(card.category) || { right: 0, total: 0 };
    entry.total += 1;
    if (card.lastResult) entry.right += 1;
    byCategory.set(card.category, entry);
  }
  const breakdown = app.querySelector(".breakdown");
  for (const [category, entry] of byCategory) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = category;
    const value = document.createElement("strong");
    value.textContent = `${entry.right}/${entry.total}`;
    const bar = document.createElement("i");
    bar.style.setProperty("--ratio", entry.right / entry.total);
    item.append(name, bar, value);
    breakdown.append(item);
  }

  const missed = state.missed;
  const retry = app.querySelector(".retry-missed");
  if (missed.length) {
    retry.addEventListener("click", () => startExam(shuffle(missed), { exit: state.exit }));
  } else {
    retry.remove();
    app.querySelector(".missed-title").remove();
  }
  // Offer to keep this exam in "Mis exámenes", unless it is already there.
  const ids = state.queue.map((card) => card.id);
  const saveForm = app.querySelector(".save-exam");
  const saveDone = app.querySelector(".save-done");
  saveForm.hidden = Boolean(findSavedExam(ids));
  saveForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const exam = saveExam({ title: saveForm.querySelector(".save-title").value.trim(), ids });
    saveForm.hidden = true;
    saveDone.hidden = false;
    saveDone.querySelector(".open-saved").addEventListener("click", () => openSavedExam(exam));
  });
  const restart = app.querySelector(".restart");
  restart.textContent = state.exit.label;
  restart.addEventListener("click", state.exit.back);

  const list = app.querySelector(".missed");
  for (const card of missed) {
    const item = document.createElement("li");
    if (card.front?.length) {
      const question = document.createElement("p");
      question.append(renderSegments(card.front, { revealCloze: true }));
      item.append(question);
    }
    if (card.image) item.append(renderImage(card.image, { revealed: true }));
    if (card.type === "basic" || card.type === "choice") {
      const answer = document.createElement("p");
      answer.className = "missed-answer";
      if (card.type === "choice") answer.textContent = correctAnswerText(card);
      else answer.append(renderSegments(card.back, { revealCloze: true }));
      item.append(answer);
    }
    if (card.explanation) item.append(renderExplanation(card.explanation));
    if (card.photo) item.append(renderPhoto(card.photo));
    list.append(item);
  }
  app.focus();
}

// Exam builder ---------------------------------------------------------------

function addButton(card) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost add";
  button.sync = () => {
    const added = progress.draft.ids.includes(card.id);
    button.setAttribute("aria-pressed", String(added));
    button.textContent = added ? "✓ Agregada" : "+ Agregar";
  };
  button.addEventListener("click", () => {
    setInList(progress.draft.ids, card.id, !progress.draft.ids.includes(card.id));
    renderDraft();
  });
  button.sync();
  return button;
}

function removeButton(card) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost";
  button.textContent = "Quitar";
  button.addEventListener("click", () => {
    setInList(progress.draft.ids, card.id, false);
    renderDraft();
  });
  return button;
}

function showBuilder() {
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  app.replaceChildren(cloneTemplate("builder-template"));
  const title = app.querySelector("#exam-title");
  title.value = progress.draft.title;
  title.addEventListener("input", () => {
    progress.draft.title = title.value;
    saveProgress();
  });
  app.querySelector(".back-home").addEventListener("click", showHome);
  app.querySelector(".marked-tab").textContent = `Marcadas (${cardsFromIds(progress.marked).length})`;
  app.querySelector(".missed-tab").textContent = `Falladas (${cardsFromIds(progress.missed).length})`;
  app.querySelector(".source-tabs").addEventListener("change", renderBuilderSource);
  let searchTimer;
  app.querySelector("#builder-search").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderBuilderSource, 150);
  });
  app.querySelector(".add-all").addEventListener("click", () => {
    for (const card of cardsFromIds(progress[builderSource()])) setInList(progress.draft.ids, card.id, true);
    renderDraft();
  });
  app.querySelector(".clear-draft").addEventListener("click", async () => {
    if (await askConfirm({
      title: "¿Vaciar el examen?",
      text: "Se quitarán todas las preguntas que elegiste.",
      ok: "Vaciar",
    })) {
      progress.draft = { title: "", ids: [] };
      saveProgress();
      title.value = "";
      renderDraft();
    }
  });
  app.querySelector("#builder-done").addEventListener("click", () => {
    const { editing, title: name, ids } = progress.draft;
    const exam = saveExam({ id: editing, title: name.trim(), ids: cardsFromIds(ids).map((card) => card.id) });
    progress.draft = { title: "", ids: [] };
    saveProgress();
    openSavedExam(exam);
  });
  renderBuilderSource();
  renderDraft();
  app.focus();
}

function builderSource() {
  return app.querySelector(".source-tabs input:checked").value;
}

function renderBuilderSource() {
  const source = builderSource();
  const container = app.querySelector(".builder-source");
  const status = container.querySelector(".search-status");
  const list = container.querySelector(".search-results");
  const render = (card) => renderSearchResult(card, addButton(card));
  container.querySelector(".search-box").hidden = source !== "search";
  if (source === "search") {
    container.querySelector(".add-all").hidden = true;
    const query = container.querySelector("#builder-search").value;
    runSearch(container, query, render);
    if (!status.textContent) status.textContent = "Escribe al menos dos letras para buscar preguntas.";
    return;
  }
  const cards = cardsFromIds(progress[source]);
  container.querySelector(".add-all").hidden = !cards.length;
  if (source === "marked") {
    status.textContent = cards.length
      ? `${plural(cards.length, "pregunta marcada", "preguntas marcadas")}.`
      : "No tienes preguntas marcadas. Durante un examen o en el buscador, toca «Marcar» para guardar una.";
  } else {
    status.textContent = cards.length
      ? `${plural(cards.length, "pregunta fallada", "preguntas falladas")}.`
      : "No tienes preguntas falladas.";
  }
  list.replaceChildren(...cards.map(render));
}

function renderDraft() {
  const cards = cardsFromIds(progress.draft.ids);
  app.querySelector(".draft-list").replaceChildren(
    ...cards.map((card) => renderSearchResult(card, removeButton(card))),
  );
  app.querySelector(".draft-empty").hidden = cards.length > 0;
  app.querySelector(".clear-draft").hidden = !cards.length;
  app.querySelector(".builder-count").textContent = plural(cards.length, "pregunta elegida", "preguntas elegidas");
  app.querySelector("#builder-done").disabled = !cards.length;
  for (const button of app.querySelectorAll(".add")) button.sync();
}

// Shared exams ---------------------------------------------------------------

// A shared exam travels inside its link: "#examen=" and a 6-character code per
// question, plus an optional "&titulo=". Nothing is stored on a server, and
// browsers never send the part after "#" to it. The code is an FNV-1a hash of
// the card id, so links keep working when questions are added or reordered.
function shortCode(id) {
  let hash = 0x811c9dc5;
  for (const char of id) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash % 36 ** 6).toString(36).padStart(6, "0");
}

function examLink(cards, title) {
  const params = new URLSearchParams({ examen: cards.map((card) => card.code).join("") });
  if (title) params.set("titulo", title);
  return `${location.origin}${location.pathname}#${params}`;
}

function examFromHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  const codes = params.get("examen");
  if (codes === null) return null;
  const wanted = codes.match(/[0-9a-z]{6}/g) || [];
  const cards = wanted.map((code) => state.cardsByCode.get(code)).filter(Boolean);
  return { cards, title: (params.get("titulo") || "").slice(0, 80), missing: wanted.length - cards.length };
}

function showShared({ cards, title, missing = 0 }) {
  const link = examLink(cards, title);
  history.replaceState(null, "", link);
  app.replaceChildren(cloneTemplate("shared-template"));
  app.querySelector(".shared-title").textContent = title || "Examen personalizado";
  const categories = [...new Set(cards.map((card) => card.category))];
  app.querySelector(".shared-summary").textContent = cards.length
    ? `${plural(cards.length, "pregunta", "preguntas")} de ${joinList(categories)}.`
    : "Este enlace no tiene preguntas.";
  if (missing) {
    const warning = app.querySelector(".shared-warning");
    warning.hidden = false;
    warning.textContent = missing === 1
      ? "Una pregunta del enlace ya no existe en el sitio y se omitió."
      : `${missing} preguntas del enlace ya no existen en el sitio y se omitieron.`;
  }
  const exit = { back: () => showShared({ cards, title }), label: "Volver al examen" };
  const start = app.querySelector(".shared-go");
  start.disabled = !cards.length;
  start.addEventListener("click", () => {
    startExam(app.querySelector("#shared-shuffle").checked ? shuffle(cards) : cards, { exit });
  });

  const input = app.querySelector(".share-link");
  const status = app.querySelector(".share-status");
  input.value = link;
  input.addEventListener("focus", () => input.select());
  app.querySelector(".copy-link").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link);
      status.textContent = "Enlace copiado.";
    } catch {
      input.select();
      status.textContent = "Mantén presionado el enlace para copiarlo.";
    }
  });
  const share = app.querySelector(".share-button");
  share.hidden = !navigator.share;
  share.addEventListener("click", () => {
    navigator.share({ title: title || "Examen de nacionalización ecuatoriana", url: link }).catch(() => {});
  });

  const print = app.querySelector(".print-shared");
  print.disabled = !cards.length;
  print.addEventListener("click", () => openPrintDialog(cards, title));
  app.querySelector(".edit-shared").addEventListener("click", async () => {
    const ids = cards.map((card) => card.id);
    const draft = progress.draft.ids;
    const same = draft.length === ids.length && draft.every((id, index) => id === ids[index]);
    if (draft.length && !same && !(await askConfirm({
      title: "¿Reemplazar tu examen a medias?",
      text: `Ya estabas creando un examen con ${plural(draft.length, "pregunta", "preguntas")}. Si sigues, se reemplaza por este.`,
      ok: "Reemplazar",
    }))) return;
    progress.draft = { title: saved?.title || title, ids, editing: saved?.id };
    saveProgress();
    showBuilder();
  });
  const saved = findSavedExam(cards.map((card) => card.id));
  const save = app.querySelector(".save-shared");
  save.hidden = Boolean(saved);
  save.addEventListener("click", () => openSavedExam(saveExam({ title, ids: cards.map((card) => card.id) })));
  const remove = app.querySelector(".delete-shared");
  remove.hidden = !saved;
  remove.addEventListener("click", async () => {
    if (!(await askConfirm({
      title: "¿Eliminar este examen?",
      text: "Se quitará de «Mis exámenes» en este dispositivo. Los enlaces que ya compartiste siguen funcionando.",
      ok: "Eliminar",
    }))) return;
    progress.exams = progress.exams.filter((exam) => exam !== saved);
    saveProgress();
    showHome();
  });
  app.querySelector(".shared-home").addEventListener("click", showHome);
  app.focus();
}

// Print ----------------------------------------------------------------------

const printArea = document.getElementById("print-area");

// Cloze cards made from the same text (a card per hole, like each line of the
// anthem) would print the same text over and over. With answers, print it once
// with every hole; without answers each card keeps its single blank.
function mergeClozeSiblings(cards) {
  const groups = new Map();
  const merged = [];
  for (const card of cards) {
    if (card.type !== "cloze") {
      merged.push(card);
      continue;
    }
    const base = card.id.split(".")[0];
    if (!groups.has(base)) {
      groups.set(base, []);
      merged.push({ ...card, siblings: groups.get(base) });
    }
    groups.get(base).push(card);
  }
  return merged.map((card) => (card.siblings ? withAllHoles(card.siblings) : card));
}

function withAllHoles(siblings) {
  const holes = new Set(siblings.flatMap((card) => card.front
    .filter((segment) => segment.cloze)
    .map((segment) => segment.text)));
  const front = [];
  for (const segment of siblings[0].front) {
    if (segment.cloze) {
      front.push(segment);
      continue;
    }
    // Split plain text wherever another sibling hides part of it.
    let pieces = [{ ...segment }];
    for (const hole of holes) {
      pieces = pieces.flatMap((piece) => {
        if (piece.cloze || !piece.text.includes(hole)) return [piece];
        return piece.text.split(hole).flatMap((part, index) => (index
          ? [{ ...segment, text: hole, cloze: true }, { ...segment, text: part }]
          : [{ ...segment, text: part }]));
      });
    }
    front.push(...pieces.filter((piece) => piece.text));
  }
  return { ...siblings[0], front };
}

// Image cards only make sense with their picture, so a text-only print skips them.
function printableCards({ answers, images }) {
  const cards = state.print.cards.filter((card) => images || card.type !== "image");
  return answers ? mergeClozeSiblings(cards) : cards;
}

function printOptions() {
  const dialog = document.getElementById("print-dialog");
  return {
    answers: dialog.querySelector("#print-answers").checked,
    images: dialog.querySelector("#print-images").checked,
  };
}

function updatePrintSummary() {
  const dialog = document.getElementById("print-dialog");
  const options = printOptions();
  const count = printableCards(options).length;
  const skipped = printableCards({ ...options, images: true }).length - count;
  dialog.querySelector(".print-go").disabled = count === 0;
  dialog.querySelector(".print-summary").textContent = count === 0
    ? "Sin imágenes no hay nada que imprimir: estas preguntas solo tienen sentido con su imagen. Activa «Incluir imágenes y fotos»."
    : `Se imprimirán ${plural(count, "pregunta", "preguntas")}.`
      + (skipped ? ` Sin imágenes se omiten ${skipped} que solo tienen sentido con su imagen.` : "");
}

function openPrintDialog(cards, title = "") {
  state.print = { cards, title };
  const dialog = document.getElementById("print-dialog");
  updatePrintSummary();
  dialog.showModal();
}

function printSegments(segments, answers) {
  // Without answers, hidden cloze text becomes a blank line to fill in.
  return renderSegments(
    (segments || []).map((segment) => (segment.cloze && !answers
      ? { text: "________" }
      : segment)),
    { revealCloze: true },
  );
}

function renderPrintCard(card, { answers, images }) {
  const item = document.createElement("li");
  item.className = "print-card";
  if (card.front?.length) {
    const question = document.createElement("p");
    question.className = "print-question";
    question.append(printSegments(card.front, answers));
    item.append(question);
  }
  if (card.image && images) item.append(renderImage(card.image, { revealed: answers }));
  if (card.type === "choice") {
    const options = document.createElement("ol");
    options.className = "print-options";
    const correct = new Set(correctOptions(card));
    card.options.forEach((option, index) => {
      const li = document.createElement("li");
      li.textContent = option;
      if (answers && correct.has(index)) li.className = "is-correct";
      options.append(li);
    });
    if (isMultiChoice(card)) {
      const hint = document.createElement("p");
      hint.className = "print-note";
      hint.textContent = "Puede haber más de una respuesta correcta.";
      item.append(hint);
    }
    item.append(options);
  }
  if (card.type === "basic") {
    const answer = document.createElement("p");
    answer.className = answers ? "print-answer" : "print-blank";
    if (answers) answer.append(printSegments(card.back, true));
    item.append(answer);
  }
  if (answers && card.explanation) item.append(renderExplanation(card.explanation));
  if (answers && images && card.photo) {
    const photo = renderPhoto(card.photo);
    photo.classList.add("print-photo");
    item.append(photo);
  }
  return item;
}

function buildPrintArea({ answers, images }) {
  const cards = printableCards({ answers, images });
  const header = document.createElement("header");
  header.className = "print-header";
  const title = document.createElement("h1");
  title.textContent = state.print.title || "Examen de Nacionalización Ecuatoriana";
  const meta = document.createElement("p");
  const date = new Date().toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
  meta.textContent = `${cards.length} preguntas · ${answers ? "con respuestas" : "sin respuestas"} · ${date}`;
  const note = document.createElement("p");
  note.className = "print-disclaimer";
  note.textContent = "Material gratuito con fines exclusivamente pedagógicos; no es material oficial. "
    + "sauljabin.github.io/examen-de-nacionalidad-ecuatoriana";
  header.append(title, meta, note);

  const content = [header];
  let number = 0;
  for (const category of state.categories) {
    for (const sub of category.subcategories) {
      const subCards = cards.filter((card) => card.subcategory === sub.title && card.category === category.title);
      if (!subCards.length) continue;
      const heading = document.createElement("h2");
      heading.textContent = `${category.title} › ${sub.title}`;
      const list = document.createElement("ol");
      list.className = "print-list";
      list.start = number + 1;
      number += subCards.length;
      list.append(...subCards.map((card) => renderPrintCard(card, { answers, images })));
      content.push(heading, list);
    }
  }
  printArea.replaceChildren(...content);
}

function imagesLoaded(root) {
  return Promise.all([...root.querySelectorAll("img")].map((img) => (img.complete
    ? null
    : new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    }))));
}

function setupPrint() {
  const dialog = document.getElementById("print-dialog");
  const go = dialog.querySelector(".print-go");
  dialog.querySelector("#print-images").addEventListener("change", updatePrintSummary);
  dialog.querySelector("#print-answers").addEventListener("change", updatePrintSummary);
  go.addEventListener("click", async () => {
    const options = printOptions();
    go.disabled = true;
    go.textContent = "Preparando…";
    buildPrintArea(options);
    // Wait for pictures so they appear in the print or PDF.
    await imagesLoaded(printArea);
    go.disabled = false;
    go.textContent = "Imprimir";
    dialog.close();
    window.print();
  });
  window.addEventListener("afterprint", () => printArea.replaceChildren());
}

// Install --------------------------------------------------------------------

// Chrome, Edge and Android fire "beforeinstallprompt"; we keep it to open the
// install dialog from our own button. Safari on iPhone has no such event, so
// there we explain how to add the page to the home screen.
let installPrompt = null;

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function installDismissed() {
  try {
    return localStorage.getItem("installDismissed") === "1";
  } catch {
    return false;
  }
}

function installMode() {
  if (isInstalled() || installDismissed()) return null;
  if (installPrompt) return "prompt";
  if (isIOS()) return "ios";
  return null;
}

function renderInstall(mode) {
  const section = app.querySelector(".install");
  if (!section) return;
  section.hidden = !mode;
  if (!mode) return;
  section.querySelector(".install-button").hidden = mode !== "prompt";
  section.querySelector(".install-message").textContent = mode === "prompt"
    ? "Tenla a mano en tu pantalla de inicio y úsala sin internet."
    : "En el iPhone, toca el botón Compartir y luego «Agregar a pantalla de inicio». Después funciona sin internet.";
}

function setupInstall() {
  const section = app.querySelector(".install");
  section.querySelector(".install-button").addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    renderInstall(installMode());
  });
  section.querySelector(".install-dismiss").addEventListener("click", () => {
    try {
      localStorage.setItem("installDismissed", "1");
    } catch {}
    renderInstall(null);
  });
  renderInstall(installMode());
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  renderInstall(installMode());
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  renderInstall(null);
});

// Startup --------------------------------------------------------------------

document.addEventListener("keydown", (event) => {
  if (!app.querySelector(".question") || event.repeat) return;
  if (document.querySelector("dialog[open]")) return;
  if (event.key === "Escape") {
    confirmExit();
  } else if (event.key === "m" || event.key === "M") {
    app.querySelector(".exam-bar .mark")?.click();
  } else if (state.queue[state.index]?.type === "choice") {
    const position = Number(event.key) - 1;
    if (!state.revealed && state.optionOrder?.[position] !== undefined) {
      choose(state.optionOrder[position]);
    } else if (event.key === " " || event.key === "Enter") {
      const card = state.queue[state.index];
      if (state.revealed) {
        event.preventDefault();
        grade(state.choiceResult);
      } else if (isMultiChoice(card) && event.key === "Enter") {
        // Enter checks the answer; Space toggles the focused option.
        event.preventDefault();
        checkSelection();
      }
    }
  } else if (event.key === " " || event.key === "Enter") {
    if (!state.revealed) {
      event.preventDefault();
      reveal();
    }
  } else if (event.key === "1") {
    grade(false);
  } else if (event.key === "2") {
    grade(true);
  }
});

document.getElementById("report-link").href = issueUrl("error.yml");
document.getElementById("suggest-link").href = issueUrl("incluir-pregunta.yml");
document.getElementById("repo-link").href = REPO_URL;
setupSettings();
setupPrint();

// Offline support: the service worker caches the site after the first visit.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

fetch("data/cards.json")
  .then((response) => response.json())
  .then((data) => {
    state.categories = data.categories;
    state.allCards = [];
    for (const category of data.categories) {
      for (const sub of category.subcategories) {
        state.selected.add(subcategoryKey(category, sub));
        for (const card of sub.cards) {
          card.category = category.title;
          card.subcategory = sub.title;
          card.code = shortCode(card.id);
          if (state.cardsByCode.has(card.code)) {
            console.error(`Questions ${card.id} and ${state.cardsByCode.get(card.code).id} share the link code ${card.code}`);
          }
          state.cardsById.set(card.id, card);
          state.cardsByCode.set(card.code, card);
          state.allCards.push(card);
        }
      }
    }
    const exam = examFromHash();
    if (exam) showShared(exam);
    else showHome();
    // A shared link pasted into a tab where the site is already open.
    window.addEventListener("hashchange", () => {
      const next = examFromHash();
      if (next) showShared(next);
    });
  })
  .catch(() => {
    app.innerHTML = '<p class="loading">No se pudieron cargar las preguntas.</p>';
  });
