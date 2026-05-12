async function test() {
  const key = "AIzaSyDVW7fKUX6MYIJqBRA9l8jOpID_U2uolo4";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-fast-generate-001:predictLongRunning?key=${key}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instances: [{ prompt: "A golden retriever playing with a ball" }] })
    });
    const data = await res.json();
    console.log("Response:", data);
  } catch(e) {
    console.error(e);
  }
}
test();
