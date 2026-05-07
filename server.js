// =============================================
//   NexusAI Backend Server
//   Node.js + Express + Anthropic SDK
// =============================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const Groq = require("groq-sdk");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

process.on('unhandledRejection', (reason, promise) => {
  // Ignore Anthropic abort errors as they are expected when a client disconnects
  const isAbortError = (reason && (
    reason.name === 'APIUserAbortError' || 
    reason.message?.includes('aborted') || 
    (reason.constructor && reason.constructor.name === 'APIUserAbortError')
  ));
  if (isAbortError) {
    return; 
  }
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ── Anthropic Client ──────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── Gemini Client ─────────────────────────────
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ── OpenAI Client ─────────────────────────────
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ── Groq Client ─────────────────────────────
const groq = process.env.GROQ_API_KEY 
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// ── NVIDIA / Qwen Client ──────────────────────
const nvidia = process.env.QWEN_API_KEY
  ? new OpenAI({
      apiKey: process.env.QWEN_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    })
  : null;

// ── Llama 3.3 (NVIDIA) Client ──────────────────
const llama = process.env.LLAMA_API_KEY
  ? new OpenAI({
      apiKey: process.env.LLAMA_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    })
  : null;

// ── Flux (Image Gen) Client ──────────────────
const fluxClient = process.env.FLUX_API_KEY
  ? new OpenAI({
      apiKey: process.env.FLUX_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    })
  : null;

// ── Middleware ────────────────────────────────
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ── Health Check ──────────────────────────────
app.get("/api/health", (req, res) => {
  const anthropicKeySet = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "your_api_key_here";
  const geminiKeySet = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_api_key_here";
  const openaiKeySet = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your_api_key_here";
  const groqKeySet = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your_api_key_here";
  
  res.json({
    status: "ok",
    providers: {
      anthropic: {
        status: anthropicKeySet ? "ready" : "missing_key",
        model: "claude-3-5-sonnet-20240620"
      },
      gemini: {
        status: geminiKeySet ? "ready" : "missing_key",
        model: "gemini-flash-latest"
      },
      openai: {
        status: openaiKeySet ? "ready" : "missing_key",
        model: "gpt-4o-mini"
      },
      groq: {
        status: groqKeySet ? "ready" : "missing_key",
        model: "llama-3.2-3b-preview"
      },
      qwen: {
        status: !!process.env.QWEN_API_KEY ? "ready" : "missing_key",
        model: "qwen/qwen2.5-coder-32b-instruct"
      },
      llama33: {
        status: !!process.env.LLAMA_API_KEY ? "ready" : "missing_key",
        model: "meta/llama-3.3-70b-instruct"
      }
    },
    timestamp: new Date().toISOString(),
  });
});

// ── Chat Endpoint (Streaming) ─────────────────
app.post("/api/chat/stream", async (req, res) => {
  const { messages, system, provider = "anthropic" } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (data) => {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const cleanMessages = [
      { role: "system", content: system || "You are NexusAI, a world-class programming assistant." },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    // ── ANTHROPIC STREAMING ───────────────────
    if (provider === "anthropic") {
      console.log('📡 Starting Anthropic stream...');
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("Anthropic API key not configured.");
      
      const anthropicParams = {
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 8192,
        system: system || `You are NexusAI, a world-class programming assistant.`,
        messages: messages.map(m => {
          if (m.attachment) {
            return {
              role: m.role,
              content: [
                { type: "text", text: m.content },
                { type: "image", source: { type: "base64", media_type: m.attachment.type, data: m.attachment.data } }
              ]
            };
          }
          return { role: m.role, content: m.content };
        }),
        stream: true,
      };

      try {
        const stream = await anthropic.messages.create(anthropicParams);
        
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta?.text) {
            sendEvent({ type: "delta", text: event.delta.text });
          } else if (event.type === 'message_stop') {
            sendEvent({ type: "done" });
          }
        }
        
        if (!res.writableEnded) res.end();
        console.log('✅ Anthropic stream completed.');
      } catch (err) {
        console.error("❌ Anthropic SDK Error:", err.message);
        if (!res.writableEnded) {
          sendEvent({ type: "error", message: err.message });
          res.end();
        }
      }
      return;
    }

    // ── GEMINI STREAMING ──────────────────────
    if (provider === "gemini") {
      console.log('📡 Starting Gemini stream...');
      if (!genAI) throw new Error("Gemini API key not configured.");
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const historyArr = messages.slice(0, -1).map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));
      const lastMsg = messages[messages.length - 1];
      const chat = model.startChat({ history: historyArr });
      const result = await chat.sendMessageStream(lastMsg.content);
      for await (const chunk of result.stream) {
        sendEvent({ type: "delta", text: chunk.text() });
      }
      console.log('✅ Gemini stream completed.');
    }

    // ── OPENAI/GROQ/NVIDIA (Iterator-based) ─────
    else {
      let client, modelId, params = {};
      console.log(`📡 Starting ${provider} stream...`);
      
      if (provider === "openai") {
        if (!openai) throw new Error("OpenAI key not set.");
        client = openai; modelId = "gpt-4o-mini";
      } else if (provider === "groq") {
        if (!groq) throw new Error("Groq key not set.");
        client = groq; modelId = "llama-3.2-11b-vision-preview";
      } else if (provider === "qwen") {
        if (!nvidia) throw new Error("NVIDIA key not set.");
        client = nvidia; modelId = "qwen/qwen2.5-coder-32b-instruct";
      } else if (provider === "llama33") {
        if (!llama) throw new Error("Llama 3.3 key not set.");
        client = llama; modelId = "meta/llama-3.3-70b-instruct";
        params = { temperature: 0.2, top_p: 0.7, max_tokens: 1024 };
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }

      const stream = await client.chat.completions.create({
        model: modelId,
        messages: cleanMessages,
        stream: true,
        ...params
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) sendEvent({ type: "delta", text });
      }
      console.log(`✅ ${provider} stream completed.`);
    }

    // Finalize response for iterator-based providers
    sendEvent({ type: "done" });
    if (!res.writableEnded) res.end();
  } catch (err) {
    console.error('❌ Chat error:', err.message);
    if (!res.writableEnded) {
      sendEvent({ type: "error", message: err.message });
      res.end();
    }
  }
});

