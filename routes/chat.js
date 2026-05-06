// =============================================
//   /api/chat  — Anthropic Chat Route
//   Supports both streaming and normal modes
// =============================================

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const router = express.Router();

// Initialize Anthropic client (reads ANTHROPIC_API_KEY from env)
const anthropic = new Anthropic();

// ── Validation helpers ────────────────────────
function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'messages must be a non-empty array';
  }
  for (const msg of messages) {
    if (!['user', 'assistant'].includes(msg.role)) {
      return `Invalid role "${msg.role}". Must be "user" or "assistant"`;
    }
    if (typeof msg.content !== 'string' || !msg.content.trim()) {
      return 'Each message must have a non-empty string content';
    }
  }
  return null;
}

// ── POST /api/chat  (standard response) ───────
router.post('/', async (req, res) => {
  const { messages, system, stream } = req.body;

  // Validate
  const validationError = validateMessages(messages);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not configured on the server. Add it to your .env file.',
    });
  }

  const systemPrompt = system || 'You are NexusAI, an expert AI assistant specializing in programming, debugging, and software development. Write clean, well-commented code. Provide thorough explanations. Never cut answers short.';

  // ── STREAMING mode ────────────────────────
  if (stream === true) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

    try {
      const streamResp = anthropic.messages.stream({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 8000,
        system: systemPrompt,
        messages,
      });

      streamResp.on('text', (text) => {
        res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
      });

      streamResp.on('message', (message) => {
        res.write(`data: ${JSON.stringify({ type: 'done', usage: message.usage })}\n\n`);
        res.end();
      });

      streamResp.on('error', (err) => {
        // Gracefully handle client aborts
        if (err.name === 'APIUserAbortError' || err.message?.includes('aborted')) {
          console.log('💡 Request aborted by client.');
          if (!res.writableEnded) res.end();
          return;
        }
        console.error('Stream error:', err.message);
        res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
        if (!res.writableEnded) res.end();
      });

      // Handle client disconnect
      req.on('close', () => streamResp.abort());

    } catch (err) {
      console.error('❌ Streaming setup error:', err.message);
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }

    return;
  }

  // ── STANDARD mode ─────────────────────────
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 8000,
      system: systemPrompt,
      messages,
    });

    res.json({
      content: response.content[0]?.text || '',
      usage: response.usage,
      model: response.model,
    });

  } catch (err) {
    console.error('❌ Anthropic API error:', err.message);

    // Friendly error messages
    if (err.status === 401) {
      return res.status(401).json({ error: 'Invalid API key. Check your ANTHROPIC_API_KEY in .env' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' });
    }
    if (err.status === 500) {
      return res.status(502).json({ error: 'Anthropic API is having issues. Try again shortly.' });
    }

    res.status(500).json({ error: err.message || 'Unknown server error' });
  }
});

module.exports = router;
