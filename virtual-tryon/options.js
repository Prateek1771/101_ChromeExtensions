const apiKeyInput = document.getElementById("apiKey");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

// Load saved key
chrome.storage.sync.get(["api4aiKey"], (result) => {
  apiKeyInput.value = result.api4aiKey || "";
  updateStatus(result.api4aiKey);
});

saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  chrome.storage.sync.set({ api4aiKey: key }, () => {
    statusEl.textContent = "Saved!";
    statusEl.className = "status success";
    updateStatus(key);
    setTimeout(() => {
      statusEl.className = "status";
      updateStatus(key);
    }, 2000);
  });
});

function updateStatus(key) {
  if (statusEl.textContent === "Saved!") return;
  statusEl.textContent = key ? "Using production endpoint" : "Using free demo endpoint";
  statusEl.className = "status";
}
