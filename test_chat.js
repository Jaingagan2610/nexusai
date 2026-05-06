const http = require('http');

const data = JSON.stringify({
  messages: [{ role: 'user', content: 'Say hello in one word' }],
  provider: 'gemini'
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/chat/stream',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

console.log('Sending test message to /api/chat/stream...\n');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}\n`);
  
  let fullBody = '';
  res.on('data', (chunk) => {
    const text = chunk.toString();
    fullBody += text;
    process.stdout.write(text);
  });
  
  res.on('end', () => {
    console.log('\n\n--- STREAM ENDED ---');
    if (fullBody.includes('"type":"error"')) {
      console.log('⚠️ Server returned an error event. Check the output above.');
    }
    if (fullBody.includes('"type":"delta"') || fullBody.includes('"type":"done"')) {
      console.log('✅ Streaming is working!');
    }
    if (fullBody === '') {
      console.log('❌ Empty response — server returned nothing.');
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Connection failed:', err.message);
});

req.write(data);
req.end();
