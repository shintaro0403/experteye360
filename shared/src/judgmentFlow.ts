import type { JudgmentRound, ParticipantSubmission } from "./types";

export const JUDGMENT_ROUND_COUNT = 5;

export const STEP_INTRO = 0;
export const STEP_JUDGMENT_START = 1;
export const STEP_CONFIDENCE = STEP_JUDGMENT_START + JUDGMENT_ROUND_COUNT * 4;
export const STEP_CONFIRM = STEP_CONFIDENCE + 1;
export const STEP_DONE = STEP_CONFIRM + 1;

export type JudgmentPhase = "awareness" | "action" | "criteria" | "note";

const PHASES: JudgmentPhase[] = ["awareness", "action", "criteria", "note"];

export function emptyJudgmentRound(): JudgmentRound {
  return {
    awarenessSelection: [],
    actionSelection: [],
    criteriaOrdered: [],
    roundNote: "",
  };
}

export function createEmptyRounds(): JudgmentRound[] {
  return Array.from({ length: JUDGMENT_ROUND_COUNT }, emptyJudgmentRound);
}

export function stepToRoundPhase(step: number): { round: number; phase: JudgmentPhase } | null {
  if (step < STEP_JUDGMENT_START || step >= STEP_CONFIDENCE) return null;
  const offset = step - STEP_JUDGMENT_START;
  const round = Math.floor(offset / 4);
  const phase = PHASES[offset % 4];
  if (round < 0 || round >= JUDGMENT_ROUND_COUNT || !phase) return null;
  return { round, phase };
}

/** 旧形式（単一ラウンド）を rounds 配列へ */
export function legacyToRounds(sub: ParticipantSubmission): JudgmentRound[] {
  const first = emptyJudgmentRound();
  first.awarenessSelection = sub.awarenessSelections ?? [];
  first.actionSelection = sub.actionsSelected ?? [];
  first.criteriaOrdered = sub.criteriaOrdered ?? [];
  const notes = [sub.awarenessNote, sub.criteriaNote, sub.actionsNote].filter(Boolean);
  first.roundNote = notes.join(" / ");

  const rounds = createEmptyRounds();
  rounds[0] = first;
  return rounds;
}

export function getSubmissionRounds(sub: ParticipantSubmission): JudgmentRound[] {
  if (sub.rounds?.length === JUDGMENT_ROUND_COUNT) return sub.rounds;
  return legacyToRounds(sub);
}

export function aggregateCriteriaOrdered(sub: ParticipantSubmission): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of getSubmissionRounds(sub)) {
    for (const c of r.criteriaOrdered) {
      if (!seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
  }
  return out;
}

export function aggregateActionsSelected(sub: ParticipantSubmission): string[] {
  return getSubmissionRounds(sub).flatMap((r) => r.actionSelection);
}

export function aggregateAwarenessSelections(sub: ParticipantSubmission): string[] {
  return getSubmissionRounds(sub).flatMap((r) => r.awarenessSelection);
}
