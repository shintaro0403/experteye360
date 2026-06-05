/**
 * 受講者・管理者の build 成果物を GitHub Pages 用 1 ツリーにまとめる。
 *
 * Usage:
 *   VITE_SHEET_API_BASE=... VITE_CLIENT_ID=lipronext-demo npm run build:pages
 *
 * GitHub Actions では VITE_PAGES_REPO=experteye360 を付与。
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { appBasePath } from "./pages-base.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "dist-pages");
const pagesRepo = process.env.VITE_PAGES_REPO?.trim() || "experteye360";

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

if (!process.env.VITE_SHEET_API_BASE?.trim()) {
  fail("VITE_SHEET_API_BASE が未設定です（GitHub Variables または手元の環境変数）。");
}

const buildEnv = {
  ...process.env,
  VITE_PAGES_REPO: pagesRepo,
  VITE_STORAGE_BACKEND: process.env.VITE_STORAGE_BACKEND?.trim() || "sheet",
  VITE_CLIENT_ID: process.env.VITE_CLIENT_ID?.trim() || "lipronext-demo",
};

function runBuild(appDir) {
  const result = spawnSync("npm", ["run", "build"], {
    cwd: path.join(rootDir, appDir),
    env: buildEnv,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

runBuild("participant-web");
runBuild("admin-web");

cpSync(path.join(rootDir, "participant-web", "dist"), path.join(outDir, "participant"), {
  recursive: true,
});
cpSync(path.join(rootDir, "admin-web", "dist"), path.join(outDir, "admin"), {
  recursive: true,
});

const participantBase = appBasePath("participant", pagesRepo);
const adminBase = appBasePath("admin", pagesRepo);

writeFileSync(
  path.join(outDir, "index.html"),
  `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ExpertEye360</title>
</head>
<body>
  <h1>ExpertEye360</h1>
  <ul>
    <li><a href="${participantBase}">受講者</a></li>
    <li><a href="${adminBase}">管理者</a></li>
    <li><a href="${participantBase}embed-preview.html">受講者（埋め込み確認）</a></li>
    <li><a href="${adminBase}embed-preview.html">管理者（埋め込み確認）</a></li>
  </ul>
</body>
</html>
`,
  "utf8",
);

console.log(`OK: dist-pages を生成しました（repo=${pagesRepo}）`);
console.log(`  受講者: ${participantBase}`);
console.log(`  管理者: ${adminBase}`);
