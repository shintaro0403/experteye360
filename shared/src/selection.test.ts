import { describe, expect, it } from "vitest";
import { selectSingle } from "./selection";

describe("selectSingle", () => {
  it("未選択のとき、選んだラベルだけを返す", () => {
    expect(selectSingle([], "品質")).toEqual(["品質"]);
  });

  it("同じラベルを再選択したとき、選択を解除する", () => {
    expect(selectSingle(["品質"], "品質")).toEqual([]);
  });

  it("別ラベルを選択したとき、1件だけに切り替える", () => {
    expect(selectSingle(["品質"], "安全")).toEqual(["安全"]);
  });
});
