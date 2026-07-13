import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, relative, resolve } from "path";
import { runVerify } from "./verify.ts";

function safePath(workspace: string, path: string) {
  const abs = resolve(workspace, path);
  if (relative(workspace, abs).startsWith("..")) {
    throw new Error(`Path escapes the workspace: ${path}`);
  }
  return abs;
}

function walk(dir: string, root: string, out: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, root, out);
    else out.push(relative(root, full).replaceAll("\\", "/"));
  }
  return out;
}

export function createTools(workspace: string) {
  return [
    betaZodTool({
      name: "list_files",
      description: "List every file in the workspace.",
      inputSchema: z.object({}),
      run: async () => walk(workspace, workspace).join("\n"),
    }),
    betaZodTool({
      name: "read_file",
      description: "Read a file from the workspace.",
      inputSchema: z.object({ path: z.string() }),
      run: async ({ path }) => readFileSync(safePath(workspace, path), "utf8"),
    }),
    betaZodTool({
      name: "write_file",
      description: "Create or overwrite a file in the workspace with the full new content.",
      inputSchema: z.object({ path: z.string(), content: z.string() }),
      run: async ({ path, content }) => {
        const abs = safePath(workspace, path);
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, content);
        return `Wrote ${path}`;
      },
    }),
    betaZodTool({
      name: "run_verify",
      description:
        "Run the project's linters, builds and tests. Returns failure details, or confirms everything passed.",
      inputSchema: z.object({}),
      run: async () => runVerify(workspace).report,
    }),
  ];
}
