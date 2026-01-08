const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

/**
 * Generates personalized insights based on student performance data using Groq (Llama 3).
 * @param {Object} userData - Contains profile, completed tasks, and quiz history.
 */
async function generatePersonalizedInsights(userData) {
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
        console.warn('Groq API key missing. Returning mock insights.');
        return [];
    }

    const { name, currentMood, tasks, quizResults } = userData;

    const completedTasksCount = (tasks || []).filter(t => t.status === 'completed').length;
    const avgQuizScore = quizResults && quizResults.length > 0
        ? (quizResults.reduce((acc, r) => acc + (r.score / r.total), 0) / quizResults.length) * 100
        : 0;

    const systemPrompt = `You are a high-performance study coach for Adapta, an AI study planner.
Your goal is to provide 3 deeply personalized, actionable insights based on a student's data.

STUDENT DATA:
- Name: ${name}
- Current Mood: ${currentMood}
- Completed Tasks: ${completedTasksCount}
- Average Quiz Accuracy: ${avgQuizScore.toFixed(1)}%
- Recent Quiz Weaknesses: ${JSON.stringify(quizResults.slice(0, 5).flatMap(r => r.weakSubtopics || []))}
- Recent Quiz Strengths: ${JSON.stringify(quizResults.slice(0, 5).flatMap(r => r.stableSubtopics || []))}

DIRECTIONS:
1. Analyze patterns in their performance and mood.
2. Provide insights that feel "human" and encouraging, yet data-driven.
3. Each insight must have:
   - title: Short, catchy name (max 4 words)
   - icon: Single relevant emoji
   - reasoning: A "because" statement explaining the observation (max 2 sentences)
   - change: An actionable study tip or adjustment (max 1 sentence)

STRICT RULES:
- Return ONLY a JSON array of objects.
- Structure: [{"id": "1", "title": "...", "icon": "...", "reasoning": "...", "change": "..."}]
- No AI mentions, no preamble.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a professional study analyzer. Return pure JSON." },
                { role: "user", content: systemPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const rawContent = completion.choices[0].message.content;
        // Handle optional markdown wrapping from some models
        let jsonString = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

        const firstBrace = jsonString.indexOf('[');
        const lastBrace = jsonString.lastIndexOf(']');
        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonString = jsonString.substring(firstBrace, lastBrace + 1);
        }

        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Groq Analysis Error:', error.message);
        return [];
    }
}

module.exports = { generatePersonalizedInsights };
