// --- Constants ---
const DEMO_ENDPOINT = "https://demo.api4ai.cloud/virtual-try-on/v1/results";
const PROD_ENDPOINT = "https://api4ai.cloud/virtual-try-on/v1/results";
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

// --- State ---
const state = {
  userFile: null,
  userPreviewUrl: null,
  extractedImages: [],
  currentIndex: 0,
  resultImageUrl: null,
  isLoading: false,
  error: null,
  cooldown: 0,
};

const requestTimestamps = [];
let cooldownTimer = null;

// --- DOM refs ---
const $ = (id) => document.getElementById(id);
const userDropZone = $("userDropZone");
const userEmpty = $("userEmpty");
const userPreview = $("userPreview");
const userImg = $("userImg");
const userFileInput = $("userFileInput");
const userClearBtn = $("userClearBtn");
const carouselLoading = $("carouselLoading");
const carouselEmpty = $("carouselEmpty");
const carouselDisplay = $("carouselDisplay");
const carouselImg = $("carouselImg");
const carouselCounter = $("carouselCounter");
const prevBtn = $("prevBtn");
const nextBtn = $("nextBtn");
const errorBox = $("errorBox");
const submitBtn = $("submitBtn");
const submitText = $("submitText");
const resetBtn = $("resetBtn");
const loadingSection = $("loadingSection");
const resultSection = $("resultSection");
const resultOriginal = $("resultOriginal");
const resultImage = $("resultImage");
const downloadBtn = $("downloadBtn");

// --- Helpers ---
function readFileAsDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function isRateLimited() {
  const now = Date.now();
  while (requestTimestamps.length && now - requestTimestamps[0] > RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }
  return requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW;
}

function recordRequest() {
  requestTimestamps.push(Date.now());
}

function startCooldown(seconds) {
  state.cooldown = seconds;
  updateSubmitButton();
  clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    state.cooldown--;
    if (state.cooldown <= 0) {
      state.cooldown = 0;
      clearInterval(cooldownTimer);
    }
    updateSubmitButton();
  }, 1000);
}

async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["api4aiKey"], (result) => {
      resolve(result.api4aiKey || "");
    });
  });
}

async function retryWithBackoff(fn) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const msg = error.message || "";
      const isRateLimit = msg.includes("429") || msg.includes("rate") || msg.includes("quota") || msg.includes("Too Many");
      if (isRateLimit && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

// --- UI Updates ---
function updateSubmitButton() {
  const hasDress = state.extractedImages.length > 0;
  const canSubmit = state.userFile && hasDress && !state.isLoading && state.cooldown <= 0;
  submitBtn.disabled = !canSubmit;

  if (state.isLoading) {
    submitText.textContent = "Generating...";
    submitBtn.querySelector("svg").style.display = "none";
  } else if (state.cooldown > 0) {
    submitText.textContent = `Wait ${state.cooldown}s`;
    submitBtn.querySelector("svg").style.display = "none";
  } else {
    submitText.textContent = "Try It On";
    submitBtn.querySelector("svg").style.display = "";
  }
}

function showResetBtn() {
  if (state.userFile || state.resultImageUrl) {
    resetBtn.classList.remove("hidden");
  } else {
    resetBtn.classList.add("hidden");
  }
}

function showError(msg) {
  state.error = msg;
  if (msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  } else {
    errorBox.classList.add("hidden");
  }
}

function setDropZonePreview(zone, emptyEl, previewEl, imgEl, url) {
  if (url) {
    emptyEl.classList.add("hidden");
    previewEl.classList.remove("hidden");
    imgEl.src = url;
    zone.classList.add("has-preview");
  } else {
    emptyEl.classList.remove("hidden");
    previewEl.classList.add("hidden");
    imgEl.src = "";
    zone.classList.remove("has-preview");
  }
}

// --- Carousel ---
function updateCarousel() {
  const imgs = state.extractedImages;
  if (imgs.length === 0) {
    carouselDisplay.classList.add("hidden");
    carouselCounter.classList.add("hidden");
    carouselEmpty.classList.remove("hidden");
    return;
  }

  carouselEmpty.classList.add("hidden");
  carouselDisplay.classList.remove("hidden");
  carouselCounter.classList.remove("hidden");

  carouselImg.src = imgs[state.currentIndex];
  carouselCounter.textContent = `${state.currentIndex + 1} / ${imgs.length}`;

  prevBtn.disabled = state.currentIndex === 0;
  nextBtn.disabled = state.currentIndex === imgs.length - 1;
}

function navigateCarousel(delta) {
  const newIndex = state.currentIndex + delta;
  if (newIndex >= 0 && newIndex < state.extractedImages.length) {
    state.currentIndex = newIndex;
    updateCarousel();
  }
}

// --- Image Extraction ---
function extractImagesFromPage() {
  carouselLoading.classList.remove("hidden");
  carouselEmpty.classList.add("hidden");
  carouselDisplay.classList.add("hidden");
  carouselCounter.classList.add("hidden");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (!tabId) {
      onExtractionComplete([]);
      return;
    }

    // Try sending message to existing content script first
    chrome.tabs.sendMessage(tabId, { action: "extractImages" }, (response) => {
      if (!chrome.runtime.lastError && response?.images) {
        onExtractionComplete(response.images);
        return;
      }

      // Content script not injected yet — inject it, then retry
      chrome.scripting.executeScript(
        { target: { tabId }, files: ["content.js"] },
        () => {
          if (chrome.runtime.lastError) {
            onExtractionComplete([]);
            return;
          }
          chrome.tabs.sendMessage(tabId, { action: "extractImages" }, (retryResponse) => {
            if (chrome.runtime.lastError || !retryResponse?.images) {
              onExtractionComplete([]);
              return;
            }
            onExtractionComplete(retryResponse.images);
          });
        }
      );
    });
  });
}

