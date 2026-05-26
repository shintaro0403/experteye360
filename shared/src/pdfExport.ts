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
  return encodeLatin1(buildMinimalPdf(payload));
}

function buildMinimalPdf(payload: ParticipantPdfPayload): string {
  const content = buildContentStream(payload);

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 7 0 R >>",
    "<< /Type /Font /Subtype /Type0 /BaseFont /HeiseiKakuGo-W5 /Encoding /UniJIS-UTF16-H /DescendantFonts [5 0 R] >>",
    "<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HeiseiKakuGo-W5 /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 5 >> /FontDescriptor 6 0 R >>",
    "<< /Type /FontDescriptor /FontName /HeiseiKakuGo-W5 /Flags 4 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += "trailer\n";
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefOffset}\n`;
  pdf += "%%EOF\n";
  return pdf;
}

function buildContentStream(payload: ParticipantPdfPayload): string {
  const operations: string[] = [
    "q",
    "0.92 0.96 1 rg",
    "36 758 523 48 re f",
    "0.2 0.35 0.65 RG",
    "1.2 w",
    "36 748 m 559 748 l S",
    "Q",
    textAt(50, 785, 18, "研修結果 / Training Result"),
    textAt(50, 735, 11, `シーン / Scene: ${payload.sceneName}`),
    textAt(50, 715, 11, `名前 / Name: ${payload.participantName}`),
    textAt(50, 695, 11, `所属 / Affiliation: ${payload.affiliation || "-"}`),
    textAt(50, 675, 11, `確信度 / Confidence: ${payload.confidenceLabel}`),
  ];

  let y = 640;
  payload.rounds.forEach((round) => {
    operations.push(
      "q",
      "0.96 0.96 0.96 rg",
      `42 ${y - 5} 511 20 re f`,
      "0.72 0.72 0.72 RG",
      `42 ${y - 10} m 553 ${y - 10} l S`,
      "Q",
      textAt(50, y, 11, `設問 ${round.questionNumber} / Question ${round.questionNumber}`),
      textAt(62, y - 18, 9, `気づき / Awareness: ${round.awarenessSelection.join(", ") || "-"}`),
      textAt(62, y - 34, 9, `共有行動 / Action: ${round.actionSelection.join(", ") || "-"}`),
      textAt(62, y - 50, 9, `判断基準 / Criteria: ${round.criteriaSelection.join(", ") || "-"}`),
      textAt(62, y - 66, 9, `メモ / Note: ${round.roundNote || "-"}`),
    );
    y -= 92;
  });

  return operations.join("\n");
}

function textAt(x: number, y: number, size: number, value: string): string {
  return [
    "BT",
    `/F1 ${size} Tf`,
    `${x} ${y} Td`,
    `<${toUtf16BeHex(value)}> Tj`,
    "ET",
  ].join("\n");
}

function toUtf16BeHex(value: string): string {
  return Array.from({ length: value.length }, (_, index) =>
    value.charCodeAt(index).toString(16).toUpperCase().padStart(4, "0"),
  ).join("");
}

function encodeLatin1(value: string): Uint8Array {
  return Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
}
