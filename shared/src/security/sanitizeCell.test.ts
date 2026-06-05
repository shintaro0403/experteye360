import { describe, expect, it } from "vitest";
import { sanitizeSpreadsheetCell } from "./sanitizeCell";

describe("sanitizeSpreadsheetCell (SEC-INPUT-01)", () => {
  it("数式トリガー文字で始まる文字列にはアポストロフィを前置する", () => {
    expect(sanitizeSpreadsheetCell("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(sanitizeSpreadsheetCell("+1+1")).toBe("'+1+1");
    expect(sanitizeSpreadsheetCell("-1+1")).toBe("'-1+1");
    expect(sanitizeSpreadsheetCell("@import")).toBe("'@import");
  });

  it("制御文字（タブ・改行・復帰）で始まる文字列も前置する", () => {
    expect(sanitizeSpreadsheetCell("\t=1")).toBe("'\t=1");
    expect(sanitizeSpreadsheetCell("\r=1")).toBe("'\r=1");
    expect(sanitizeSpreadsheetCell("\n=1")).toBe("'\n=1");
  });

  it("安全な文字列・空文字はそのまま返す", () => {
    expect(sanitizeSpreadsheetCell("田中 太郎")).toBe("田中 太郎");
    expect(sanitizeSpreadsheetCell("Room A")).toBe("Room A");
    expect(sanitizeSpreadsheetCell("")).toBe("");
    expect(sanitizeSpreadsheetCell("DEMO-2026")).toBe("DEMO-2026");
  });

  it("16進ハッシュや JSON 文字列など安全な先頭文字は前置しない", () => {
    expect(sanitizeSpreadsheetCell("a1b2c3d4")).toBe("a1b2c3d4");
    expect(sanitizeSpreadsheetCell('{"ok":true}')).toBe('{"ok":true}');
  });

  it("文字列以外（数値・真偽値・null・undefined）はそのまま返す", () => {
    expect(sanitizeSpreadsheetCell(42)).toBe(42);
    expect(sanitizeSpreadsheetCell(true)).toBe(true);
    expect(sanitizeSpreadsheetCell(null)).toBe(null);
    expect(sanitizeSpreadsheetCell(undefined)).toBe(undefined);
  });
});
