import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { resolve } from "path";
import { createWorkspace } from "./workspace.ts";
import { runCodingSession } from "./agent.ts";
import { runVerify } from "./verify.ts";
import { judge } from "./judge.ts";
import { deliver, stagedDiff } from "./delivery.ts";

const MAX_TURNS = 15;
const MAX_SESSIONS = 3;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Check your .env file.");
  process.exit(1);
}

const [repoPath, ...taskWords] = process.argv.slice(2);
const task = taskWords.join(" ");
if (!repoPath || !task) {
  console.error('Usage: npm start -- <path-to-git-repo> "<task>"');
  process.exit(1);
}

const client = new Anthropic();
const workspace = createWorkspace(resolve(repoPath));
console.log(`Sandboxed workspace: ${workspace}`);
let feedback = "";

for (let session = 1; session <= MAX_SESSIONS; session++) {
  console.log(`\n=== Session ${session}/${MAX_SESSIONS} ===`);
  const prompt = feedback
    ? `${task}\n\nYour previous attempt is still in the workspace but was rejected:\n${feedback}`
    : task;

  const result = await runCodingSession(client, workspace, prompt, MAX_TURNS);
  if (result.ranOutOfTurns) {
    feedback = "You ran out of turns. Continue from where you left off, more efficiently.";
    console.log("Session ran out of turns.");
    continue;
  }
  console.log(`\nAgent: ${result.text}`);

  const verification = runVerify(workspace);
  if (!verification.ok) {
    feedback = `Verification failed:\n${verification.report}`;
    console.log("Verification failed, retrying.");
    continue;
  }

  const diff = stagedDiff(workspace);
  const verdict = await judge(client, task, diff);
  console.log(`\nJudge: ${verdict.verdict} — ${verdict.reason}`);
  if (verdict.verdict === "reject") {
    feedback = `A reviewer rejected your change: ${verdict.reason}`;
    continue;
  }

  const branch = deliver(workspace, task);
  console.log(`\nDelivered branch "${branch}" back to the target repo.`);
  console.log(`Review it there with: git diff main...${branch}`);
  process.exit(0);
}

console.error(`\nGave up after ${MAX_SESSIONS} sessions.`);
process.exit(1);
