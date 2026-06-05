/**
 * Git に追跡されている .env*（*.example 除く）がないか検証する。
 * CI とローカル pre-push 用。秘密情報の誤コミット防止。
 */
import { execSync } from "node:child_process";

const tracked = execSync("git ls-files -z", { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const violations = tracked.filter((filePath) => {
  const name = filePath.split(/[/\\]/).pop() ?? filePath;
  if (!name.startsWith(".env")) return false;
  if (name.endsWith(".example")) return false;
  return true;
});

if (violations.length > 0) {
  console.error("ERROR: 次の env ファイルが Git に含まれています（コミット禁止）:");
  for (const filePath of violations) {
    console.error(`  - ${filePath}`);
  }
  console.error("");
  console.error("対処: git rm --cached <path> のあと .gitignore を確認し、再コミットしてください。");
  console.error("例として *.example のみコミット可（.env.development.example など）。");
  process.exit(1);
}

console.log("OK: 追跡ファイルに .env（*.example 除く）は含まれていません。");
