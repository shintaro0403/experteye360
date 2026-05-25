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
