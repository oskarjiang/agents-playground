import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const dir = mkdtempSync(join(tmpdir(), "clonk-demo-"));

writeFileSync(
  join(dir, "package.json"),
  JSON.stringify(
    { name: "clonk-demo", type: "module", scripts: { test: "node --test" } },
    null,
    2
  )
);
writeFileSync(join(dir, "math.js"), "export function add(a, b) {\n  return a - b;\n}\n");
writeFileSync(
  join(dir, "math.test.js"),
  [
    'import test from "node:test";',
    'import assert from "node:assert";',
    'import { add } from "./math.js";',
    "",
    'test("add", () => {',
    "  assert.strictEqual(add(2, 3), 5);",
    "});",
    "",
  ].join("\n")
);

const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });
git("init", "--quiet", "-b", "main");
git("add", "-A");
git("commit", "--quiet", "-m", "Initial commit");

console.log(`Demo repo with a failing test created at:\n  ${dir}`);
console.log(`\nRun Clonk against it:\n  npx tsx clonk/index.ts "${dir}" "The add function in math.js is broken and its test fails. Fix it."`);
