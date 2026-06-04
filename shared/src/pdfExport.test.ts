import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildParticipantPdfPayload, generateParticipantPdf } from "./pdfExport";
import { getConfidenceLabel } from "./confidence";
import { JUDGMENT_ROUND_COUNT } from "./judgmentFlow";
import { makeScene, makeSubmission } from "./test/fixtures";

describe("pdfExport", () => {
  it("回答済み1件とシーンから PDF バイナリを生成する", () => {
    const scene = makeScene();
    const submission = makeSubmission();

    const pdf = generateParticipantPdf({ submission, scene });

    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.byteLength).toBeGreaterThan(0);
  });

  it("PDF ビューアで開ける最小構造を持つ", () => {
    const scene = makeScene();
    const submission = makeSubmission();

    const pdf = generateParticipantPdf({ submission, scene });
    const text = new TextDecoder("latin1").decode(pdf);
    const startXrefMatch = text.match(/startxref\s+(\d+)\s+%%EOF\s*$/);

    expect(text.startsWith("%PDF-1.4\n")).toBe(true);
    expect(text).toContain("\nxref\n");
    expect(text).toContain("\ntrailer\n");
    expect(startXrefMatch).not.toBeNull();
    expect(Number(startXrefMatch?.[1])).toBe(text.indexOf("xref"));
  });

  it("日本語・英語・数字を UTF-16BE テキストとして持ち、見出しと区切りを装飾する", () => {
    const scene = makeScene({ displayName: "検査 Area 360" });
    const submission = makeSubmission({
      participantName: "山田 Taro 123",
      affiliation: "品質 QA 1",
      rounds: [
        {
          awarenessSelection: ["気づき A1"],
          actionSelection: ["班長へ相談する Action 2"],
          criteriaOrdered: ["品質 C3"],
          roundNote: "メモ Note 4",
        },
      ],
    });

    const pdf = generateParticipantPdf({ submission, scene });
    const text = new TextDecoder("latin1").decode(pdf);

    expect(text).toContain("/Subtype /Type0");
    expect(text).toContain("/Encoding /UniJIS-UTF16-H");
    expect(text).toContain(`<${utf16BeHex("研修結果レポート")}>`);
    expect(text).toContain("(EXPERT EYE 360) Tj");
    expect(text).toContain(`<${utf16BeHex("検査 Area 360")}>`);
    expect(text).toContain(`<${utf16BeHex("山田 Taro 123")}>`);
    expect(text).toContain(`<${utf16BeHex("品質 QA 1")}>`);
    expect(text).toContain("(01) Tj");
    expect(text).toContain(`<${utf16BeHex("設問別 回答")}>`);
    expect(text).toContain("0.059 0.165 0.278 rg");
    expect(text).toContain(" re f");
    expect(text).toContain("0.059 0.165 0.278 RG");
    expect(text).toContain(" S\n");
  });

  it("pdf.html の主要なデザイン要素を PDF に反映する", () => {
    const template = readFileSync("pdf.html", "utf8");
    const scene = makeScene({ displayName: "検査 Area 360" });
    const submission = makeSubmission({
      participantName: "山田 Taro 123",
      affiliation: "品質 QA 1",
      confidenceLevel: 4,
      rounds: [
        {
          awarenessSelection: ["置き場の違い"],
          actionSelection: ["後工程担当へ共有する"],
          criteriaOrdered: ["記録・証跡"],
          roundNote: "てっすと",
        },
      ],
    });

    const pdf = generateParticipantPdf({ submission, scene });
    const text = new TextDecoder("latin1").decode(pdf);

    expect(template).toContain("EXPERT EYE 360");
    expect(template).toContain("研修結果レポート");
    expect(template).toContain("--navy:        #0F2A47");
    expect(template).toContain("設問別 回答");
    expect(text).toContain("(EXPERT EYE 360) Tj");
    expect(text).toContain(`<${utf16BeHex("研修結果レポート")}>`);
    expect(text).toContain(`<${utf16BeHex("シーン")}>`);
    expect(text).toContain(`<${utf16BeHex("名前")}>`);
    expect(text).toContain(`<${utf16BeHex("所属")}>`);
    expect(text).toContain(`<${utf16BeHex("確信度")}>`);
    expect(text).toContain(`<${utf16BeHex("設問別 回答")}>`);
    expect(text).toContain("(01) Tj");
    expect(text).toContain("0.059 0.165 0.278 rg");
    expect(text).toContain("0.059 0.165 0.278 RG");
  });

  it("目視フィードバックを反映し、番号・ラベル・ヘッダーを読みやすくする", () => {
    const scene = makeScene();
    const submission = makeSubmission({
      rounds: [
        {
          awarenessSelection: ["置き場の違い"],
          actionSelection: ["後工程担当へ共有する"],
          criteriaOrdered: ["後工程影響"],
          roundNote: "うわあああ",
        },
      ],
    });

    const pdf = generateParticipantPdf({ submission, scene });
    const text = new TextDecoder("latin1").decode(pdf);

    expect(text).toContain("/F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    expect(text).not.toContain(`<${utf16BeHex("研修結果 / Training Result")}>`);
    expect(text).not.toContain(`<${utf16BeHex("DOC EE360-RR-0428  ·  DATE 2025.10.28  ·  PAGE 1 / 1")}>`);
    expect(text).toContain(["BT", "/F2 8 Tf", "72 782 Td", "(EXPERT EYE 360) Tj", "ET"].join("\n"));
    expect(text).not.toContain("(DOC EE360-RR-0428) Tj");
    expect(text).toContain(["BT", "/F2 6 Tf", "404 782 Td", "(DATE 2025.10.28) Tj", "ET"].join("\n"));
    expect(text).toContain(["BT", "/F2 6 Tf", "500 782 Td", "(PAGE 1 / 1) Tj", "ET"].join("\n"));
    expect(text).not.toContain("54 733 32 3 re f");
    expect(text).not.toContain(`<${utf16BeHex("EXPERT EYE 360")}>`);
    expect(text).not.toContain(`<${utf16BeHex("DATE 2025.10.28")}>`);
    expect(text).not.toContain(`<${utf16BeHex("PAGE 1 / 1")}>`);
    expect(text).toContain(["BT", "/F1 8 Tf", "487 598 Td", `<${utf16BeHex("全")}> Tj`, "ET"].join("\n"));
    expect(text).toContain(["BT", "/F2 8 Tf", "502 598 Td", "(5) Tj", "ET"].join("\n"));
    expect(text).toContain(["BT", "/F1 8 Tf", "515 598 Td", `<${utf16BeHex("件")}> Tj`, "ET"].join("\n"));
    expect(text).toContain(["BT", "/F2 14 Tf", "67 541 Td", "(01) Tj", "ET"].join("\n"));
    expect(text).toContain(
      [
        "q",
        "0.290 0.329 0.384 rg",
        "BT",
        "/F1 8 Tf",
        "112 552 Td",
        `<${utf16BeHex("気づき")}> Tj`,
        "ET",
        "Q",
      ].join("\n"),
    );
  });

  it("名前・所属・一言メモの長文を折り返し、欄の高さに合わせて次の設問を下げる", () => {
    const longName = "山田太郎山田太郎山田太郎";
    const longAffiliation = "品質保証部品質保証部品質保証部";
    const longNote = "一言メモがとても長くなって次の行まで続く内容です";
    const scene = makeScene();
    const submission = makeSubmission({
      participantName: longName,
      affiliation: longAffiliation,
      rounds: [
        {
          awarenessSelection: ["置き場の違い"],
          actionSelection: ["後工程担当へ共有する"],
          criteriaOrdered: ["後工程影響"],
          roundNote: longNote,
        },
      ],
    });

    const pdf = generateParticipantPdf({ submission, scene });
    const text = new TextDecoder("latin1").decode(pdf);

    expect(text).not.toContain(`<${utf16BeHex(longName)}>`);
    expect(text).not.toContain(`<${utf16BeHex(longAffiliation)}>`);
    expect(text).not.toContain(`<${utf16BeHex(longNote)}>`);
    expect(text).toContain(["BT", "/F1 10 Tf", "188 640 Td", `<${utf16BeHex("山田太郎山田太郎")}> Tj`, "ET"].join("\n"));
    expect(text).toContain(["BT", "/F1 10 Tf", "188 628 Td", `<${utf16BeHex("山田太郎")}> Tj`, "ET"].join("\n"));
    expect(text).toContain(["BT", "/F1 10 Tf", "310 640 Td", `<${utf16BeHex("品質保証部品質保")}> Tj`, "ET"].join("\n"));
    expect(text).toContain(["BT", "/F1 10 Tf", "310 628 Td", `<${utf16BeHex("証部品質保証部")}> Tj`, "ET"].join("\n"));
    expect(text).toContain("54 498 487 78 re S");
    expect(text).toContain(["BT", "/F1 8 Tf", "442 534 Td", `<${utf16BeHex("一言メモがとても")}> Tj`, "ET"].join("\n"));
    expect(text).toContain(["BT", "/F1 8 Tf", "442 522 Td", `<${utf16BeHex("長くなって次の行")}> Tj`, "ET"].join("\n"));
    expect(text).toContain(["BT", "/F1 8 Tf", "442 510 Td", `<${utf16BeHex("まで続く内容です")}> Tj`, "ET"].join("\n"));
    expect(text).toContain("54 426 487 58 re S");
    expect(text).toContain(["BT", "/F2 14 Tf", "67 449 Td", "(02) Tj", "ET"].join("\n"));
  });

  it("設問カードが1ページに収まらない場合は次ページへ送り、ページ番号を実ページ数に合わせる", () => {
    const scene = makeScene();
    const tallRounds = Array.from({ length: JUDGMENT_ROUND_COUNT }, () => ({
      awarenessSelection: ["気づきが長く続く確認ポイント"],
      actionSelection: ["共有行動が長く続く確認ポイント"],
      criteriaOrdered: ["判断基準が長く続く確認ポイント"],
      roundNote: "一言メモ".repeat(10),
    }));
    const submission = makeSubmission({ rounds: tallRounds });

    const pdf = generateParticipantPdf({ submission, scene });
    const text = new TextDecoder("latin1").decode(pdf);

    expect(text).toContain("<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>");
    expect(text).toContain("(PAGE 1 / 2) Tj");
    expect(text).toContain("(PAGE 2 / 2) Tj");
    expect(text).not.toContain("54 10 487 102 re S");
    expect(text).toContain("54 602 487 102 re S");
    expect(text).toContain(["BT", "/F2 14 Tf", "67 647 Td", "(05) Tj", "ET"].join("\n"));
  });

  it("生成用ペイロードにシーン表示名・名前・所属・確信度ラベルを含める", () => {
    const scene = makeScene({ displayName: "出荷前検査エリア" });
    const submission = makeSubmission({
      participantName: "  山田 太郎  ",
      affiliation: "  品質保証部  ",
      confidenceLevel: 4,
    });

    const payload = buildParticipantPdfPayload({ submission, scene });

    expect(payload.sceneName).toBe("出荷前検査エリア");
    expect(payload.participantName).toBe("山田 太郎");
    expect(payload.affiliation).toBe("品質保証部");
    expect(payload.confidenceLabel).toBe(getConfidenceLabel(4));
  });

  it("5問分の出題カードと実際の選択ラベルを設問ごとに含める", () => {
    const scene = makeScene({
      questionCards: Array.from({ length: JUDGMENT_ROUND_COUNT }, (_, index) => ({
        awarenessCards: [`気づき${index + 1}`],
        actionCards: [`共有${index + 1}`],
        criteriaCards: [`基準${index + 1}`],
      })),
    });
    const submission = makeSubmission({
      rounds: Array.from({ length: JUDGMENT_ROUND_COUNT }, (_, index) => ({
        awarenessSelection: [`気づき${index + 1}`],
        actionSelection: [`共有${index + 1}`],
        criteriaOrdered: [`基準${index + 1}`],
        roundNote: `メモ${index + 1}`,
      })),
    });

    const payload = buildParticipantPdfPayload({ submission, scene });

    expect(payload.rounds).toHaveLength(JUDGMENT_ROUND_COUNT);
    expect(payload.rounds[0]).toMatchObject({
      questionNumber: 1,
      awarenessCards: ["気づき1"],
      awarenessSelection: ["気づき1"],
      actionCards: ["共有1"],
      actionSelection: ["共有1"],
      criteriaCards: ["基準1"],
      criteriaSelection: ["基準1"],
      roundNote: "メモ1",
    });
    expect(payload.rounds[4]).toMatchObject({
      questionNumber: 5,
      awarenessSelection: ["気づき5"],
      actionSelection: ["共有5"],
      criteriaSelection: ["基準5"],
      roundNote: "メモ5",
    });
  });

  it("rounds が5件未満でもクラッシュせず、足りない設問は空回答として扱う", () => {
    const scene = makeScene();
    const submission = makeSubmission({
      rounds: [
        {
          awarenessSelection: ["A1"],
          actionSelection: ["X1"],
          criteriaOrdered: ["C1"],
          roundNote: "設問1だけ回答",
        },
      ],
    });

    const payload = buildParticipantPdfPayload({ submission, scene });

    expect(payload.rounds).toHaveLength(JUDGMENT_ROUND_COUNT);
    expect(payload.rounds[0].roundNote).toBe("設問1だけ回答");
    expect(payload.rounds[1]).toMatchObject({
      awarenessSelection: [],
      actionSelection: [],
      criteriaSelection: [],
      roundNote: "",
    });
  });
});

function utf16BeHex(value: string): string {
  return Array.from({ length: value.length }, (_, index) =>
    value.charCodeAt(index).toString(16).toUpperCase().padStart(4, "0"),
  ).join("");
}
