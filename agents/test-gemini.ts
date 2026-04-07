import { DemandAgent } from "./src/agents/DemandAgent";

async function run() {
  const agent = new DemandAgent();
  
  const prompt = "I need 3kg of rice delivered to Lagos by next Friday under $15";
  console.log("---- Testing DemandAgent with Real Gemini API ----");
  console.log("Prompt:", prompt);
  
  try {
    const res = await agent.parseRequest(prompt);
    console.log("\nParsed Structured Output:");
    console.log(JSON.stringify(res, null, 2));
  } catch (error) {
    console.error("Error calling Gemini API:", error);
  }
}

run();
