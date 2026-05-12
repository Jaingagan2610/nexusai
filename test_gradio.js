async function test() {
  console.log("Loading Gradio Client...");
  const { Client } = await import("@gradio/client");
  console.log("Connecting to Gradio Space...");
  try {
    const app = await Client.connect("multimodalart/zeroscope-v2");
    console.log("Connected! Submitting predict request...");
    const result = await app.predict("/predict", [
      "A golden retriever running through a lush green field.", // prompt
      null, // negative_prompt
      40,   // num_inference_steps
      0,    // seed
    ]);
    console.log("Result:", result);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
