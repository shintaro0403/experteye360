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
  const contents = buildContentStreams(payload);
  const pageCount = contents.length;
  const pageObjectIds = Array.from({ length: pageCount }, (_, index) => index + 3);
  const fontObjectId = pageObjectIds.length + 3;
  const cidFontObjectId = fontObjectId + 1;
  const fontDescriptorObjectId = fontObjectId + 2;
  const contentObjectStartId = fontDescriptorObjectId + 1;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`,
    ...pageObjectIds.map((_, index) => {
      const contentObjectId = contentObjectStartId + index;
      return `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectId} 0 R /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObjectId} 0 R >>`;
    }),
    `<< /Type /Font /Subtype /Type0 /BaseFont /HeiseiKakuGo-W5 /Encoding /UniJIS-UTF16-H /DescendantFonts [${cidFontObjectId} 0 R] >>`,
    `<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HeiseiKakuGo-W5 /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 5 >> /FontDescriptor ${fontDescriptorObjectId} 0 R >>`,
    "<< /Type /FontDescriptor /FontName /HeiseiKakuGo-W5 /Flags 4 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>",
    ...contents.map((content) => `<< /Length ${content.length} >>\nstream\n${content}\nendstream`),
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

type QuestionCardLayout = {
  round: ParticipantPdfRoundPayload;
  topY: number;
};

type PdfPageLayout = {
  isFirstPage: boolean;
  cards: QuestionCardLayout[];
};

const FIRST_PAGE_QUESTION_TOP_Y = 576;
const CONTINUATION_PAGE_QUESTION_TOP_Y = 704;
const QUESTION_BOTTOM_MARGIN = 54;
const QUESTION_CARD_GAP = 14;

function buildContentStreams(payload: ParticipantPdfPayload): string[] {
  const pageLayouts = paginateQuestionCards(payload.rounds);
  return pageLayouts.map((layout, index) => buildPageContentStream(payload, layout, index + 1, pageLayouts.length));
}

function paginateQuestionCards(rounds: ParticipantPdfRoundPayload[]): PdfPageLayout[] {
  const pages: PdfPageLayout[] = [];
  let currentPage: PdfPageLayout = { isFirstPage: true, cards: [] };
  let nextTopY = FIRST_PAGE_QUESTION_TOP_Y;

  for (const round of rounds) {
    const height = questionCardHeight(round);
    if (currentPage.cards.length > 0 && nextTopY - height < QUESTION_BOTTOM_MARGIN) {
      pages.push(currentPage);
      currentPage = { isFirstPage: false, cards: [] };
      nextTopY = CONTINUATION_PAGE_QUESTION_TOP_Y;
    }

    currentPage.cards.push({ round, topY: nextTopY });
    nextTopY -= height + QUESTION_CARD_GAP;
  }

  pages.push(currentPage);
  return pages;
}

function buildPageContentStream(
  payload: ParticipantPdfPayload,
  layout: PdfPageLayout,
  pageNumber: number,
  totalPages: number,
): string {
  const operations: string[] = [
    filledRect(0, 0, 595, 842, PDF_TEMPLATE_COLORS.page),
    filledRect(54, 779, 10, 10, PDF_TEMPLATE_COLORS.navy),
    latinTextAt(72, 782, 8, "EXPERT EYE 360", PDF_TEMPLATE_COLORS.navy, "F2"),
    latinTextAt(404, 782, 6, "DATE 2025.10.28", PDF_TEMPLATE_COLORS.ink2, "F2"),
    latinTextAt(500, 782, 6, `PAGE ${pageNumber} / ${totalPages}`, PDF_TEMPLATE_COLORS.ink2, "F2"),
    line(54, 768, 541, 768, PDF_TEMPLATE_COLORS.hair, 0.8),
  ];

  if (layout.isFirstPage) {
    operations.push(
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
    );
  } else {
    operations.push(
      textAt(54, 728, 11, "設問別 回答", PDF_TEMPLATE_COLORS.ink),
      textAt(487, 728, 8, "全", PDF_TEMPLATE_COLORS.ink2),
      latinTextAt(502, 728, 8, String(payload.rounds.length), PDF_TEMPLATE_COLORS.ink2, "F2"),
      textAt(515, 728, 8, "件", PDF_TEMPLATE_COLORS.ink2),
      line(54, 718, 541, 718, PDF_TEMPLATE_COLORS.navy, 1.4),
    );
  }

  layout.cards.forEach(({ round, topY }) => {
    operations.push(questionCard(topY, round).content);
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

const SUMMARY_VALUE_MAX_CHARS = 8;
const QUESTION_VALUE_MAX_CHARS = 14;
const QUESTION_NOTE_MAX_CHARS = 8;
const TEXT_LINE_HEIGHT = 12;

function summaryCell(x: number, y: number, label: string, value: string): string {
  return [
    textAt(x, y, 8, label, PDF_TEMPLATE_COLORS.ink2),
    textLinesAt(x, y - 20, 10, wrapText(value, SUMMARY_VALUE_MAX_CHARS), PDF_TEMPLATE_COLORS.ink),
  ].join("\n");
}

function questionCardHeight(round: ParticipantPdfRoundPayload): number {
  const lines = questionCardLines(round);
  const maxValueLineCount = Math.max(
    lines.awarenessLines.length,
    lines.actionLines.length,
    lines.criteriaLines.length,
    lines.noteLines.length,
  );
  return Math.max(58, 42 + maxValueLineCount * TEXT_LINE_HEIGHT);
}

function questionCardLines(round: ParticipantPdfRoundPayload) {
  return {
    awarenessLines: wrapText(round.awarenessSelection.join(", ") || "-", QUESTION_VALUE_MAX_CHARS),
    actionLines: wrapText(round.actionSelection.join(", ") || "-", QUESTION_VALUE_MAX_CHARS),
    criteriaLines: wrapText(round.criteriaSelection.join(", ") || "-", QUESTION_VALUE_MAX_CHARS),
    noteLines: wrapText(round.roundNote || "-", QUESTION_NOTE_MAX_CHARS),
  };
}

function questionCard(topY: number, round: ParticipantPdfRoundPayload): { content: string; height: number } {
  const number = String(round.questionNumber).padStart(2, "0");
  const { awarenessLines, actionLines, criteriaLines, noteLines } = questionCardLines(round);
  const height = questionCardHeight(round);
  const y = topY - height;
  const labelY = topY - 24;
  const valueY = labelY - 18;

  return {
    height,
    content: [
      strokedRect(54, y, 487, height, PDF_TEMPLATE_COLORS.hair, 0.8),
      filledRect(54, y, 44, height, PDF_TEMPLATE_COLORS.navy),
      latinTextAt(67, y + height / 2 - 6, 14, number, "1 1 1", "F2"),
      questionField(112, labelY, valueY, "気づき", awarenessLines),
      line(214, y, 214, y + height, PDF_TEMPLATE_COLORS.hair2, 0.6),
      questionField(226, labelY, valueY, "共有行動", actionLines),
      line(334, y, 334, y + height, PDF_TEMPLATE_COLORS.hair2, 0.6),
      questionField(346, labelY, valueY, "判断基準", criteriaLines),
      line(430, y, 430, y + height, PDF_TEMPLATE_COLORS.hair2, 0.6),
      questionField(442, labelY, valueY, "メモ", noteLines),
    ].join("\n"),
  };
}

function questionField(x: number, labelY: number, valueY: number, label: string, valueLines: string[]): string {
  return [
    textAt(x, labelY, 8, label, PDF_TEMPLATE_COLORS.ink2),
    textLinesAt(x, valueY, 8, valueLines, PDF_TEMPLATE_COLORS.ink),
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

function textLinesAt(x: number, y: number, size: number, lines: string[], color: string = PDF_TEMPLATE_COLORS.ink): string {
  return lines
    .map((lineText, index) => textAt(x, y - index * TEXT_LINE_HEIGHT, size, lineText, color))
    .join("\n");
}

function textAt(x: number, y: number, size: number, value: string, color: string = PDF_TEMPLATE_COLORS.ink): string {
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

function wrapText(value: string, maxChars: number): string[] {
  const trimmedValue = value.trim() || "-";
  const chars = Array.from(trimmedValue);
  if (trimmedValue.includes(" ") && chars.length <= maxChars + 4) {
    return [trimmedValue];
  }
  const lines: string[] = [];
  for (let index = 0; index < chars.length; index += maxChars) {
    lines.push(chars.slice(index, index + maxChars).join(""));
  }
  return lines.length > 0 ? lines : ["-"];
}

function toUtf16BeHex(value: string): string {
  return Array.from({ length: value.length }, (_, index) =>
    value.charCodeAt(index).toString(16).toUpperCase().padStart(4, "0"),
  ).join("");
}

function encodeLatin1(value: string): Uint8Array {
  return Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
}