// ── Chat Endpoint (Non-streaming, full response) ──
app.post("/api/chat", async (req, res) => {
  const { messages, system, provider = "anthropic" } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  try {
    if (provider === "anthropic") {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 8192,
        system: system || `You are NexusAI, a world-class programming assistant. 
        Your goal is to provide perfectly structured, clear, and professional answers.
        Guidelines:
        1. Use clear Markdown headings (###, ####) to organize complex topics.
        2. Use bullet points and numbered lists for readability.
        3. Use **bold text** to highlight key terms or critical instructions.
        4. Always include language identifiers in code blocks (e.g., \`\`\`javascript).
        5. Provide a concise "Explanation" or "Summary" section for technical solutions.
        6. Keep a professional yet helpful tone.`,
        messages: messages.map((m) => {
          if (m.attachment) {
            return {
              role: m.role,
              content: [
                { type: "text", text: m.content },
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: m.attachment.type,
                    data: m.attachment.data,
                  },
                },
              ],
            };
          }
          return { role: m.role, content: m.content };
        }),
      });
      return res.json({
        content: response.content[0]?.text || "",
        usage: response.usage,
      });
    } 
    
    if (provider === "gemini") {
      if (!genAI) throw new Error("Gemini API key not configured.");
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      const history = messages.slice(0, -1).map(m => {
        const parts = [{ text: m.content }];
        if (m.attachment) {
          parts.push({ inlineData: { data: m.attachment.data, mimeType: m.attachment.type } });
        }
        return {
          role: m.role === "assistant" ? "model" : "user",
          parts: parts
        };
      });
      const lastMsg = messages[messages.length - 1];
      const lastMessageParts = [{ text: lastMsg.content }];
      if (lastMsg.attachment) {
        lastMessageParts.push({ inlineData: { data: lastMsg.attachment.data, mimeType: lastMsg.attachment.type } });
      }

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMessageParts);
      const response = await result.response;
      
      return res.json({
        content: response.text(),
      });
    }

    if (provider === "openai") {
      if (!openai) throw new Error("OpenAI API key not configured.");
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system || `You are NexusAI, a world-class programming assistant. 
        Your goal is to provide perfectly structured, clear, and professional answers.
        Guidelines:
        1. Use clear Markdown headings (###, ####) to organize complex topics.
        2. Use bullet points and numbered lists for readability.
        3. Use **bold text** to highlight key terms or critical instructions.
        4. Always include language identifiers in code blocks (e.g., \`\`\`javascript).
        5. Provide a concise "Explanation" or "Summary" section for technical solutions.
        6. Keep a professional yet helpful tone.` },
          ...messages.map(m => {
            if (m.attachment) {
              return {
                role: m.role,
                content: [
                  { type: "text", text: m.content },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${m.attachment.type};base64,${m.attachment.data}`,
                    },
                  },
                ],
              };
            }
            return { role: m.role, content: m.content };
          })
        ],
      });
      return res.json({
        content: response.choices[0]?.message?.content || "",
      });
    }

    if (provider === "groq") {
      if (!groq) throw new Error("Groq API key not configured.");
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: system || `You are NexusAI, a world-class programming assistant. 
        Your goal is to provide perfectly structured, clear, and professional answers.
        Guidelines:
        1. Use clear Markdown headings (###, ####) to organize complex topics.
        2. Use bullet points and numbered lists for readability.
        3. Use **bold text** to highlight key terms or critical instructions.
        4. Always include language identifiers in code blocks (e.g., \`\`\`javascript).
        5. Provide a concise "Explanation" or "Summary" section for technical solutions.
        6. Keep a professional yet helpful tone.` },
          ...messages.map(m => {
            if (m.attachment) {
              return {
                role: m.role,
                content: [
                  { type: "text", text: m.content },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${m.attachment.type};base64,${m.attachment.data}`,
                    },
                  },
                ],
              };
            }
            return { role: m.role, content: m.content };
          })
        ],
        model: "llama-3.2-11b-vision-preview",
      });
      return res.json({
        content: response.choices[0]?.message?.content || "",
      });
    }

    if (provider === "qwen") {
      if (!nvidia) throw new Error("Qwen/NVIDIA API key not configured.");
      const response = await nvidia.chat.completions.create({
        model: "qwen/qwen2.5-coder-32b-instruct",
        messages: [
          { role: "system", content: system || "You are NexusAI, powered by Qwen." },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
      });
      return res.json({
        content: response.choices[0]?.message?.content || "",
      });
    }

    if (provider === "llama33") {
      if (!llama) throw new Error("Llama 3.3 (NVIDIA) API key not configured.");
      const response = await llama.chat.completions.create({
        model: "meta/llama-3.3-70b-instruct",
        messages: [
          { role: "system", content: system || "You are NexusAI, powered by Llama 3.3." },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
      });
      return res.json({
        content: response.choices[0]?.message?.content || "",
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Image Generation Endpoint ─────────────────
app.post("/api/generate-image", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const apiKey = process.env.FLUX_API_KEY || process.env.QWEN_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: "NVIDIA/Flux API key not configured for image generation." });
  }

  // NVIDIA GenAI visual models use a specific path-based endpoint
  // Using FLUX.1-schnell as a high-speed, reliable default for the Catalog
  const url = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('NVIDIA Error:', data);
      throw new Error(data.detail || data.message || `API Error: ${response.status}`);
    }

    // NVIDIA GenAI models return data in an 'artifacts' array
    const base64Image = data.artifacts?.[0]?.base64;
    
    if (!base64Image) {
      console.error('Unexpected data structure:', data);
      throw new Error("No image data received from NVIDIA (artifacts missing).");
    }

    res.json({ image: base64Image });
  } catch (err) {
    console.error('❌ Image gen error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Video Generation Endpoint (Cloudflare) ────
app.post("/api/generate-video", async (req, res) => {
  const { prompt, resolution = "720P", ratio = "16:9", duration = 5 } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const apiKey = (process.env.VIDEO_GEN_API_KEY || "").trim();
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();

  if (!apiKey || !accountId || accountId === "your_account_id_here") {
    return res.status(500).json({ error: "Cloudflare Account ID or Token not configured in .env file." });
  }

  // Cloudflare Workers AI REST API endpoint
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/alibaba/hh1-t2v`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        resolution: resolution,
        ratio: ratio,
        duration: duration,
        watermark: false
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Cloudflare Video Error:', data);
      throw new Error(data.errors?.[0]?.message || `API Error: ${response.status}`);
    }

    // Success response
    res.json(data.result);
  } catch (err) {
    console.error('❌ Video gen error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Text to Speech Endpoint ──────────────────
app.post("/api/tts", async (req, res) => {
  const { text, voice = "aria" } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });

  const apiKey = process.env.TTS_API_KEY || process.env.QWEN_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "TTS API key not configured." });
  }

  // NVIDIA Magpie-TTS hosted REST endpoint (path-based)
  const url = "https://ai.api.nvidia.com/v1/audio/nvidia/magpie-tts-multilingual";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "audio/wav", // NVIDIA often returns raw audio
      },
      body: JSON.stringify({
        text: text,
        voice: voice,
        language_code: "en-US"
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('NVIDIA TTS Error:', errorData);
      throw new Error(errorData.detail || errorData.message || `API Error: ${response.status}`);
    }

    // Get audio buffer and convert to base64 for easy transport to frontend
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    res.json({ audio: base64Audio });
  } catch (err) {
    console.error('❌ TTS Error:', err.message);
    if (!res.writableEnded) {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── Serve Frontend ────────────────────────────
app.get("/chat", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chat.html"));
});

app.get("/generate", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "generate.html"));
});

app.get("/video", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "video.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start Server ──────────────────────────────
app.listen(PORT, () => {
  console.log("\n🚀 NexusAI Server Running!");
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Health:   http://localhost:${PORT}/api/health`);
  const anthropicSet = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "your_api_key_here";
  const geminiSet = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_api_key_here";
  const openaiSet = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your_api_key_here";
  const groqSet = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your_api_key_here";
  const qwenSet = !!process.env.QWEN_API_KEY && process.env.QWEN_API_KEY !== "your_api_key_here";
  const fluxSet = !!process.env.FLUX_API_KEY && process.env.FLUX_API_KEY !== "your_api_key_here";
  console.log(`   Claude:   ${anthropicSet ? "✅ Ready" : "❌ Not Set"}`);
  console.log(`   Gemini:   ${geminiSet ? "✅ Ready" : "❌ Not Set"}`);
  console.log(`   OpenAI:   ${openaiSet ? "✅ Ready" : "❌ Not Set"}`);
  console.log(`   Groq:     ${groqSet ? "✅ Ready" : "❌ Not Set"}`);
  console.log(`   Qwen:     ${qwenSet ? "✅ Ready" : "❌ Not Set"}`);
  console.log(`   Flux:     ${fluxSet ? "✅ Ready" : "❌ Not Set"}\n`);
});
