import fs from "fs";

const lines = fs.readFileSync(
  "C:/Users/skiku/.cursor/projects/c-Users-kikuta-private-ExpertEye360/agent-transcripts/b38d4997-9b22-4564-bfdc-9029a40f8cb7/b38d4997-9b22-4564-bfdc-9029a40f8cb7.jsonl",
  "utf8",
).split("\n");

let best = null;
for (const line of lines) {
  if (!line.includes("Refined White & Navy")) continue;
  try {
    const j = JSON.parse(line);
    for (const c of j.message?.content || []) {
      if (c.type === "tool_use" && c.name === "Write" && c.input?.contents) {
        const t = c.input.contents;
        if (t.includes("Refined White & Navy") && t.includes(".p-shell")) {
          if (!best || t.length > best.length) best = t;
        }
      }
    }
  } catch {
    /* skip */
  }
}

if (!best) {
  console.error("not found");
  process.exit(1);
}

fs.writeFileSync(
  "c:/Users/kikuta-private/ExpertEye360/scripts/_lite-final-participant.css",
  best,
);
console.log("wrote", best.length);
