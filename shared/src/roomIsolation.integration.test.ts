/**
 * ISOLATE-LOCAL-1 統合 — 実 storage + 実 useAppData（モックなし）
 *
 * ユーザー報告再現: 研修コード 2001 の回答が 0403 管理画面に見える
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAppData } from "./useAppData";
import { appendResponseAsync, loadResponsesAsync, saveSettings } from "./storage";
import { makeSettings, makeSubmission } from "./test/fixtures";

function Probe(props: { adminToken: string; adminRoomId: string }) {
  const { responses, loading } = useAppData({
    adminToken: props.adminToken,
    adminRoomId: props.adminRoomId,
  });
  return createElement(
    "div",
    { "data-testid": "probe" },
    createElement("span", { "data-testid": "loading" }, loading ? "1" : "0"),
    createElement("span", { "data-testid": "count" }, String(responses.length)),
    createElement(
      "ul",
      { "data-testid": "names" },
      responses.map((r) => createElement("li", { key: r.id }, r.participantName)),
    ),
  );
}

function namesInProbe(container: ParentNode): string[] {
  const probe = container.querySelector('[data-testid="probe"]');
  if (!probe) return [];
  return Array.from(probe.querySelectorAll('[data-testid="names"] li')).map(
    (el) => el.textContent ?? "",
  );
}

describe("ISOLATE-LOCAL-1: room 分離（storage + useAppData 統合）", () => {
  let container: HTMLDivElement;
  let root: Root | null;

  function clearResponseCookies() {
    document.cookie
      .split(";")
      .map((part) => part.split("=")[0]?.trim())
      .filter((name) => name?.startsWith("expertEye360Responses"))
      .forEach((name) => {
        document.cookie = `${name}=; path=/; max-age=0`;
      });
  }

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    sessionStorage.clear();
    clearResponseCookies();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = null;
    saveSettings(
      makeSettings({
        adminRoomScope: "trainingCode",
        rooms: [
          {
            roomId: "room-2001",
            displayName: "2001研修",
            accessCode: "2001",
            enabled: true,
          },
          {
            roomId: "room-0403",
            displayName: "0403研修",
            accessCode: "0403",
            enabled: true,
          },
        ],
      }),
    );
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container.remove();
    localStorage.clear();
    sessionStorage.clear();
    clearResponseCookies();
  });

  it("loadResponsesAsync: 2001 の回答は 0403 クエリに含まれない", async () => {
    await appendResponseAsync(
      makeSubmission({ id: "s-2001", participantName: "2001太郎", roomId: "room-2001" }),
    );
    await appendResponseAsync(
      makeSubmission({ id: "s-0403", participantName: "0403花子", roomId: "room-0403" }),
    );

    const room0403 = await loadResponsesAsync({ roomId: "room-0403", adminToken: "admin-demo" });
    expect(room0403.map((r) => r.participantName)).toEqual(["0403花子"]);

    const room2001 = await loadResponsesAsync({ roomId: "room-2001", adminToken: "admin-demo" });
    expect(room2001.map((r) => r.participantName)).toEqual(["2001太郎"]);
  });

  it("useAppData: room-0403 入室時 UI に 2001 の回答が出ない", async () => {
    await appendResponseAsync(
      makeSubmission({ id: "s-2001", participantName: "2001太郎", roomId: "room-2001" }),
    );
    await appendResponseAsync(
      makeSubmission({ id: "s-0403", participantName: "0403花子", roomId: "room-0403" }),
    );

    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(Probe, { adminToken: "admin-demo", adminRoomId: "room-0403" }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });

    const raw = JSON.parse(localStorage.getItem("expertEye360:responses") ?? "[]") as { id: string }[];
    expect(raw.map((r) => r.id).sort()).toEqual(["s-0403", "s-2001"]);
    const loaded = await loadResponsesAsync({ roomId: "room-0403", adminToken: "admin-demo" });
    expect(loaded).toHaveLength(1);

    expect(container.querySelectorAll('[data-testid="probe"]')).toHaveLength(1);
    expect(container.querySelector('[data-testid="count"]')?.textContent).toBe("1");
    expect(namesInProbe(container)).toEqual(["0403花子"]);
  });

  it("useAppData: room 切替で表示が切り替わる", async () => {
    await appendResponseAsync(
      makeSubmission({ id: "s-2001", participantName: "2001太郎", roomId: "room-2001" }),
    );
    await appendResponseAsync(
      makeSubmission({ id: "s-0403", participantName: "0403花子", roomId: "room-0403" }),
    );

    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(Probe, { adminToken: "admin-demo", adminRoomId: "room-0403" }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(namesInProbe(container)).toEqual(["0403花子"]);

    await act(async () => {
      root?.render(createElement(Probe, { adminToken: "admin-demo", adminRoomId: "room-2001" }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(container.querySelector('[data-testid="count"]')?.textContent).toBe("1");
    expect(namesInProbe(container)).toEqual(["2001太郎"]);
  });
});
