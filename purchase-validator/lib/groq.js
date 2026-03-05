const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

async function callGroq(apiKey, messages) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

export async function generateQuestions(apiKey, product) {
  const prompt = `You are a purchase advisor. Given this product, generate exactly 5 questions to help the user decide if they truly need it. The questions should probe: financial readiness, existing alternatives, urgency, emotional state, and practical need.

Product:
- Title: ${product.title}
- Price: ${product.price}
- Category: ${product.category || "Unknown"}
- Description: ${product.description || "N/A"}

Return JSON with this exact structure:
{
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "text": "question text",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."]
    },
    ... (4 MCQs total, ids 1-4)
    {
      "id": 5,
      "type": "open",
      "text": "open-ended question text"
    }
  ]
}

Make questions specific to this product. MCQ options should range from "clearly needs it" to "clearly an impulse buy". The open-ended question (id 5) should ask the user to honestly reflect on why they want this product.`;

  return await callGroq(apiKey, [
    { role: "system", content: "You are a helpful purchase advisor. Always respond in valid JSON." },
    { role: "user", content: prompt }
  ]);
}

export async function evaluateAnswers(apiKey, product, questions, answers) {
  const qaPairs = questions.map((q, i) => {
    return `Q${q.id}: ${q.text}\nA${q.id}: ${answers[i]}`;
  }).join("\n\n");

  const prompt = `You are a purchase advisor evaluating whether someone should buy a product based on their answers.

Product:
- Title: ${product.title}
- Price: ${product.price}
- Category: ${product.category || "Unknown"}

Questions and Answers:
${qaPairs}

Evaluate honestly. Return JSON with this exact structure:
{
  "verdict": "Buy It" or "Skip It",
  "score": <number 1-10 where 1=definitely skip, 10=definitely buy>,
  "reasoning": "2-3 sentence explanation of your verdict",
  "tips": ["tip 1", "tip 2", "tip 3"]
}

Tips should be actionable advice (e.g., "Wait 48 hours and see if you still want it", "Check if a friend can lend you one", "Look for refurbished options").`;

  return await callGroq(apiKey, [
    { role: "system", content: "You are a helpful purchase advisor. Always respond in valid JSON." },
    { role: "user", content: prompt }
  ]);
}
