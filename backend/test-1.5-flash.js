require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function testModel() {
    const genAIKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const genAI = new GoogleGenAI(genAIKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const result = await model.generateContent("Hello! Are you working?");
        const response = await result.response;
        const text = response.text();
        console.log("Model response:", text);
        console.log("gemini-1.5-flash is AVAILABLE");
    } catch (error) {
        console.error("gemini-1.5-flash FAILED:", error.message);
    }
}

testModel();
