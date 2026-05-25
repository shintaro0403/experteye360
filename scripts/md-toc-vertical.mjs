/**
 * Markdown: 目次追加 + 横並び表 → 縦ブロック（DOC-ALIGNMENT §0）
 * Usage: node scripts/md-toc-vertical.mjs [file.md ...]
 */
import fs from "fs";
import path from "path";

function stripInlineMd(s) {
  return s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

/** GitHub 互換に近いアンカー（既存リンク形式に合わせる） */
function headingAnchor(text) {
  let t = stripInlineMd(text);
  t = t.replace(/（[^）]*）/g, "");
  t = t.replace(/\([^)]*\)/g, "");
  t = t.replace(/[§→・、。：:（）()]/g, "");
  t = t.replace(/\./g, "");
  t = t.replace(/\s+/g, "-");
  t = t.replace(/-+/g, "-");
  t = t.replace(/^-|-$/g, "");
  return t;
}

function parseTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return null;
  const inner = trimmed.slice(1, trimmed.endsWith("|") ? -1 : undefined);
  return inner.split("|").map((c) => c.trim());
}

function isSeparatorRow(cells) {
  return cells.every((c) => /^:?-+:?$/.test(c.replace(/\s/g, "")));
}

function tableToVertical(lines, startIdx) {
  const header = parseTableRow(lines[startIdx]);
  if (!header) return { block: null, end: startIdx };
  let i = startIdx + 1;
  if (i >= lines.length) return { block: null, end: startIdx };
  const sep = parseTableRow(lines[i]);
  if (!sep || !isSeparatorRow(sep)) return { block: null, end: startIdx };

  const headers = header.map(stripInlineMd);
  const rows = [];
  i++;
  while (i < lines.length) {
    const cells = parseTableRow(lines[i]);
    if (!cells) break;
    if (isSeparatorRow(cells)) {
      i++;
      continue;
    }
    rows.push(cells);
    i++;
  }

  const out = [];
  for (const row of rows) {
    const firstRaw = (row[0] ?? "").trim();
    const first = stripInlineMd(firstRaw);
    const isIdRow = /^(TC-|JF-|C-\d|V-|ENTRY-|ADM-|L-|SH-|S-|PDF-|A-\d)/i.test(first);
    const title =
      first.length > 0 && first.length < 120
        ? isIdRow
          ? `### ${firstRaw}`
          : `#### ${firstRaw}`
        : `#### 項目`;

    out.push(title);
    out.push("");
    for (let c = 0; c < headers.length; c++) {
      const label = headers[c] || `列${c + 1}`;
      const val = (row[c] ?? "").trim() || "—";
      if (c === 0 && isIdRow) continue;
      out.push(`**${stripInlineMd(label)}** — ${val}`);
    }
    out.push("");
  }
  return { block: out.join("\n").trimEnd(), end: i };
}

function buildToc(headings) {
  const lines = ["## 目次", ""];
  for (const { level, text } of headings) {
    if (level < 2 || level > 3 || text === "目次") continue;
    const label = stripInlineMd(text);
    if (level === 3 && shouldSkipTocH3(label)) continue;
    const indent = "  ".repeat(Math.max(0, level - 2));
    const anchor = headingAnchor(text);
    lines.push(`${indent}- [${label}](#${anchor})`);
  }
  lines.push("");
  return lines.join("\n");
}

function shouldSkipTocH3(text) {
  if (/^(TC-|JF-|JR-|SQ-|C-\d|V-|ENTRY-|ADM-|PDF-|SH-\d|L-\d|D-\d\d|S-\d|SS-\d|CF-\d|SL-\d|O-\d|AL-\d|PG-\d|X-\d)/i.test(text)) {
    return true;
  }
  if (/^TC-\w+/.test(text)) return true;
  return false;
}

function findTocInsertIndex(lines) {
  let i = 0;
  if (lines[i]?.startsWith("# ")) i = 1;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## 目次")) return -1;
    if (line.startsWith("## ") || line.startsWith("### ")) return i;
    i++;
  }
  return lines.length;
}

function shouldStayH3(title) {
  const t = stripInlineMd(title);
  if (/^\d+\.\d+\s/.test(t)) return true;
  if (/^(TC-|JF-|ENTRY-|ADM-|PDF-|SH-\d|L-\d|D-\d\d)/i.test(t)) return true;
  if (/^(実装状況|受講者回答|初回セットアップ|起動)$/.test(t)) return true;
  return false;
}

function demoteSpuriousH3(content) {
  return content
    .split("\n")
    .map((line) => {
      const m = line.match(/^### (.+)$/);
      if (!m) return line;
      return shouldStayH3(m[1]) ? line : `#### ${m[1]}`;
    })
    .join("\n");
}

function processMarkdown(content) {
  content = content.replace(/\r\n/g, "\n");
  const lines = content.split("\n");
  const headings = [];
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+)$/);
    if (m && !m[2].startsWith("目次")) headings.push({ level: m[1].length, text: m[2] });
  }

  const converted = [];
  let inFence = false;
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    if (line.startsWith("```")) inFence = !inFence;
    if (!inFence) {
      const cells = parseTableRow(line);
      if (cells) {
        const next = i + 1 < lines.length ? parseTableRow(lines[i + 1]) : null;
        if (next && isSeparatorRow(next)) {
          const { block, end } = tableToVertical(lines, i);
          if (block) {
            converted.push(block);
            i = end;
            continue;
          }
        }
      }
    }
    converted.push(line);
    i++;
  }

  let result = demoteSpuriousH3(converted.join("\n"));

  {
    const resultLines = result.split("\n");
    const tocHeadings = [];
    for (const l of resultLines) {
      const m = l.match(/^(#{1,6})\s+(.+)$/);
      if (m && !m[2].startsWith("目次")) tocHeadings.push({ level: m[1].length, text: m[2] });
    }
    const toc = buildToc(tocHeadings);
    const tocStart = resultLines.findIndex((l) => l === "## 目次");
    if (tocStart >= 0) {
      let tocEnd = tocStart + 1;
      while (tocEnd < resultLines.length) {
        const l = resultLines[tocEnd];
        if (l === "---") {
          tocEnd++;
          break;
        }
        if (
          tocEnd > tocStart + 1 &&
          (l.startsWith("## ") || l.startsWith("### ")) &&
          !l.startsWith("  -")
        ) {
          break;
        }
        tocEnd++;
      }
      resultLines.splice(tocStart, tocEnd - tocStart, toc, "---", "");
    } else {
      const idx = findTocInsertIndex(resultLines);
      if (idx >= 0) resultLines.splice(idx, 0, toc, "---", "");
    }
    result = resultLines.join("\n");
  }

  return result.replace(/\n{4,}/g, "\n\n\n").replace(/\r\n/g, "\n");
}

const files = process.argv.slice(2).filter((a) => a !== "--force");
const force = process.argv.includes("--force");
if (files.length === 0) {
  console.error("Usage: node scripts/md-toc-vertical.mjs <file.md> ...");
  process.exit(1);
}

for (const file of files) {
  const abs = path.resolve(file);
  const before = fs.readFileSync(abs, "utf8");
  const after = processMarkdown(before);
  if (before !== after || force) {
    fs.writeFileSync(abs, after, "utf8");
    console.log("OK", file);
  } else {
    console.log("SKIP (no change)", file);
  }
}
