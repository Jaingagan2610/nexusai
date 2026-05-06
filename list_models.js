require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    // There isn't a direct listModels in the client, usually we use the REST API for that
    // but we can try to hit a known model
    console.log('Listing models is usually done via REST, but let\'s try a different model name.');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent('Say Hi');
    console.log('gemini-pro works!');
  } catch (e) {
    console.log('gemini-pro failed:', e.message);
  }
}
listModels();
