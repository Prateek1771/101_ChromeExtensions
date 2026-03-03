const toggle = document.getElementById("toggle");
const statusText = document.getElementById("status-text");

function updateStatus(enabled) {
  statusText.textContent = enabled ? "On" : "Off";
  statusText.classList.toggle("active", enabled);
}

// Load saved state
chrome.storage.sync.get(["enabled"], (result) => {
  const enabled = result.enabled || false;
  toggle.checked = enabled;
  updateStatus(enabled);
});

// Toggle dark mode — no reload needed, content.js listens for storage changes
toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ enabled });
  updateStatus(enabled);
});
