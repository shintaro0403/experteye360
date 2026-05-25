import {
  STEP_CONFIDENCE,
  STEP_INTRO,
  stepToRoundPhase,
} from "./judgmentFlow";
import type { JudgmentRound } from "./types";

export type ValidateParticipantStepInput = {
  step: number;
  participantName: string;
  affiliation: string;
  rounds: JudgmentRound[];
  confidence: number | null;
};

export function validateParticipantStep(input: ValidateParticipantStepInput): string | null {
  if (input.step === STEP_INTRO) {
    if (!input.participantName.trim()) return "名前を入力してください";
    if (!input.affiliation.trim()) return "所属を入力してください";
    return null;
  }

  if (input.step === STEP_CONFIDENCE) {
    if (input.confidence === null) return "確信度を1つ選んでください";
    return null;
  }

  const phase = stepToRoundPhase(input.step);
  if (!phase) return null;

  const roundData = input.rounds[phase.round];
  if (!roundData) return null;

  if (phase.phase === "awareness" && roundData.awarenessSelection.length === 0) {
    return "気づきカードを1つ選んでください";
  }
  if (phase.phase === "action" && roundData.actionSelection.length === 0) {
    return "共有・行動カードを1つ選んでください";
  }
  if (phase.phase === "criteria" && roundData.criteriaOrdered.length === 0) {
    return "判断基準カードを1つ選んでください";
  }
  return null;
}
