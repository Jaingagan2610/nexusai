require('dotenv').config();
const https = require('https');

async function test() {
  // Testing the flux-2-klein-4b endpoint on ai.api.nvidia.com
  const url = new URL('https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux-2-klein-4b');
  const payload = JSON.stringify({
    prompt: "a small cat",
    response_format: "b64_json"
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

  console.log('Testing Flux 2 Klein 4B direct generation...');
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
