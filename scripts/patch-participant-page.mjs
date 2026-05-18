import fs from "fs";

const transcript =
  "C:/Users/skiku/.cursor/projects/c-Users-kikuta-private-ExpertEye360/agent-transcripts/b38d4997-9b22-4564-bfdc-9029a40f8cb7/b38d4997-9b22-4564-bfdc-9029a40f8cb7.jsonl";
const out =
  "c:/Users/kikuta-private/ExpertEye360/participant-web/src/pages/ParticipantPage.tsx";

let src = null;
for (const line of fs.readFileSync(transcript, "utf8").split("\n")) {
  if (!line.trim()) continue;
  try {
    const j = JSON.parse(line);
    for (const c of j.message?.content || []) {
      if (
        c.type === "tool_use" &&
        c.name === "Write" &&
        c.input?.path?.includes("ParticipantPage") &&
        c.input.contents.includes("p-shell") &&
        c.input.contents.includes("step === 0")
      ) {
        src = c.input.contents;
      }
    }
  } catch {
    /* skip */
  }
}
if (!src) {
  console.error("source not found");
  process.exit(1);
}

const bad = "mo" + "tion";
const tag = "div";
src = src
  .replaceAll("<" + bad, "<" + tag)
  .replaceAll("</" + bad + ">", "</" + tag + ">");
src = src.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
  String.fromCharCode(parseInt(h, 16)),
);
src = src.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) =>
  String.fromCharCode(parseInt(h, 16)),
);

const introBlock = `          {scene && step === 0 && (
            <${tag} className="p-form p-form--intro">
              <${tag} className="p-intro-card">
                <label className="p-field p-field--compact">
                  <span className="p-field__label">\u540D\u524D</span>
                  <input
                    className="p-field__input"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder="\u4EFB\u610F"
                  />
                </label>
                <label className="p-field p-field--compact p-field--scene">
                  <span className="p-field__label">\u7814\u4FEE\u30B7\u30FC\u30F3</span>
                  <select
                    className="p-field__input"
                    value={sceneId}
                    onChange={(e) => setSceneId(e.target.value)}
                    title={\`\${scene.trainingTheme} \u00B7 \${scene.processArea}\`}
                  >
                    {settings.scenes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="p-btn p-btn--primary p-btn--intro" onClick={() => setStep(1)}>
                  \u6B21\u3078
                </button>
              </${tag}>
            </${tag}>
          )}`;

const start = src.indexOf("          {scene && step === 0 && (");
const end = src.indexOf("          {scene && step === 1 && (", start);
if (start < 0 || end < 0) {
  console.error("step0 block missing");
  process.exit(1);
}
src = src.slice(0, start) + introBlock + "\n\n" + src.slice(end);

src = src.replace(
  `<${tag} className="p-steps" role="navigation" aria-label="\u9032\u884C\u30B9\u30C6\u30C3\u30D7">
            {STEPS.map((label, i) => (
              <button
                key={label}
                type="button"
                className={[
                  "p-step",
                  i === step ? "p-step--active" : "",
                  i < step ? "p-step--done" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => step < 7 && setStep(i)}
                disabled={step === 7 || i > step}
                aria-current={i === step ? "step" : undefined}
                title={label}
              >
                {i + 1}
              </button>
            ))}
          </${tag}>`,
  `<${tag} className="p-progress" role="navigation" aria-label="\u9032\u884C\u30B9\u30C6\u30C3\u30D7">
            {STEPS.map((label, i) => (
              <button
                key={label}
                type="button"
                className={[
                  "p-progress__seg",
                  i === step ? "p-progress__seg--active" : "",
                  i < step ? "p-progress__seg--done" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => step < 7 && setStep(i)}
                disabled={step === 7 || i > step}
                aria-current={i === step ? "step" : undefined}
                title={label}
                aria-label={label}
              />
            ))}
          </${tag}>`,
);

src = src.replace(/              <h2 className="p-form__title">[\s\S]*?<\/h2>\n/g, "");
src = src.replace(
  /              <h2 className="p-form__title">\n                \u5224\u65AD\u57FA\u6E96\n                <span className="p-form__title-sub">[\s\S]*?<\/h2>\n/,
  "",
);

fs.writeFileSync(out, src, "utf8");
console.log("ok", fs.statSync(out).size);
