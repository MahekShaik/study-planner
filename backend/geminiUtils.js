const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// Central configuration for the Gemini model
const GEMINI_MODEL = "gemini-2.5-flash";

// Initialize Gemini API
const genAIKey = process.env.GEMINI_API_KEY || process.env.API_KEY || 'MISSING_KEY';
const genAI = new GoogleGenerativeAI(genAIKey);

/**
 * Call Gemini API with centralized retry logic and error handling.
 * @param {Object} options Configuration for the call
 * @param {Array} options.contents The message contents for Gemini
 * @param {string} options.systemInstruction Optional system instruction
 * @param {Object} options.generationConfig Optional generation config (e.g., responseMimeType)
 * @param {number} options.maxRetries Maximum number of retries for transient errors
 * @param {string} options.source Identifier for which feature is calling the API
 * @returns {Promise<string>} The raw text response from Gemini
 */
async function callGeminiWithRetry({
    contents,
    systemInstruction,
    generationConfig = {},
    maxRetries = 2,
    source = 'unknown'
}) {
    let retryCount = 0;

    while (retryCount <= maxRetries) {
        try {
            console.log(`[Gemini API] Calling ${GEMINI_MODEL} for ${source} (attempt ${retryCount + 1}/${maxRetries + 1})...`);

            const modelOptions = { model: GEMINI_MODEL };
            if (systemInstruction) {
                modelOptions.systemInstruction = systemInstruction;
            }
            if (generationConfig) {
                modelOptions.generationConfig = generationConfig;
            }

            const model = genAI.getGenerativeModel(modelOptions);
            const result = await model.generateContent({ contents });

            // Handle different response structures from the SDK
            let text;
            if (typeof result.text === 'function') {
                text = result.text();
            } else if (result.text) {
                text = result.text;
            } else if (result.response && typeof result.response.text === 'function') {
                text = result.response.text();
            } else if (result.response && result.response.text) {
                text = result.response.text;
            } else {
                // Fallback or last resort
                text = JSON.stringify(result);
            }

            return text;
        } catch (error) {
            console.error(`[Gemini API Log] Error in ${source} (attempt ${retryCount + 1}):`, error.message);

            // Log errors to centralized file
            const errorLog = `[${new Date().toISOString()}] Gemini API Error (${source}, Model: ${GEMINI_MODEL}, Attempt: ${retryCount + 1}):\n${error.toString()}\n${error.stack || ''}\n\n`;
            fs.appendFileSync('server_error.log', errorLog);

            // Check for quota/rate limit errors (Don't retry if quota exceeded)
            const isQuotaError = error.message.includes('429') ||
                error.message.includes('Quota') ||
                error.message.includes('limit');

            if (isQuotaError) {
                console.warn(`[Gemini API] Quota exceeded for ${source}. Stopping retries.`);
                throw new Error('Daily AI Quota Exceeded. Please try again later or check your API key.');
            }

            // Check for transient errors to retry (503 Service Unavailable, 500, timeous, etc.)
            const isTransientError = error.message.includes('503') ||
                error.message.includes('500') ||
                error.message.includes('timeout') ||
                error.message.includes('network') ||
                error.message.includes('ETIMEDOUT') ||
                error.message.includes('ECONNRESET');

            if (isTransientError && retryCount < maxRetries) {
                const waitTime = Math.pow(2, retryCount) * 2000; // Exponential backoff: 2s, 4s
                console.log(`[Gemini API] Transient error detected. Retrying in ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                retryCount++;
            } else {
                // Not a transient error or max retries reached
                throw error;
            }
        }
    }
}

/**
 * Utility to parse JSON from Gemini responses more reliably.
 * @param {string} text The raw text from Gemini
 * @returns {Array|Object} Parsed JSON
 */
function parseGeminiJson(text) {
    if (!text) return null;

    try {
        // 1. Remove markdown code blocks if present
        let cleaned = text.replace(/```json\s?/g, '').replace(/```\s?/g, '').trim();

        // 2. Try direct parse first
        try {
            return JSON.parse(cleaned);
        } catch (e) {
            // Continue to extraction logic
        }

        // 3. Extract the largest JSON structure (array or object)
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');

        let extracted = null;

        // Prefer array if both exist and array is outer, or only array exists
        if (firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
            extracted = cleaned.substring(firstBracket, lastBracket + 1);
        } else if (firstBrace !== -1 && lastBrace !== -1) {
            extracted = cleaned.substring(firstBrace, lastBrace + 1);
        }

        if (extracted) {
            return JSON.parse(extracted);
        }

        throw new Error("No JSON structure found in response");
    } catch (error) {
        console.error('[Gemini Parsing Error] Failed to parse JSON. Raw response head:', text.substring(0, 200).replace(/\n/g, ' '));
        throw new Error(`Failed to parse AI response: ${error.message}`);
    }
}

module.exports = {
    callGeminiWithRetry,
    parseGeminiJson,
    GEMINI_MODEL
};
