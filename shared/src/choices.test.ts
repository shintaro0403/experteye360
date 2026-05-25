import { describe, expect, it } from "vitest";
import { limitChoices, MAX_CHOICE_CARDS } from "./choices";

describe("limitChoices", () => {
  it("選択肢が6件のとき、先頭5件だけが残る", () => {
    const items = ["a", "b", "c", "d", "e", "f"];
    expect(limitChoices(items)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("選択肢が5件以下のとき、件数と内容はそのまま返る", () => {
    const items = ["a", "b", "c"];
    expect(limitChoices(items)).toEqual(["a", "b", "c"]);
  });

  it("空配列のとき、空配列を返す", () => {
    expect(limitChoices([])).toEqual([]);
  });

  it("MAX_CHOICE_CARDS は 5 である", () => {
    expect(MAX_CHOICE_CARDS).toBe(5);
  });
});
