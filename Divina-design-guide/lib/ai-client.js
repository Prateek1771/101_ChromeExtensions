/**
 * AI Client - Sends screenshots to Groq API (Llama 4 Scout) for golden ratio analysis.
 * Runs in service worker context.
 */

const AIClient = {
  /**
   * Analyze a screenshot for golden ratio alignment.
   * @param {string} apiKey - Groq API key
   * @param {string} screenshotBase64 - Base64 encoded screenshot (data URL)
   * @returns {Object} { score, guides, suggestions, summary }
   */
  async analyze(apiKey, screenshotBase64) {
    const prompt = `Analyze this website screenshot for overall design quality across 7 criteria.

Return ONLY valid JSON with this exact structure:
{
  "score": <number 1-10, overall design quality>,
  "designScores": {
    "goldenRatio": <1-10, phi alignment of layout proportions>,
    "typography": <1-10, type hierarchy, scale, and readability>,
    "colorContrast": <1-10, WCAG-like text/background contrast>,
    "whitespace": <1-10, breathing room and balance>,
    "colorDistribution": <1-10, adherence to 60-30-10 color rule>,
    "visualHierarchy": <1-10, focal points and reading flow>,
    "spacingConsistency": <1-10, consistent spacing rhythm>
  },
  "guides": [
    {"type": "v", "position": <0-1 fraction of viewport width>},
    {"type": "h", "position": <0-1 fraction of viewport height>},
    {"type": "rect", "x": <0-1>, "y": <0-1>, "w": <0-1>, "h": <0-1>}
  ],
  "suggestions": [
    "<actionable suggestion 1>",
    "<actionable suggestion 2>",
    "<actionable suggestion 3>"
  ],
  "summary": "<brief summary of design analysis>"
}

Guidelines for guides:
- Add vertical lines at golden ratio split points (e.g., 0.382, 0.618 of width)
- Add horizontal lines at golden ratio split points of height
- Add rectangles around elements that could be better aligned
- Maximum 8 guides total

Be specific and actionable in suggestions. Cover layout proportions, spacing, typography, color usage, and visual hierarchy.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: screenshotBase64 }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }],
        max_tokens: 2048,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error (${response.status}): ${err}`);
    }

    const result = await response.json();
    const text = result.choices[0].message.content;

    // Fix #12: Match first balanced top-level JSON object instead of greedy [\s\S]*
    const jsonMatch = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    // Fix #5: try-catch around JSON.parse
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('AI returned invalid JSON');
    }
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.AIClient = AIClient;
}
