import { describe, expect, it } from "vitest";
import { MAX_CHOICE_CARDS } from "./choices";
import { cardsToSlots, slotsToCards } from "./cardSlots";

describe("cardSlots", () => {
  it("カード配列を最大5件の入力スロットに変換する", () => {
    expect(cardsToSlots(["A", "B", "C"])).toEqual(["A", "B", "C", "", ""]);
  });

  it("スロットをカード配列に戻すとき、空欄を除いてtrimする", () => {
    expect(slotsToCards([" A ", "", "B", "  ", "C"])).toEqual(["A", "B", "C"]);
  });

  it("6件以上のスロットは先頭5件だけを残す", () => {
    const slots = ["1", "2", "3", "4", "5", "6"];
    expect(slotsToCards(slots)).toEqual(["1", "2", "3", "4", "5"]);
    expect(slotsToCards(slots)).toHaveLength(MAX_CHOICE_CARDS);
  });
});
