const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

async function callGroqAPI(apiKey, pageContent, conversationHistory) {
    const systemMessage = {
        role: "system",
        content: `You are a helpful assistant that answers questions about the following webpage content. Base your answers on this content. If the answer isn't in the content, say so. Use markdown formatting for clear, readable responses.\n\n---PAGE CONTENT---\n${pageContent}\n---END PAGE CONTENT---`
    };

    const messages = [systemMessage, ...conversationHistory];

    const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1024
        })
    });

    if (!res.ok) {
        if (res.status === 401) {
            throw new Error("Invalid API key. Check your key in Options.");
        }
        const errBody = await res.text();
        throw new Error(`API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
}
