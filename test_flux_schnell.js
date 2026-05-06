require('dotenv').config();
const https = require('https');

async function test() {
  // Use the EXACT URL pattern from the search result
  const url = new URL('https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell');
  const payload = JSON.stringify({
    prompt: "a small cat",
    // Note: Some GenAI endpoints use different parameter names
  });

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.FLUX_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  console.log('Testing Flux.1-schnell direct generation...');
  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      try {
        const data = JSON.parse(body);
        if (res.statusCode === 200) {
          console.log('✅ Success! Image generated.');
          console.log('Keys in response:', Object.keys(data));
        } else {
          console.error('❌ Failed!');
          console.error('Error:', JSON.stringify(data, null, 2));
        }
      } catch (e) {
        console.error('❌ Failed to parse response:', body);
      }
    });
  });

  req.on('error', (e) => console.error('❌ Error:', e.message));
  req.write(payload);
  req.end();
}

test();
