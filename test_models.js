require("dotenv").config();
const OpenAI = require("openai");

async function test() {
  const nvidia = new OpenAI({
    apiKey: process.env.QWEN_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });
  try {
    const res = await nvidia.chat.completions.create({
      model: "qwen/qwen3-next-80b-a3b-instruct",
      messages: [{ role: "user", content: "Say hello" }],
    });
    console.log("OK:", res.choices[0]?.message?.content);
  } catch(e) {
    console.error("ERROR:", e.message);
  }
}
test();
