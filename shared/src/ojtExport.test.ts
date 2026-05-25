import { describe, expect, it } from "vitest";
import { buildOjtExportItems } from "./ojtExport";
import { makeScene, makeSubmission } from "./test/fixtures";

describe("ojtExport", () => {
  it("受講者回答と OJT チェックリストから確認項目テキストを生成する", () => {
    const scene = makeScene({
      displayName: "受入エリア",
      veteranTemplate: {
        focusPoints: [],
        criteriaPriority: [],
        recommendedActions: [],
        shareRoutes: [],
        commonMisses: [],
        instructorComment: "",
        ojtChecklist: ["品質判断の根拠を確認する", "共有先の選び方を現場で確認する"],
      },
    });
    const submission = makeSubmission({
      participantName: "山田",
      affiliation: "品質保証部",
      rounds: [
        {
          awarenessSelection: ["ラベルの違和感"],
          actionSelection: ["班長へ相談する"],
          criteriaOrdered: ["品質"],
          roundNote: "出荷前に確認したい",
        },
        ...Array.from({ length: 4 }, () => ({
          awarenessSelection: [],
          actionSelection: [],
          criteriaOrdered: [],
          roundNote: "",
        })),
      ],
    });

    const items = buildOjtExportItems({ submission, scene });

    expect(items).toEqual(expect.arrayContaining([
      expect.stringContaining("品質判断の根拠を確認する"),
      expect.stringContaining("共有先の選び方を現場で確認する"),
    ]));
    expect(items.join("\n")).toContain("山田");
    expect(items.join("\n")).toContain("受入エリア");
    expect(items.join("\n")).toContain("品質");
    expect(items.join("\n")).toContain("班長へ相談する");
  });

  it("OJT チェックリストが空でもクラッシュせず、回答から最低限の確認項目を返す", () => {
    const scene = makeScene({
      veteranTemplate: {
        focusPoints: [],
        criteriaPriority: [],
        recommendedActions: [],
        shareRoutes: [],
        commonMisses: [],
        instructorComment: "",
        ojtChecklist: [],
      },
    });
    const submission = makeSubmission({
      rounds: [
        {
          awarenessSelection: ["記録漏れ"],
          actionSelection: ["記録に残す"],
          criteriaOrdered: ["記録・証跡"],
          roundNote: "",
        },
        ...Array.from({ length: 4 }, () => ({
          awarenessSelection: [],
          actionSelection: [],
          criteriaOrdered: [],
          roundNote: "",
        })),
      ],
    });

    const items = buildOjtExportItems({ submission, scene });

    expect(items.length).toBeGreaterThan(0);
    expect(items.join("\n")).toContain("記録・証跡");
  });

  it("生成テキストには不正解などのスコア表現を含めない", () => {
    const items = buildOjtExportItems({
      scene: makeScene(),
      submission: makeSubmission(),
    });

    expect(items.join("\n")).not.toMatch(/不正解|正解|点数|スコア/);
  });
});
