import { describe, expect, it } from "vitest";
import { buildSubmission } from "./submission";
import { createEmptyRounds, JUDGMENT_ROUND_COUNT } from "./judgmentFlow";

describe("buildSubmission", () => {
  it("5問分のroundsとtrim済みの受講者情報を保存する", () => {
    const rounds = createEmptyRounds();
    const submission = buildSubmission({
      id: "sub-1",
      createdAt: "2026-05-25T00:00:00.000Z",
      participantName: " 山田 太郎 ",
      affiliation: " 品質保証 ",
      roomId: "room-demo-1",
      sceneId: "scene-1",
      rounds,
      confidenceLevel: 4,
    });

    expect(submission.rounds).toBe(rounds);
    expect(submission.rounds).toHaveLength(JUDGMENT_ROUND_COUNT);
    expect(submission.participantName).toBe("山田 太郎");
    expect(submission.affiliation).toBe("品質保証");
    expect(submission.roomId).toBe("room-demo-1");
  });

  it("旧形式互換フィールドに5問分の選択を集約する", () => {
    const rounds = createEmptyRounds();
    rounds[0] = {
      awarenessSelection: ["A1"],
      actionSelection: ["X1"],
      criteriaOrdered: ["品質"],
      roundNote: "",
    };
    rounds[1] = {
      awarenessSelection: ["A2"],
      actionSelection: ["X2"],
      criteriaOrdered: ["安全"],
      roundNote: "",
    };

    const submission = buildSubmission(baseInput({ rounds }));

    expect(submission.awarenessSelections).toEqual(["A1", "A2"]);
    expect(submission.actionsSelected).toEqual(["X1", "X2"]);
    expect(submission.criteriaOrdered).toEqual(["品質", "安全"]);
    expect(submission.attentionSelected).toEqual([]);
  });

  it("一言メモは設問番号つきで空でないものだけを連結する", () => {
    const rounds = createEmptyRounds();
    rounds[0] = { ...rounds[0], roundNote: "  ラベル位置を確認した  " };
    rounds[2] = { ...rounds[2], roundNote: "記録を残す" };

    const submission = buildSubmission(baseInput({ rounds }));

    expect(submission.awarenessNote).toBe("【設問1】ラベル位置を確認した\n【設問3】記録を残す");
    expect(submission.criteriaNote).toBe("");
    expect(submission.actionsNote).toBe("");
  });
});

function baseInput(overrides: Partial<Parameters<typeof buildSubmission>[0]> = {}) {
  return {
    id: "sub-1",
    createdAt: "2026-05-25T00:00:00.000Z",
    participantName: "山田",
    affiliation: "営業部",
    roomId: "room-demo-1",
    sceneId: "scene-1",
    rounds: createEmptyRounds(),
    confidenceLevel: 3,
    ...overrides,
  };
}
