require("dotenv").config();
const OpenAI = require("openai");

async function main() {
  const token = process.env.GITHUB_TOKEN;
  
  const client = new OpenAI({
    baseURL: "https://models.github.ai/inference",
    apiKey: token
  });

  try {
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Count from 1 to 5." }],
      stream: true
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) process.stdout.write(text);
    }
    console.log("\nDone.");
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
