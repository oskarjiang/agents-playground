import Anthropic from "@anthropic-ai/sdk";
import { createTools } from "./tools.ts";

const instructions = [
  "You are a background coding agent working alone in a sandboxed checkout of a repository.",
  "You will be given one task. Make the smallest change that fulfills it — never do more than the task asks.",
  "Explore with list_files and read_file before editing anything.",
  "After every edit, call run_verify and fix any failures it reports.",
  "You are done only when run_verify passes. Finish with a one-paragraph summary of what you changed.",
].join("\n");

export async function runCodingSession(
  client: Anthropic,
  workspace: string,
  prompt: string,
  maxTurns: number
) {
  const message = await client.beta.messages.toolRunner({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: instructions,
    tools: createTools(workspace),
    messages: [{ role: "user", content: prompt }],
    max_iterations: maxTurns,
  });
  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  return { text, ranOutOfTurns: message.stop_reason === "tool_use" };
}
