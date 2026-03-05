const apiKeyInput = document.getElementById("apiKey");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

chrome.storage.sync.get("groqApiKey", (result) => {
  if (result.groqApiKey) {
    apiKeyInput.value = result.groqApiKey;
  }
});

saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showStatus("Please enter an API key.", "error");
    return;
  }
  chrome.storage.sync.set({ groqApiKey: key }, () => {
    showStatus("API key saved successfully!", "success");
  });
});

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = "status " + type;
  setTimeout(() => { statusEl.className = "status"; }, 3000);
}
