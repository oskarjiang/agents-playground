import "dotenv/config";
import { Agent, run } from "@openai/agents";

const agent = new Agent({
  name: "Assistant",
  instructions: "You are a helpful assistant",
});

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set. Check your .env file.");
  process.exit(1);
}

const result = await run(
  agent,
  "Write a haiku about recursion in programming."
);
console.log(result.finalOutput);

// Code within the code,
// Functions calling themselves,
// Infinite loop's dance.