function onExtractionComplete(images) {
  carouselLoading.classList.add("hidden");
  state.extractedImages = images;
  state.currentIndex = 0;
  updateCarousel();
  updateSubmitButton();
}

// --- File handling ---
async function handleFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const url = await readFileAsDataURL(file);
  state.userFile = file;
  state.userPreviewUrl = url;
  setDropZonePreview(userDropZone, userEmpty, userPreview, userImg, url);
  showError(null);
  updateSubmitButton();
  showResetBtn();
}

function clearUserFile() {
  state.userFile = null;
  state.userPreviewUrl = null;
  userFileInput.value = "";
  setDropZonePreview(userDropZone, userEmpty, userPreview, userImg, null);
  updateSubmitButton();
  showResetBtn();
}

// --- Drag & Drop ---
function setupDropZone(zone, fileInput) {
  zone.addEventListener("click", (e) => {
    if (e.target.closest(".clear-btn")) return;
    if (state.userFile) return;
    fileInput.click();
  });

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragging");
  });
  zone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    zone.classList.remove("dragging");
  });
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragging");
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file);
  });
}

// --- Fetch dress image as blob ---
async function fetchImageAsBlob(url) {
  if (url.startsWith("data:")) {
    // Convert data URI to blob
    const res = await fetch(url);
    return res.blob();
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch dress image: ${res.status}`);
  return res.blob();
}

// --- Submit ---
async function handleSubmit() {
  if (!state.userFile || state.extractedImages.length === 0) {
    showError("Please upload your photo and ensure a dress is selected.");
    return;
  }

  if (isRateLimited()) {
    showError("Too many requests. Please wait at least 1 minute between tries.");
    startCooldown(30);
    return;
  }

  state.isLoading = true;
  state.resultImageUrl = null;
  showError(null);
  updateSubmitButton();
  loadingSection.classList.remove("hidden");
  resultSection.classList.add("hidden");

  try {
    recordRequest();

    // Fetch the selected dress image as a blob
    const dressUrl = state.extractedImages[state.currentIndex];
    const dressBlob = await fetchImageAsBlob(dressUrl);
    const dressFile = new File([dressBlob], "dress.jpg", { type: dressBlob.type || "image/jpeg" });

    const apiKey = await getApiKey();
    const endpoint = apiKey ? PROD_ENDPOINT : DEMO_ENDPOINT;

    const formData = new FormData();
    formData.append("image", state.userFile, state.userFile.name);
    formData.append("image-apparel", dressFile, dressFile.name);

    const apiResponse = await retryWithBackoff(async () => {
      const headers = {};
      if (apiKey) headers["X-API-KEY"] = apiKey;

      const res = await fetch(endpoint, { method: "POST", headers, body: formData });

      if (res.status === 429) throw new Error("429 Too Many Requests");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }
      return res.json();
    });

    const imageBase64 = apiResponse?.results?.[0]?.entities?.[0]?.image;
    if (!imageBase64) throw new Error("API did not return a result image.");

    state.resultImageUrl = `data:image/png;base64,${imageBase64}`;
    resultOriginal.src = state.userPreviewUrl;
    resultImage.src = state.resultImageUrl;
    resultSection.classList.remove("hidden");
    startCooldown(5);
  } catch (err) {
    const msg = err.message || "An error occurred during image generation.";
    const isRateLimitError = msg.includes("429") || msg.includes("rate") || msg.includes("quota") || msg.includes("Too Many");
    showError(isRateLimitError ? "API rate limit reached. Please wait a moment and try again." : msg);
    if (isRateLimitError) startCooldown(30);
  } finally {
    state.isLoading = false;
    updateSubmitButton();
    loadingSection.classList.add("hidden");
    showResetBtn();
  }
}

function handleReset() {
  clearUserFile();
  state.resultImageUrl = null;
  state.isLoading = false;
  showError(null);
  resultSection.classList.add("hidden");
  loadingSection.classList.add("hidden");
  updateSubmitButton();
  showResetBtn();
}

function handleDownload() {
  if (!state.resultImageUrl) return;
  const a = document.createElement("a");
  a.href = state.resultImageUrl;
  a.download = "tryon-result.png";
  a.click();
}

// --- Cleanup on unload ---
window.addEventListener("unload", () => {
  if (state.userPreviewUrl && state.userPreviewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(state.userPreviewUrl);
  }
  if (state.resultImageUrl && state.resultImageUrl.startsWith("blob:")) {
    URL.revokeObjectURL(state.resultImageUrl);
  }
});

// --- Init ---
setupDropZone(userDropZone, userFileInput);
userClearBtn.addEventListener("click", (e) => { e.stopPropagation(); clearUserFile(); });
prevBtn.addEventListener("click", () => navigateCarousel(-1));
nextBtn.addEventListener("click", () => navigateCarousel(1));
submitBtn.addEventListener("click", handleSubmit);
resetBtn.addEventListener("click", handleReset);
downloadBtn.addEventListener("click", handleDownload);

// Extract images on popup open
extractImagesFromPage();
