import fs from "fs";

const transcript = fs.readFileSync(
  "C:/Users/skiku/.cursor/projects/c-Users-kikuta-private-ExpertEye360/agent-transcripts/b38d4997-9b22-4564-bfdc-9029a40f8cb7/b38d4997-9b22-4564-bfdc-9029a40f8cb7.jsonl",
  "utf8",
);

// Find initial Write with Refined White & Navy
let css = null;
for (const line of transcript.split("\n")) {
  if (!line.includes("Refined White & Navy") || !line.includes(".p-shell")) continue;
  try {
    const j = JSON.parse(line);
    for (const c of j.message?.content || []) {
      if (c.type === "tool_use" && c.name === "Write" && c.input?.contents?.includes(".p-shell")) {
        const t = c.input.contents;
        if (t.includes("Refined White & Navy")) css = t;
      }
    }
  } catch {
    /* skip */
  }
}

if (!css) {
  console.error("base css missing");
  process.exit(1);
}

// Apply StrReplace patches to participant-web index.css in order
const patches = [];
for (const line of transcript.split("\n")) {
  if (!line.includes("participant-web\\\\src\\\\index.css") && !line.includes("participant-web/src/index.css"))
    continue;
  if (!line.includes("StrReplace")) continue;
  try {
    const j = JSON.parse(line);
    for (const c of j.message?.content || []) {
      if (
        c.type === "tool_use" &&
        c.name === "StrReplace" &&
        c.input?.path?.includes("index.css") &&
        c.input.old_string &&
        c.input.new_string
      ) {
        patches.push({ old: c.input.old_string, new: c.input.new_string });
      }
    }
  } catch {
    /* skip */
  }
}

let applied = 0;
for (const p of patches) {
  if (!css.includes(p.old)) continue;
  css = css.replace(p.old, p.new);
  applied++;
}

const out = "c:/Users/kikuta-private/ExpertEye360/shared/styles/participant-app.css";
let final = css.replace(
  /^\/\* ===== ExpertEye360 Participant[\s\S]*?\*\/\n\n/,
  "/* 受講者 UI（lite 最終版・25%帯） */\n\n",
);

final = final.replace(/\.warn \{ composes: p-warn; \}/, "");
if (!final.includes(".p-nav--center")) {
  final = final.replace(
    /\.p-nav \{\n  flex-shrink: 0;\n  display: flex;\n  gap: 0\.45rem;\n  margin-top: auto;\n  padding-top: 0\.35rem;\n\}/,
    `.p-nav {
  flex-shrink: 0;
  display: flex;
  gap: 0.45rem;
  margin-top: auto;
  padding-top: 0.35rem;
}

.p-nav--center {
  justify-content: center;
  width: 100%;
}`,
  );
}

fs.writeFileSync(out, final, "utf8");
console.log("patches applied", applied, "of", patches.length);
console.log("has treka", final.includes("p-chip__frame"));
console.log("has flex center", final.includes("justify-content: center"));
console.log("len", final.length);
