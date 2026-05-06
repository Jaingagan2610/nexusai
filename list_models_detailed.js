require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listAllModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ NO API KEY');
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    // Note: The listModels method might not be on the genAI instance directly depending on the version
    // Let's try to find it or use a fallback
    console.log('Fetching models...');
    
    // In newer versions of the SDK, you might need to use a different approach
    // But let's try the common one first
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.models) {
      console.log('Available Models:');
      data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.log('No models found in response:', data);
    }
  } catch (err) {
    console.error('Error listing models:', err.message);
  }
}

listAllModels();
