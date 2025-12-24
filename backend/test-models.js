require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function testModels() {
    const genAIKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const genAI = new GoogleGenAI({ apiKey: genAIKey });

    const modelsToTest = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash-001", "gemini-1.5-flash-002", "gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-2.5-flash"];

    for (const modelName of modelsToTest) {
        try {
            const result = await genAI.models.generateContent({
                model: modelName,
                contents: [{ role: "user", parts: [{ text: "ping" }] }]
            });
            console.log(`✅ ${modelName} is AVAILABLE`);
        } catch (error) {
            console.log(`❌ ${modelName} FAILED: ${error.message}`);
        }
    }
}

testModels();
