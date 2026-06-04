import {
  STEP_CONFIDENCE,
  STEP_INTRO,
  stepToRoundPhase,
} from "./judgmentFlow";
import type { JudgmentRound } from "./types";

export const PARTICIPANT_NAME_MAX_LENGTH = 10;
export const AFFILIATION_MAX_LENGTH = 10;
export const ROUND_NOTE_MAX_LENGTH = 30;

export const TEXT_LIMIT_ERROR_10 = "10文字以内で入力してください";
export const TEXT_LIMIT_ERROR_30 = "30文字以内で入力してください";

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
    if (countChars(input.participantName.trim()) > PARTICIPANT_NAME_MAX_LENGTH) {
      return TEXT_LIMIT_ERROR_10;
    }
    if (countChars(input.affiliation.trim()) > AFFILIATION_MAX_LENGTH) {
      return TEXT_LIMIT_ERROR_10;
    }
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
  if (phase.phase === "note" && countChars(roundData.roundNote.trim()) > ROUND_NOTE_MAX_LENGTH) {
    return TEXT_LIMIT_ERROR_30;
  }
  return null;
}

function countChars(value: string): number {
  return Array.from(value).length;
}
