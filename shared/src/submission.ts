import type { JudgmentRound, ParticipantSubmission } from "./types";

export type BuildSubmissionInput = {
  id: string;
  createdAt: string;
  participantName: string;
  affiliation: string;
  roomId?: string | null;
  sceneId: string;
  rounds: JudgmentRound[];
  confidenceLevel: number;
};

export function buildSubmission(input: BuildSubmissionInput): ParticipantSubmission {
  const awarenessNote = input.rounds
    .map((round, index) => (round.roundNote.trim() ? `【設問${index + 1}】${round.roundNote.trim()}` : ""))
    .filter(Boolean)
    .join("\n");

  return {
    id: input.id,
    createdAt: input.createdAt,
    participantName: input.participantName.trim(),
    affiliation: input.affiliation.trim(),
    roomId: input.roomId ?? undefined,
    sceneId: input.sceneId,
    rounds: input.rounds,
    confidenceLevel: input.confidenceLevel,
    attentionSelected: [],
    attentionNote: "",
    awarenessSelections: input.rounds.flatMap((round) => round.awarenessSelection),
    awarenessNote,
    criteriaOrdered: input.rounds.flatMap((round) => round.criteriaOrdered),
    criteriaNote: "",
    actionsSelected: input.rounds.flatMap((round) => round.actionSelection),
    actionsNote: "",
  };
}
