const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
dotenv.config();

const genAIKey = process.env.GEMINI_API_KEY || process.env.API_KEY || 'MISSING_KEY';
const genAI = new GoogleGenAI({ apiKey: genAIKey });

async function listModels() {
    try {
        console.log("Listing models...");
        const response = await genAI.models.list();
        // The response structure might be a pager or array.
        // Based on index.cjs: new Pager(..., await this.listInternal(params), params)
        // So we can iterate it.
        for await (const model of response) {
            console.log(`- ${model.name}`);
            console.log(`  Supported methods: ${model.supportedGenerationMethods}`);
        }
    } catch (e) {
        console.error("Error listing models:", e);
        // Fallback: try to print the error object logic to see validity
    }
}

listModels();
