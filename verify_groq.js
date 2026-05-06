require('dotenv').config();
const Groq = require('groq-sdk');

async function testGroq() {
  console.log('Testing Groq API Key...');
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GROQ_API_KEY not found in .env');
    return;
  }

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Say "Groq is connected" in one short sentence.' }],
      model: 'llama-3.3-70b-versatile',
    });
    
    console.log('✅ Groq API Key is WORKING!');
    console.log('Response:', completion.choices[0].message.content);
  } catch (err) {
    console.error('❌ Groq API Key test FAILED!');
    console.error('Error:', err.message);
  }
}

testGroq();
