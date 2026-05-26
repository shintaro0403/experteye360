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
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents 7 0 R >>",
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
    filledRect(0, 0, 595, 842, PDF_TEMPLATE_COLORS.page),
    filledRect(54, 779, 10, 10, PDF_TEMPLATE_COLORS.navy),
    latinTextAt(72, 782, 8, "EXPERT EYE 360", PDF_TEMPLATE_COLORS.navy, "F2"),
    latinTextAt(404, 782, 6, "DATE 2025.10.28", PDF_TEMPLATE_COLORS.ink2, "F2"),
    latinTextAt(500, 782, 6, "PAGE 1 / 1", PDF_TEMPLATE_COLORS.ink2, "F2"),
    line(54, 768, 541, 768, PDF_TEMPLATE_COLORS.hair, 0.8),
    textAt(54, 706, 22, "研修結果レポート", PDF_TEMPLATE_COLORS.ink),
    strokedRect(54, 622, 487, 60, PDF_TEMPLATE_COLORS.hair, 0.8),
    line(176, 622, 176, 682, PDF_TEMPLATE_COLORS.hair, 0.8),
    line(298, 622, 298, 682, PDF_TEMPLATE_COLORS.hair, 0.8),
    line(420, 622, 420, 682, PDF_TEMPLATE_COLORS.hair, 0.8),
    summaryCell(66, 660, "シーン", payload.sceneName),
    summaryCell(188, 660, "名前", payload.participantName),
    summaryCell(310, 660, "所属", payload.affiliation || "-"),
    summaryCell(432, 660, "確信度", payload.confidenceLabel),
    line(54, 588, 541, 588, PDF_TEMPLATE_COLORS.navy, 1.4),
    textAt(54, 598, 11, "設問別 回答", PDF_TEMPLATE_COLORS.ink),
    textAt(487, 598, 8, "全", PDF_TEMPLATE_COLORS.ink2),
    latinTextAt(502, 598, 8, String(payload.rounds.length), PDF_TEMPLATE_COLORS.ink2, "F2"),
    textAt(515, 598, 8, "件", PDF_TEMPLATE_COLORS.ink2),
  ];

  let y = 518;
  payload.rounds.forEach((round) => {
    operations.push(questionCard(y, round));
    y -= 72;
  });

  return operations.join("\n");
}

const PDF_TEMPLATE_COLORS = {
  page: "1 1 1",
  navy: "0.059 0.165 0.278",
  ink: "0.102 0.122 0.165",
  ink2: "0.290 0.329 0.384",
  mute: "0.533 0.573 0.627",
  hair: "0.890 0.902 0.922",
  hair2: "0.941 0.949 0.961",
} as const;

function summaryCell(x: number, y: number, label: string, value: string): string {
  return [
    textAt(x, y, 8, label, PDF_TEMPLATE_COLORS.ink2),
    textAt(x, y - 20, 10, value, PDF_TEMPLATE_COLORS.ink),
  ].join("\n");
}

function questionCard(y: number, round: ParticipantPdfRoundPayload): string {
  const number = String(round.questionNumber).padStart(2, "0");
  return [
    strokedRect(54, y, 487, 58, PDF_TEMPLATE_COLORS.hair, 0.8),
    filledRect(54, y, 44, 58, PDF_TEMPLATE_COLORS.navy),
    latinTextAt(67, y + 23, 14, number, "1 1 1", "F2"),
    questionField(112, y + 34, "気づき", round.awarenessSelection.join(", ") || "-"),
    line(214, y, 214, y + 58, PDF_TEMPLATE_COLORS.hair2, 0.6),
    questionField(226, y + 34, "共有行動", round.actionSelection.join(", ") || "-"),
    line(334, y, 334, y + 58, PDF_TEMPLATE_COLORS.hair2, 0.6),
    questionField(346, y + 34, "判断基準", round.criteriaSelection.join(", ") || "-"),
    line(430, y, 430, y + 58, PDF_TEMPLATE_COLORS.hair2, 0.6),
    questionField(442, y + 34, "メモ", round.roundNote || "-"),
  ].join("\n");
}

function questionField(x: number, y: number, label: string, value: string): string {
  return [
    textAt(x, y, 8, label, PDF_TEMPLATE_COLORS.ink2),
    textAt(x, y - 18, 8, value, PDF_TEMPLATE_COLORS.ink),
  ].join("\n");
}

function filledRect(x: number, y: number, width: number, height: number, color: string): string {
  return [
    "q",
    `${color} rg`,
    `${x} ${y} ${width} ${height} re f`,
    "Q",
  ].join("\n");
}

function strokedRect(x: number, y: number, width: number, height: number, color: string, strokeWidth: number): string {
  return [
    "q",
    `${color} RG`,
    `${strokeWidth} w`,
    `${x} ${y} ${width} ${height} re S`,
    "Q",
  ].join("\n");
}

function line(x1: number, y1: number, x2: number, y2: number, color: string, strokeWidth: number): string {
  return [
    "q",
    `${color} RG`,
    `${strokeWidth} w`,
    `${x1} ${y1} m ${x2} ${y2} l S`,
    "Q",
  ].join("\n");
}

function textAt(x: number, y: number, size: number, value: string, color = PDF_TEMPLATE_COLORS.ink): string {
  return [
    "q",
    `${color} rg`,
    "BT",
    `/F1 ${size} Tf`,
    `${x} ${y} Td`,
    `<${toUtf16BeHex(value)}> Tj`,
    "ET",
    "Q",
  ].join("\n");
}

function latinTextAt(x: number, y: number, size: number, value: string, color: string, font = "F1"): string {
  return [
    "q",
    `${color} rg`,
    "BT",
    `/${font} ${size} Tf`,
    `${x} ${y} Td`,
    `(${escapePdfLiteral(value)}) Tj`,
    "ET",
    "Q",
  ].join("\n");
}

function escapePdfLiteral(value: string): string {
  return value.replace(/([()\\])/g, "\\$1");
}

function toUtf16BeHex(value: string): string {
  return Array.from({ length: value.length }, (_, index) =>
    value.charCodeAt(index).toString(16).toUpperCase().padStart(4, "0"),
  ).join("");
}

function encodeLatin1(value: string): Uint8Array {
  return Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
}
