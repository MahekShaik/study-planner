const genai = require('@google/genai');
console.log('Keys in @google/genai:', Object.keys(genai));
try {
    const { GoogleGenAI } = require('@google/genai');
    console.log('GoogleGenAI is:', GoogleGenAI);
    const genAI = new GoogleGenAI({ apiKey: 'test' });
    console.log('genAI instance created successfully');
} catch (e) {
    console.error('Error instantiating GoogleGenAI with object:', e.message);
}

try {
    const { GoogleGenAI } = require('@google/genai');
    const genAI = new GoogleGenAI('test');
    console.log('genAI instance created with string successfully');
} catch (e) {
    console.error('Error instantiating GoogleGenAI with string:', e.message);
}
