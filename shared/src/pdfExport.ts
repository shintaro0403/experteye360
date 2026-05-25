import { getConfidenceLabel } from "./confidence";
import { JUDGMENT_ROUND_COUNT } from "./judgmentFlow";
import type { JudgmentRound, ParticipantSubmission, Scene } from "./types";

export type ParticipantPdfRoundPayload = {
  questionNumber: number;
  awarenessCards: string[];
  awarenessSelection: string[];
  actionCards: string[];
  actionSelection: string[];
  criteriaCards: string[];
  criteriaSelection: string[];
  roundNote: string;
};

export type ParticipantPdfPayload = {
  sceneName: string;
  participantName: string;
  affiliation: string;
  confidenceLabel: string;
  rounds: ParticipantPdfRoundPayload[];
};

export type ParticipantPdfInput = {
  submission: ParticipantSubmission;
  scene: Scene;
};

const EMPTY_ROUND: JudgmentRound = {
  awarenessSelection: [],
  actionSelection: [],
  criteriaOrdered: [],
  roundNote: "",
};

export function buildParticipantPdfPayload(input: ParticipantPdfInput): ParticipantPdfPayload {
  const { submission, scene } = input;

  return {
    sceneName: scene.displayName,
    participantName: submission.participantName.trim(),
    affiliation: (submission.affiliation ?? "").trim(),
    confidenceLabel: getConfidenceLabel(submission.confidenceLevel),
    rounds: Array.from({ length: JUDGMENT_ROUND_COUNT }, (_, index) => {
      const cards = scene.questionCards[index] ?? {
        awarenessCards: [],
        actionCards: [],
        criteriaCards: [],
      };
      const round = submission.rounds[index] ?? EMPTY_ROUND;

      return {
        questionNumber: index + 1,
        awarenessCards: cards.awarenessCards,
        awarenessSelection: round.awarenessSelection,
        actionCards: cards.actionCards,
        actionSelection: round.actionSelection,
        criteriaCards: cards.criteriaCards,
        criteriaSelection: round.criteriaOrdered,
        roundNote: round.roundNote,
      };
    }),
  };
}

export function generateParticipantPdf(input: ParticipantPdfInput): Uint8Array {
  const payload = buildParticipantPdfPayload(input);
  return new TextEncoder().encode(`%PDF-1.4\n${JSON.stringify(payload)}`);
}
