import type { ParticipantSubmission, Scene } from "./types";

export type DiffSummary = {
  missedAttention: string[];
  extraAttention: string[];
  missedCriteria: string[];
  criteriaOrderHint: string;
  missedRecommendedActions: string[];
};

/** ベテラン模板と受講者回答の簡易差分（正誤ではなく差分の可視化） */
export function computeDiff(scene: Scene, sub: ParticipantSubmission): DiffSummary {
  const vet = scene.veteranTemplate;
  const missedAttention = vet.focusPoints.filter((f) => !sub.attentionSelected.includes(f));
  const extraAttention = sub.attentionSelected.filter((a) => !vet.focusPoints.includes(a));
  const missedCriteria = vet.criteriaPriority.filter((c) => !sub.criteriaOrdered.includes(c));

  const exp = vet.criteriaPriority.filter((c) => sub.criteriaOrdered.includes(c));
  const act = sub.criteriaOrdered.filter((c) => vet.criteriaPriority.includes(c));
  let criteriaOrderHint = "";
  if (exp.length && act.length) {
    const sameHead = exp.length === act.length && exp.every((v, i) => v === act[i]);
    criteriaOrderHint = sameHead
      ? "テンプレートと同じ並び（共通項目の範囲）"
      : `テンプレ優先: ${exp.join(" → ")} / 受講者: ${act.join(" → ")}`;
  } else {
    criteriaOrderHint = "比較できる共通の判断基準が少ない";
  }

  const missedRecommendedActions = vet.recommendedActions.filter(
    (a) => !sub.actionsSelected.includes(a),
  );

  return {
    missedAttention,
    extraAttention,
    missedCriteria,
    criteriaOrderHint,
    missedRecommendedActions,
  };
}
