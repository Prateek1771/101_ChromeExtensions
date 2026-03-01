const setupEl = document.getElementById("setup");
const chatViewEl = document.getElementById("chat-view");
const messagesEl = document.getElementById("messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const statusEl = document.getElementById("status");
const keyInput = document.getElementById("key-input");
const saveKeyBtn = document.getElementById("save-key-btn");
const keyError = document.getElementById("key-error");

let apiKey = null;
let pageContent = null;
let conversationHistory = [];

initUI(messagesEl);
init();

async function init() {
    apiKey = await new Promise((resolve) => {
        chrome.storage.sync.get(["GROQ_API_KEY"], (result) => {
            resolve(result.GROQ_API_KEY || null);
        });
    });

    if (!apiKey) {
        showSetup();
        return;
    }

    showChat();
}

function showSetup() {
    setupEl.classList.remove("hidden");
    chatViewEl.classList.add("hidden");
    statusEl.textContent = "Setup required";
    keyInput.focus();
}

saveKeyBtn.addEventListener("click", saveKey);
keyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveKey();
});

async function saveKey() {
    const key = keyInput.value.trim();
    keyError.textContent = "";

    if (!key) {
        keyError.textContent = "Please paste your API key.";
        return;
    }

    await new Promise((resolve) => {
        chrome.storage.sync.set({ GROQ_API_KEY: key }, resolve);
    });
    apiKey = key;
    showChat();
}

async function showChat() {
    setupEl.classList.add("hidden");
    chatViewEl.classList.remove("hidden");
    statusEl.textContent = "Loading page content...";

    await loadPageContent();
}

async function loadPageContent() {
    let tab;
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tab = activeTab;
    } catch {
        statusEl.textContent = "No active tab";
        addMessage("system", "Could not access the current tab.");
        return;
    }

    if (!tab || !tab.id || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
        statusEl.textContent = "Unsupported page";
        addMessage("system", "This page cannot be read. Try a regular webpage.");
        return;
    }

    try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_ARTICLE_TEXT" });
        if (response && response.text && response.text.trim().length > 0) {
            pageContent = response.text;
            const wordCount = pageContent.split(/\s+/).filter(Boolean).length;
            statusEl.textContent = `${wordCount.toLocaleString()} words loaded`;
            statusEl.classList.add("ready");

            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();

            addMessage("system", "Page content loaded. Ask me anything about this page!");
        } else {
            statusEl.textContent = "No content found";
            addMessage("system", "Could not extract text from this page. Try refreshing the page and reopening.");
        }
    } catch {
        statusEl.textContent = "Content script not loaded";
        addMessage("system", "Please refresh the page and try again so the content script can load.");
    }
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !sendBtn.disabled) {
        sendMessage();
    }
});

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage("user", text);
    userInput.value = "";

    userInput.disabled = true;
    sendBtn.disabled = true;

    conversationHistory.push({ role: "user", content: text });

    const typingEl = showTyping();

    try {
        const reply = await callGroqAPI(apiKey, pageContent, conversationHistory);
        conversationHistory.push({ role: "assistant", content: reply });
        removeTyping(typingEl);
        addMessage("assistant", reply);
    } catch (err) {
        removeTyping(typingEl);
        addMessage("system", `Error: ${err.message}`);
    }

    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
}
