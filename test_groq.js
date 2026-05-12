require("dotenv").config();
const Groq = require("groq-sdk");

async function test() {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const models = await groq.models.list();
  const active = models.data.map(m => m.id).sort();
  console.log("Available Groq models:\n", active.join("\n"));
}
test();
