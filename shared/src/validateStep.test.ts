import { describe, expect, it } from "vitest";
import {
  createEmptyRounds,
  STEP_CONFIDENCE,
  STEP_CONFIRM,
  STEP_INTRO,
} from "./judgmentFlow";
import { validateParticipantStep } from "./validateStep";
import type { JudgmentRound } from "./types";

describe("validateParticipantStep", () => {
  it("名前が空のとき、名前の入力を求める", () => {
    expect(validateParticipantStep(baseInput({ participantName: "  " }))).toBe("名前を入力してください");
  });

  it("所属が空のとき、所属の入力を求める", () => {
    expect(validateParticipantStep(baseInput({ affiliation: "  " }))).toBe("所属を入力してください");
  });

  it("気づきカードが未選択のとき、選択を求める", () => {
    expect(validateParticipantStep(baseInput({ step: 1 }))).toBe("気づきカードを1つ選んでください");
  });

  it("共有・行動カードが未選択のとき、選択を求める", () => {
    expect(validateParticipantStep(baseInput({ step: 2, rounds: roundsWith(0, { awarenessSelection: ["A"] }) }))).toBe(
      "共有・行動カードを1つ選んでください",
    );
  });

  it("判断基準カードが未選択のとき、選択を求める", () => {
    expect(
      validateParticipantStep(
        baseInput({
          step: 3,
          rounds: roundsWith(0, { awarenessSelection: ["A"], actionSelection: ["X"] }),
        }),
      ),
    ).toBe("判断基準カードを1つ選んでください");
  });

  it("一言メモは未入力でも通過できる", () => {
    expect(validateParticipantStep(baseInput({ step: 4 }))).toBeNull();
  });

  it("確信度が未選択のとき、選択を求める", () => {
    expect(validateParticipantStep(baseInput({ step: STEP_CONFIDENCE, confidence: null }))).toBe(
      "確信度を1つ選んでください",
    );
  });

  it("送信確認などフロー外のstepは通過できる", () => {
    expect(validateParticipantStep(baseInput({ step: STEP_CONFIRM }))).toBeNull();
  });
});

function baseInput(overrides: Partial<Parameters<typeof validateParticipantStep>[0]> = {}) {
  return {
    step: STEP_INTRO,
    participantName: "山田",
    affiliation: "営業部",
    rounds: createEmptyRounds(),
    confidence: 3,
    ...overrides,
  };
}

function roundsWith(index: number, patch: Partial<JudgmentRound>): JudgmentRound[] {
  const rounds = createEmptyRounds();
  rounds[index] = { ...rounds[index], ...patch };
  return rounds;
}
