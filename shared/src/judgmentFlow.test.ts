import { describe, expect, it } from "vitest";
import {
  aggregateActionsSelected,
  aggregateAwarenessSelections,
  aggregateCriteriaOrdered,
  createEmptyRounds,
  getSubmissionRounds,
  JUDGMENT_ROUND_COUNT,
  STEP_CONFIDENCE,
  STEP_CONFIRM,
  STEP_INTRO,
  stepToRoundPhase,
} from "./judgmentFlow";
import { makeSubmission } from "./test/fixtures";
import type { JudgmentRound, ParticipantSubmission } from "./types";

describe("judgmentFlow", () => {
  it("5問分の空ラウンドを作る", () => {
    const rounds = createEmptyRounds();

    expect(rounds).toHaveLength(JUDGMENT_ROUND_COUNT);
    expect(rounds[0]).toEqual({
      awarenessSelection: [],
      actionSelection: [],
      criteriaOrdered: [],
      roundNote: "",
    });
    expect(rounds[0]).not.toBe(rounds[1]);
  });

  it("step を設問番号とフェーズに変換する", () => {
    expect(stepToRoundPhase(1)).toEqual({ round: 0, phase: "awareness" });
    expect(stepToRoundPhase(2)).toEqual({ round: 0, phase: "action" });
    expect(stepToRoundPhase(3)).toEqual({ round: 0, phase: "criteria" });
    expect(stepToRoundPhase(4)).toEqual({ round: 0, phase: "note" });
    expect(stepToRoundPhase(5)).toEqual({ round: 1, phase: "awareness" });
    expect(stepToRoundPhase(STEP_CONFIDENCE - 1)).toEqual({ round: 4, phase: "note" });
  });

  it("判定フロー外の step は null を返す", () => {
    expect(stepToRoundPhase(STEP_INTRO)).toBeNull();
    expect(stepToRoundPhase(STEP_CONFIDENCE)).toBeNull();
    expect(stepToRoundPhase(STEP_CONFIRM)).toBeNull();
  });

  it("5問形式の submission は rounds をそのまま返す", () => {
    const rounds = createRounds([
      { awarenessSelection: ["A1"], actionSelection: ["X1"], criteriaOrdered: ["C1"] },
    ]);
    const submission = makeSubmission({ rounds });

    expect(getSubmissionRounds(submission)).toBe(rounds);
  });

  it("旧形式の submission は先頭ラウンドへ変換する", () => {
    const legacySubmission = {
      ...makeSubmission(),
      rounds: undefined,
      awarenessSelections: ["A1"],
      actionsSelected: ["X1"],
      criteriaOrdered: ["C1"],
      awarenessNote: "気づきメモ",
      criteriaNote: "判断メモ",
      actionsNote: "行動メモ",
    } as unknown as ParticipantSubmission;

    const rounds = getSubmissionRounds(legacySubmission);

    expect(rounds).toHaveLength(JUDGMENT_ROUND_COUNT);
    expect(rounds[0]).toEqual({
      awarenessSelection: ["A1"],
      actionSelection: ["X1"],
      criteriaOrdered: ["C1"],
      roundNote: "気づきメモ / 判断メモ / 行動メモ",
    });
    expect(rounds[1]).toEqual({
      awarenessSelection: [],
      actionSelection: [],
      criteriaOrdered: [],
      roundNote: "",
    });
  });

  it("5問分の回答を集約する", () => {
    const submission = makeSubmission({
      rounds: createRounds([
        { awarenessSelection: ["A1"], actionSelection: ["X1"], criteriaOrdered: ["品質"] },
        { awarenessSelection: ["A2"], actionSelection: ["X2"], criteriaOrdered: ["安全"] },
        { awarenessSelection: ["A3"], actionSelection: ["X3"], criteriaOrdered: ["品質"] },
      ]),
    });

    expect(aggregateAwarenessSelections(submission)).toEqual(["A1", "A2", "A3"]);
    expect(aggregateActionsSelected(submission)).toEqual(["X1", "X2", "X3"]);
    expect(aggregateCriteriaOrdered(submission)).toEqual(["品質", "安全"]);
  });
});

function createRounds(
  entries: Partial<JudgmentRound>[],
): JudgmentRound[] {
  const rounds = createEmptyRounds();
  for (const [index, entry] of entries.entries()) {
    rounds[index] = { ...rounds[index], ...entry };
  }
  return rounds;
}
