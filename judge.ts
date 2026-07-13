import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";

const Verdict = z.object({
  verdict: z.enum(["approve", "reject"]),
  reason: z.string(),
});

const instructions = [
  "You review diffs produced by an autonomous coding agent before they are shipped.",
  "Reject if the diff does more than the task asked for, does not actually accomplish the task, or is empty.",
  "Otherwise approve. Be strict about scope creep.",
].join("\n");

export async function judge(client: Anthropic, task: string, diff: string) {
  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    system: instructions,
    messages: [{ role: "user", content: `## Task\n${task}\n\n## Diff\n${diff}` }],
    output_config: { format: zodOutputFormat(Verdict) },
  });
  if (!response.parsed_output) throw new Error("Judge returned no parseable verdict");
  return response.parsed_output;
}
