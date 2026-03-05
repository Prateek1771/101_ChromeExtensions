import { generateQuestions, evaluateAnswers } from "./lib/groq.js";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GENERATE_QUESTIONS") {
    handleGenerateQuestions(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }

  if (msg.type === "EVALUATE_ANSWERS") {
    handleEvaluateAnswers(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }

  if (msg.type === "SAVE_EVALUATION") {
    handleSaveEvaluation(msg.data).then(sendResponse);
    return true;
  }

  if (msg.type === "GET_API_KEY") {
    chrome.storage.sync.get("groqApiKey", (result) => {
      sendResponse({ apiKey: result.groqApiKey || "" });
    });
    return true;
  }
});

async function getApiKey() {
  return new Promise(resolve => {
    chrome.storage.sync.get("groqApiKey", (result) => {
      resolve(result.groqApiKey || "");
    });
  });
}

async function handleGenerateQuestions(msg) {
  const apiKey = await getApiKey();
  if (!apiKey) return { error: "No API key set" };
  const result = await generateQuestions(apiKey, msg.product);
  return result;
}

async function handleEvaluateAnswers(msg) {
  const apiKey = await getApiKey();
  if (!apiKey) return { error: "No API key set" };
  const result = await evaluateAnswers(apiKey, msg.product, msg.questions, msg.answers);
  return result;
}

async function handleSaveEvaluation(data) {
  return new Promise(resolve => {
    chrome.storage.local.get("evaluations", (result) => {
      const evaluations = result.evaluations || [];
      evaluations.unshift({
        ...data,
        timestamp: Date.now()
      });
      // Keep only last 50
      if (evaluations.length > 50) evaluations.length = 50;
      chrome.storage.local.set({ evaluations }, () => resolve({ success: true }));
    });
  });
}
