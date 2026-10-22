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
  app.replaceChildren(cloneTemplate("home-template"));
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
    updateHome();
  });
  for (const button of app.querySelectorAll("[data-select]")) {
    button.addEventListener("click", () => {
      const all = button.dataset.select === "all";
      for (const chip of list.querySelectorAll(".chip input")) {
        chip.checked = all;
        toggleSelection(chip.value, all);
      }
      updateHome();
    });
  }
  app.querySelector("#start").addEventListener("click", () => {
    const cards = selectedCards();
    if (!cards.length) return;
    const ordered = app.querySelector("#shuffle").checked ? shuffle(cards) : cards;
    const count = app.querySelector("#question-count").value;
    startExam(count === "all" ? ordered : ordered.slice(0, Number(count)));
  });
  updateHome();
}

function toggleSelection(key, on) {
  if (on) state.selected.add(key);
  else state.selected.delete(key);
}

function updateHome() {
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
  start.textContent = available
    ? `Comenzar · ${total} ${total === 1 ? "pregunta" : "preguntas"}`
    : "Elige al menos un tema";
  app.querySelector("#question-count").onchange = updateHome;
}

// Exam -----------------------------------------------------------------------

function startExam(cards) {
  state.queue = cards;
  state.index = 0;
  state.missed = [];
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
  renderCardFace(card);
  app.querySelector(".report").href = issueUrl("error.yml", {
    title: `[Error] ${cardSummary(card).slice(0, 70)}`,
    pregunta: `${cardSummary(card)}\n\nID: ${card.id}`,
  });
  app.querySelector(".exit").addEventListener("click", confirmExit);
  // Tapping the card also shows the answer, which is handy on phones.
  app.querySelector(".question").addEventListener("click", (event) => {
    if (!event.target.closest("a")) reveal();
  });
  app.querySelector(".reveal").addEventListener("click", reveal);
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
  if (card.type === "basic" && revealed) {
    app.querySelector(".back").replaceChildren(renderSegments(card.back, { revealCloze: true }));
    app.querySelector(".answer").hidden = false;
  }
}

function reveal() {
  if (state.revealed) return;
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
  if (!state.revealed) return;
  const card = state.queue[state.index];
  card.lastResult = knewIt;
  if (!knewIt) state.missed.push(card);
  state.index += 1;
  if (state.index < state.queue.length) showCard();
  else showResult();
}

function confirmExit() {
  const dialog = document.getElementById("exit-dialog");
  dialog.returnValue = "";
  dialog.showModal();
  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "exit") showHome();
  }, { once: true });
}

// Result ---------------------------------------------------------------------

function showResult() {
  const total = state.queue.length;
  const right = total - state.missed.length;
  app.replaceChildren(cloneTemplate("result-template"));
  app.querySelector(".score").textContent = `${Math.round((right / total) * 100)}%`;
  app.querySelector(".summary").textContent = `Acertaste ${right} de ${total} preguntas.`;

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
    retry.addEventListener("click", () => startExam(shuffle(missed)));
  } else {
    retry.remove();
    app.querySelector(".missed-title").remove();
  }
  app.querySelector(".restart").addEventListener("click", showHome);

  const list = app.querySelector(".missed");
  for (const card of missed) {
    const item = document.createElement("li");
    if (card.front?.length) {
      const question = document.createElement("p");
      question.append(renderSegments(card.front, { revealCloze: true }));
      item.append(question);
    }
    if (card.image) item.append(renderImage(card.image, { revealed: true }));
    if (card.type === "basic") {
      const answer = document.createElement("p");
      answer.className = "missed-answer";
      answer.append(renderSegments(card.back, { revealCloze: true }));
      item.append(answer);
    }
    list.append(item);
  }
  app.focus();
}

// Startup --------------------------------------------------------------------

document.addEventListener("keydown", (event) => {
  if (!app.querySelector(".question") || event.repeat) return;
  if (document.querySelector("dialog[open]")) return;
  if (event.key === "Escape") {
    confirmExit();
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

fetch("data/cards.json")
  .then((response) => response.json())
  .then((data) => {
    state.categories = data.categories;
    for (const category of data.categories) {
      for (const sub of category.subcategories) {
        state.selected.add(subcategoryKey(category, sub));
        for (const card of sub.cards) {
          card.category = category.title;
          card.subcategory = sub.title;
        }
      }
    }
    showHome();
  })
  .catch(() => {
    app.innerHTML = '<p class="loading">No se pudieron cargar las preguntas.</p>';
  });
