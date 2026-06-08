import { expect, test, type Page } from "@playwright/test";

const PARTICIPANT_URL = "http://127.0.0.1:5275/participant/";
const ADMIN_URL = "http://127.0.0.1:5276/admin/";
const SHEET_MOCK_URL = "http://127.0.0.1:5198/exec";
const SHEET_MOCK_ADMIN_URL = "http://127.0.0.1:5198/__admin";

/**
 * ISOLATE-4 — 同一 URL・コードだけでクロス閲覧できない（E2E）
 *
 * 目的: デモ配布前に、研修コード/管理者コードの組み合わせで回答が漏れないことを自動確認する。
 *
 * 受け入れ条件:
 * - room-demo-1（DEMO-2026 / admin-demo）の回答は admin-demo だけが一覧で見える。
 * - room-other（OTHER-2026 / admin-other）の回答は admin-other だけが一覧で見える。
 * - クロスログインでは相手 room の受講者名が一覧に出ない。
 *
 * 成功条件: npm run test:e2e Green。
 */
const awarenessByRound = [
  "ラベル・表示の違和感",
  "異音・振動の違和感",
  "後工程に影響しそうな状態",
  "記録用紙の不備",
  "引き渡し状態の違い",
] as const;

async function resetSheetMock() {
  const response = await fetch(`${SHEET_MOCK_ADMIN_URL}/reset`, { method: "POST" });
  expect(response.ok).toBeTruthy();
}

async function clearBrowserStorage(page: Page, url: string) {
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

async function clickNext(page: Page) {
  await page.getByRole("button", { name: "next" }).click();
}

async function submitFiveQuestionResponse(
  page: Page,
  input: { participantName: string; trainingCode?: string },
) {
  const trainingCode = input.trainingCode ?? "DEMO-2026";
  await clearBrowserStorage(page, PARTICIPANT_URL);

  await page.getByPlaceholder("例：DEMO-2026").fill(trainingCode);
  await clickNext(page);

  await page.getByPlaceholder("例：山田 太郎").fill(input.participantName);
  await page.getByPlaceholder("例：営業部").fill("ISOLATE-4");
  await clickNext(page);

  for (const [index, awareness] of awarenessByRound.entries()) {
    await page.getByRole("button", { name: awareness, exact: true }).click();
    await clickNext(page);
    await page.getByRole("button", { name: "班長へ相談する", exact: true }).click();
    await clickNext(page);
    await page.getByRole("button", { name: "品質", exact: true }).click();
    await clickNext(page);
    await page.getByLabel(/一言メモ/).fill(`ISOLATE-4 設問${index + 1}`);
    await clickNext(page);
  }

  await page.getByRole("button", { name: "ある程度自信あり", exact: true }).click();
  await clickNext(page);
  await page.getByRole("button", { name: "回答を送信" }).click();
  await expect(page.getByRole("heading", { name: "送信完了" })).toBeVisible();
}

async function loginAdmin(page: Page, adminCode: string) {
  await clearBrowserStorage(page, ADMIN_URL);
  await page.getByPlaceholder("管理者コード").fill(adminCode);
  await page.getByRole("button", { name: "入室する" }).click();
  await expect(page.getByRole("button", { name: "管理者コード入力に戻る" })).toBeVisible();
}

async function openResponsesTab(page: Page) {
  await page.getByRole("button", { name: "回答" }).click();
}

async function appendResponseViaApi(roomId: string, submission: { id: string; participantName: string }) {
  const url = new URL(SHEET_MOCK_URL);
  url.searchParams.set("path", "responses");
  url.searchParams.set("client", "client-demo");
  url.searchParams.set("room", roomId);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      id: submission.id,
      createdAt: new Date().toISOString(),
      participantName: submission.participantName,
      affiliation: "ISOLATE-4",
      roomId,
      sceneId: "scene-demo-1",
      rounds: [],
      confidenceLevel: 3,
    }),
  });
  expect(response.ok).toBeTruthy();
}

async function queryResponsesViaApi(roomId: string, adminToken: string) {
  const url = new URL(SHEET_MOCK_URL);
  url.searchParams.set("path", "responses/query");
  url.searchParams.set("client", "client-demo");
  url.searchParams.set("room", roomId);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token: adminToken }),
  });
  return { status: response.status, body: await response.json() };
}

test.describe("ISOLATE-4: コードによるクロス閲覧拒否", () => {
  test("管理者コード A では room A の回答だけ、B では room B だけ見える", async ({ browser }) => {
    await resetSheetMock();

    const participant = await browser.newPage();
    await submitFiveQuestionResponse(participant, {
      participantName: "RoomA 太郎",
      trainingCode: "DEMO-2026",
    });
    await submitFiveQuestionResponse(participant, {
      participantName: "RoomB 花子",
      trainingCode: "OTHER-2026",
    });
    await participant.close();

    const adminA = await browser.newPage();
    await loginAdmin(adminA, "admin-demo");
    await openResponsesTab(adminA);
    await expect(adminA.getByText("RoomA 太郎")).toBeVisible();
    await expect(adminA.getByText("RoomB 花子")).toBeHidden();
    await adminA.close();

    const adminB = await browser.newPage();
    await loginAdmin(adminB, "admin-other");
    await openResponsesTab(adminB);
    await expect(adminB.getByText("RoomB 花子")).toBeVisible();
    await expect(adminB.getByText("RoomA 太郎")).toBeHidden();
    await adminB.close();
  });

  test("API: room B の token では room A の responses/query が拒否される", async () => {
    await resetSheetMock();
    await appendResponseViaApi("room-demo-1", { id: "isolate-4-api-a", participantName: "API-RoomA" });

    const allowed = await queryResponsesViaApi("room-demo-1", "admin-demo");
    expect(allowed.status).toBe(200);
    expect(JSON.stringify(allowed.body)).toContain("API-RoomA");

    const denied = await queryResponsesViaApi("room-demo-1", "admin-other");
    expect(denied.status).toBe(403);
  });
});
