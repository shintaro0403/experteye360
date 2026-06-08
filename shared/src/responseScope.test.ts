import { describe, expect, it } from "vitest";
import { dedupeResponsesById, filterResponsesByRoomId, omitResponsesForRoomId } from "./responseScope";
import { makeSubmission } from "./test/fixtures";

describe("ISOLATE-LOCAL-1: responseScope", () => {
  const room2001 = makeSubmission({ id: "a", participantName: "2001太郎", roomId: "room-2001" });
  const room0403 = makeSubmission({ id: "b", participantName: "0403花子", roomId: "room-0403" });

  it("filterResponsesByRoomId は一致 room のみ返す", () => {
    const all = [room2001, room0403];
    expect(filterResponsesByRoomId(all, "room-0403").map((r) => r.participantName)).toEqual([
      "0403花子",
    ]);
    expect(filterResponsesByRoomId(all, "room-2001").map((r) => r.participantName)).toEqual([
      "2001太郎",
    ]);
  });

  it("dedupeResponsesById は同一 id を 1 件にする", () => {
    const dup = makeSubmission({ id: "s-0403", participantName: "0403花子", roomId: "room-0403" });
    expect(dedupeResponsesById([dup, dup, makeSubmission({ id: "s-2001", roomId: "room-2001" })])).toHaveLength(2);
  });

  it("omitResponsesForRoomId は指定 room だけ除く", () => {
    const all = [room2001, room0403];
    expect(omitResponsesForRoomId(all, "room-0403").map((r) => r.participantName)).toEqual([
      "2001太郎",
    ]);
  });
});
