const $ = (id) => document.getElementById(id);

let product = null;
let questions = [];
let answers = [];
let currentQ = 0;

// State management
function showState(stateId) {
  document.querySelectorAll(".state").forEach(s => s.classList.add("hidden"));
  $(stateId).classList.remove("hidden");
}

// Initialize on popup open
async function init() {
  showState("state-loading");

  // Check API key
  const keyRes = await sendMessage({ type: "GET_API_KEY" });
  if (!keyRes || !keyRes.apiKey) {
    showState("state-no-key");
    return;
  }

  // Get product data from content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showState("state-no-product");
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_PRODUCT_DATA" });
    if (!response || !response.product) {
      showState("state-no-product");
      return;
    }

    product = response.product;
    renderProduct();
    showState("state-product");
  } catch (e) {
    showState("state-no-product");
  }
}

function renderProduct() {
  const img = $("product-img");
  if (product.imageUrl) {
    img.src = product.imageUrl;
  } else {
    img.style.display = "none";
  }
  $("product-title").textContent = product.title;
  $("product-price").textContent = product.price || "Price not found";
  $("product-site").textContent = product.site;
}

// Validate button
$("btn-validate").addEventListener("click", async () => {
  showState("state-loading");
  try {
    const result = await sendMessage({ type: "GENERATE_QUESTIONS", product });
    if (result.error) throw new Error(result.error);
    questions = result.questions;
    answers = [];
    currentQ = 0;
    renderQuestion();
    showState("state-questions");
  } catch (e) {
    showError(e.message);
  }
});

function renderQuestion() {
  const q = questions[currentQ];
  $("question-counter").textContent = `Question ${currentQ + 1} of ${questions.length}`;
  $("progress-fill").style.width = `${((currentQ + 1) / questions.length) * 100}%`;
  $("question-text").textContent = q.text;

  const btnNext = $("btn-next");
  btnNext.textContent = currentQ === questions.length - 1 ? "Get Verdict" : "Next";
  btnNext.disabled = true;

  const mcqContainer = $("mcq-options");
  const openAnswer = $("open-answer");

  if (q.type === "mcq") {
    mcqContainer.classList.remove("hidden");
    openAnswer.classList.add("hidden");
    mcqContainer.innerHTML = "";
    q.options.forEach((opt, i) => {
      const label = document.createElement("label");
      label.className = "mcq-option";
      label.innerHTML = `<input type="radio" name="q${q.id}" value="${i}"><span>${opt}</span>`;
      label.addEventListener("click", () => {
        mcqContainer.querySelectorAll(".mcq-option").forEach(o => o.classList.remove("selected"));
        label.classList.add("selected");
        btnNext.disabled = false;
      });
      mcqContainer.appendChild(label);
    });
  } else {
    mcqContainer.classList.add("hidden");
    openAnswer.classList.remove("hidden");
    openAnswer.value = "";
    openAnswer.addEventListener("input", () => {
      btnNext.disabled = openAnswer.value.trim().length === 0;
    });
  }
}

// Next / Submit button
$("btn-next").addEventListener("click", async () => {
  const q = questions[currentQ];
  if (q.type === "mcq") {
    const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
    if (!selected) return;
    answers.push(q.options[parseInt(selected.value)]);
  } else {
    answers.push($("open-answer").value.trim());
  }

  currentQ++;
  if (currentQ < questions.length) {
    renderQuestion();
  } else {
    await submitAnswers();
  }
});

async function submitAnswers() {
  showState("state-evaluating");
  try {
    const result = await sendMessage({
      type: "EVALUATE_ANSWERS",
      product,
      questions,
      answers
    });
    if (result.error) throw new Error(result.error);
    renderResult(result);
    showState("state-result");

    // Save evaluation
    sendMessage({
      type: "SAVE_EVALUATION",
      data: { product, verdict: result.verdict, score: result.score }
    });
  } catch (e) {
    showError(e.message);
  }
}

function renderResult(result) {
  const badge = $("verdict-badge");
  badge.textContent = result.verdict;
  badge.className = "verdict-badge " + (result.verdict === "Buy It" ? "buy" : "skip");

  const score = result.score;
  $("score-value").textContent = score;

  const pct = (score / 10) * 100;
  const color = score >= 7 ? "var(--green)" : score >= 4 ? "#f39c12" : "var(--red)";
  $("score-ring").style.background = `conic-gradient(${color} ${pct * 3.6}deg, var(--border) ${pct * 3.6}deg)`;
  $("score-value").style.color = color;

  $("result-reasoning").textContent = result.reasoning;

  const tipsEl = $("result-tips");
  if (result.tips && result.tips.length > 0) {
    tipsEl.innerHTML = `<h3>Tips</h3><ul>${result.tips.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`;
  } else {
    tipsEl.innerHTML = "";
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showError(msg) {
  $("error-msg").textContent = msg || "Something went wrong. Please try again.";
  showState("state-error");
}

// Retry buttons
$("btn-retry").addEventListener("click", () => {
  questions = [];
  answers = [];
  currentQ = 0;
  renderProduct();
  showState("state-product");
});

$("btn-error-retry").addEventListener("click", init);

// Open options page
$("btn-open-options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// Helper
function sendMessage(msg) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(msg, resolve);
  });
}

// Start
init();
