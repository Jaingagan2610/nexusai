require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testKey() {
  console.log('Testing Anthropic API Key...');
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Ping' }],
    });
    console.log('✅ API Key is WORKING!');
    console.log('Response:', response.content[0].text);
  } catch (err) {
    console.error('❌ API Key test FAILED!');
    console.error('Error Status:', err.status);
    console.error('Error Message:', err.message);
    if (err.status === 401) {
      console.error('Reason: Invalid API Key.');
    } else if (err.status === 429) {
      console.error('Reason: Rate limit reached.');
    }
  }
}

testKey();
