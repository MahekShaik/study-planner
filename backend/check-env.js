const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
console.log('Checking .env at:', envPath);

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    console.log('File Content Length:', content.length);
    console.log('First 50 chars:', content.substring(0, 50));
    console.log('Contains GEMINI_API_KEY:', content.includes('GEMINI_API_KEY'));

    const parsed = dotenv.parse(content);
    console.log('Parsed Keys:', Object.keys(parsed));
} else {
    console.log('.env file NOT FOUND');
}
