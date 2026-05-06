require('dotenv').config();
const OpenAI = require('openai');

const fluxClient = new OpenAI({
  apiKey: process.env.FLUX_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

async function test() {
  try {
    console.log('Testing Flux generation...');
    const response = await fluxClient.images.generate({
      model: "black-forest-labs/flux-2-klein-4b",
      prompt: "a small cat",
      response_format: "b64_json"
    });
    console.log('✅ Success! Image generated.');
    console.log('Image data length:', response.data[0].b64_json.length);
  } catch (err) {
    console.error('❌ Failed!');
    console.error('Error:', err.message);
    if (err.status) console.error('Status:', err.status);
  }
}

test();
