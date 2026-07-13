import { execFileSync } from "child_process";

function git(workspace: string, ...args: string[]) {
  return execFileSync("git", args, { cwd: workspace, encoding: "utf8" });
}

export function stagedDiff(workspace: string) {
  git(workspace, "add", "-A");
  return git(workspace, "diff", "--cached");
}

export function deliver(workspace: string, task: string) {
  const branch = `clonk/${Date.now()}`;
  git(workspace, "checkout", "-q", "-b", branch);
  git(workspace, "commit", "-q", "-m", `Clonk: ${task.slice(0, 72)}`);
  git(workspace, "push", "-q", "origin", branch);
  return branch;
}
