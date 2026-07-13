import { execFileSync, execSync } from "child_process";
import { existsSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export function createWorkspace(repoPath: string) {
  const dir = mkdtempSync(join(tmpdir(), "clonk-"));
  execFileSync("git", ["clone", "--quiet", repoPath, dir], { stdio: "pipe" });
  if (existsSync(join(dir, "package.json"))) {
    execSync("npm install --no-audit --no-fund", { cwd: dir, stdio: "pipe" });
  }
  return dir;
}
