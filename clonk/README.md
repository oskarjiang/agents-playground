# Clonk — a minimal Honk clone

A stripped-down version of [Spotify's Honk](https://engineering.atspotify.com/2025/11/spotifys-background-coding-agent-part-1): a background coding agent that takes a plain-language task, works alone in a sandbox, verifies its own work, gets reviewed by an LLM judge, and delivers the result as a branch — never touching your checkout.

Like Honk, Clonk runs on Claude (`claude-opus-4-8` via the Anthropic SDK). The coding agent uses the SDK's Tool Runner (`client.beta.messages.toolRunner`), which drives the request → execute tool → loop cycle over Clonk's own restricted tools; the judge uses `client.messages.parse` for a schema-guaranteed verdict.

## Pipeline

```
task (CLI) ──► workspace ──► agent session ──► verify ──► judge ──► delivery
                (sandbox)     (≤15 turns)        │           │        (branch)
                                  ▲              │           │
                                  └── feedback ──┴───────────┘  (≤3 sessions)
```

## Components

| File | Responsibility | Honk equivalent |
|---|---|---|
| `index.ts` | The harness: orchestrates sessions, retries with feedback, owns all gating. The agent never decides when it's done — the harness does. | Honk's harness around Claude ([Part 1](https://engineering.atspotify.com/2025/11/spotifys-background-coding-agent-part-1)) |
| `workspace.ts` | Sandbox: clones the target repo into a temp dir so the agent can never touch the original checkout. | Kubernetes pod with a containerized checkout ([Part 3](https://engineering.atspotify.com/2025/12/feedback-loops-background-coding-agents-part-3)) |
| `tools.ts` | The agent's entire world: list/read/write files (path-jail enforced) plus `run_verify`. No bash, no git, no network. | Restricted tool belt — limited git, allowlisted bash ([Part 2](https://engineering.atspotify.com/2025/11/context-engineering-background-coding-agents-part-2)) |
| `agent.ts` | The coding agent: Claude + the Tool Runner loop, with prompt discipline ("smallest change, verify after every edit") and a turn cap. | Claude + static, version-controlled prompts ([Part 2](https://engineering.atspotify.com/2025/11/context-engineering-background-coding-agents-part-2)) |
| `verify.ts` | Detects the project's checks (npm `lint`/`build`/`test`) and returns truncated failure reports. Used twice: as a tool inside the session (inner loop) and as a harness gate after it (outer loop). | The MCP verify tool + stop-hook verification ([Part 3](https://engineering.atspotify.com/2025/12/feedback-loops-background-coding-agents-part-3)) |
| `judge.ts` | LLM judge: compares the diff against the original task, rejects scope creep or empty diffs. Rejections feed back into the next session. | The judge layer that vetoes ~25% of sessions ([Part 3](https://engineering.atspotify.com/2025/12/feedback-loops-background-coding-agents-part-3)) |
| `delivery.ts` | The only code that runs git. Stages, commits on a `clonk/*` branch, pushes back to the source repo. The agent has no git access at all. | "Surrounding infrastructure handles code pushing"; PR creation ([Part 3](https://engineering.atspotify.com/2025/12/feedback-loops-background-coding-agents-part-3)) |

Key limits mirror Honk's: max 15 turns per session, max 3 sessions, verify output truncated to protect the context window.

## Try it

Needs `ANTHROPIC_API_KEY` in `.env` at the repo root.

```sh
npx tsx clonk/demo/setup-demo.ts     # creates a toy repo with a failing test, prints the command
npx tsx clonk/index.ts "<demo-path>" "The add function in math.js is broken and its test fails. Fix it."
```

On success it pushes a `clonk/<timestamp>` branch into the target repo — inspect it there with `git diff main...clonk/<timestamp>`. Works against any local git repo whose checks are npm scripts.

## Deliberately omitted

Slack/GitHub intake, Fleet Management fan-out across thousands of repos, MCP, container isolation, tracing (MLflow), prompt evaluation, and auto-merge — the "fluff" that makes Honk production-grade but obscures the fundamentals.
