require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  console.log('Testing Gemini API Key...');
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const result = await model.generateContent('Say "Gemini is connected" in one short sentence.');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini API Key is WORKING!');
    console.log('Response:', text);
  } catch (err) {
    console.error('❌ Gemini API Key test FAILED!');
    console.error('Error:', err.message);
    if (err.message.includes('API_KEY_INVALID')) {
      console.error('Reason: Invalid API Key.');
    }
  }
}

testGemini();
