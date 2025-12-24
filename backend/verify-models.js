const { GoogleGenAI } = require('@google/genai');
try {
    const genAI = new GoogleGenAI({ apiKey: 'test' });
    console.log('genAI.models.generateContent type:', typeof genAI.models?.generateContent);
    console.log('genAI.getGenerativeModel type:', typeof genAI.getGenerativeModel);
} catch (e) {
    console.error(e);
}
