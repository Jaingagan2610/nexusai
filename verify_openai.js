require('dotenv').config();
const OpenAI = require('openai');

async function testGPT54() {
  console.log('Testing OpenAI API with gpt-5.4-mini...');
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in .env');
    return;
  }

  try {
    const openai = new OpenAI({ apiKey });

    // Using the new Responses API as requested by the user
    console.log('Using openai.responses.create...');
    const result = await openai.responses.create({
      model: 'gpt-5.4-mini',
      input: 'Say "GPT-5.4 is connected" in one short sentence.',
      store: true,
    });
    
    console.log('✅ OpenAI API (gpt-5.4-mini) is WORKING!');
    console.log('Response:', result.output_text);
  } catch (err) {
    console.error('❌ OpenAI API test FAILED!');
    console.error('Error:', err.message);
    if (err.message.includes('quota')) {
      console.error('Reason: You have run out of API quota.');
    }
  }
}

testGPT54();
