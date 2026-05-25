import type { ParticipantSubmission, Scene } from "./types";

export type OjtExportInput = {
  submission: ParticipantSubmission;
  scene: Scene;
};

export function buildOjtExportItems(input: OjtExportInput): string[] {
  const { submission, scene } = input;
  const context = [
    `受講者: ${submission.participantName}`,
    submission.affiliation ? `所属: ${submission.affiliation}` : "",
    `シーン: ${scene.displayName}`,
  ].filter(Boolean);
  const answerSummary = summarizeAnswers(submission);
  const checklist = scene.veteranTemplate.ojtChecklist;

  if (checklist.length > 0) {
    return checklist.map((item) => [item, ...context, answerSummary].filter(Boolean).join(" / "));
  }

  return [[...context, answerSummary].filter(Boolean).join(" / ")];
}

function summarizeAnswers(submission: ParticipantSubmission): string {
  const awareness = uniqueFlatMap(submission.rounds, (round) => round.awarenessSelection);
  const actions = uniqueFlatMap(submission.rounds, (round) => round.actionSelection);
  const criteria = uniqueFlatMap(submission.rounds, (round) => round.criteriaOrdered);
  const notes = submission.rounds.map((round) => round.roundNote).filter(Boolean);

  return [
    awareness.length ? `気づき: ${awareness.join("、")}` : "",
    actions.length ? `共有・行動: ${actions.join("、")}` : "",
    criteria.length ? `判断基準: ${criteria.join("、")}` : "",
    notes.length ? `メモ: ${notes.join(" / ")}` : "",
  ].filter(Boolean).join(" / ");
}

function uniqueFlatMap<T>(items: T[], mapper: (item: T) => string[]): string[] {
  return Array.from(new Set(items.flatMap(mapper).filter(Boolean)));
}
