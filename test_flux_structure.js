require('dotenv').config();
const https = require('https');

async function test() {
  const url = new URL('https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell');
  const payload = JSON.stringify({
    prompt: "a small cat",
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

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('Artifacts structure:', JSON.stringify(data.artifacts[0], (key, value) => key === 'base64' ? value.slice(0, 50) + '...' : value, 2));
      } catch (e) {
        console.error('Failed to parse:', body);
      }
    });
  });

  req.write(payload);
  req.end();
}

test();
