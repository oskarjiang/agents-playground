import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

type Check = { name: string; cmd: string };

function detectChecks(workspace: string): Check[] {
  const checks: Check[] = [];
  const pkgPath = join(workspace, "package.json");
  if (existsSync(pkgPath)) {
    const scripts = JSON.parse(readFileSync(pkgPath, "utf8")).scripts ?? {};
    for (const name of ["lint", "build", "test"]) {
      if (scripts[name]) checks.push({ name, cmd: `npm run ${name}` });
    }
  }
  return checks;
}

export function runVerify(workspace: string): { ok: boolean; report: string } {
  const checks = detectChecks(workspace);
  if (checks.length === 0) return { ok: true, report: "No checks detected in this project." };
  const failures: string[] = [];
  for (const check of checks) {
    try {
      execSync(check.cmd, { cwd: workspace, stdio: "pipe", encoding: "utf8", timeout: 120_000 });
    } catch (err: any) {
      const output = [err.stdout, err.stderr].filter(Boolean).join("\n");
      failures.push(`### Check "${check.name}" failed\n${output.slice(-3000)}`);
    }
  }
  if (failures.length === 0) return { ok: true, report: "All checks passed." };
  return { ok: false, report: failures.join("\n\n") };
}
