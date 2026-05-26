import { expect, test, type Page } from "@playwright/test";

const PARTICIPANT_URL = "http://127.0.0.1:5175/participant/";
const ADMIN_URL = "http://127.0.0.1:5176/admin/";
const SHEET_MOCK_ADMIN_URL = "http://127.0.0.1:5198/__admin";

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

async function loadMockResponses(roomId: string, clientId = "client-demo") {
  const response = await fetch(
    `${SHEET_MOCK_ADMIN_URL}/responses?client=${encodeURIComponent(clientId)}&room=${encodeURIComponent(roomId)}`,
  );
  expect(response.ok).toBeTruthy();
  return (await response.json()) as Array<{ id: string; participantName: string; roomId: string }>;
}

async function loadMockRequests() {
  const response = await fetch(`${SHEET_MOCK_ADMIN_URL}/requests`);
  expect(response.ok).toBeTruthy();
  return (await response.json()) as Array<{
    method: string;
    path: string;
    client: string;
    room: string | null;
    hasToken: boolean;
  }>;
}

async function clearBrowserStorage(page: Page, url: string) {
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie
      .split(";")
      .map((part) => part.split("=")[0]?.trim())
      .filter((name) => name?.startsWith("expertEye360Responses"))
      .forEach((name) => {
        document.cookie = `${name}=; path=/; max-age=0`;
      });
  });
  await page.reload();
}

async function clickNext(page: Page) {
  await page.getByRole("button", { name: "next" }).click();
}

async function submitFiveQuestionResponse(page: Page, participantName: string) {
  await clearBrowserStorage(page, PARTICIPANT_URL);

  await page.getByPlaceholder("例：DEMO-2026").fill("DEMO-2026");
  await clickNext(page);

  await page.getByPlaceholder("例：山田 太郎").fill(participantName);
  await page.getByPlaceholder("例：営業部").fill("Phase4 テスト所属");
  await clickNext(page);

  for (const [index, awareness] of awarenessByRound.entries()) {
    await page.getByRole("button", { name: awareness, exact: true }).click();
    await clickNext(page);

    await page.getByRole("button", { name: "班長へ相談する", exact: true }).click();
    await clickNext(page);

    await page.getByRole("button", { name: "品質", exact: true }).click();
    await clickNext(page);

    await page.getByLabel(/一言メモ/).fill(`Phase4 設問${index + 1} メモ`);
    await clickNext(page);
  }

  await page.getByRole("button", { name: "ある程度自信あり", exact: true }).click();
  await clickNext(page);

  await expect(page.getByText("内容を送信します（設問 5 件）")).toBeVisible();
  await page.getByRole("button", { name: "回答を送信" }).click();
  await expect(page.getByRole("heading", { name: "送信完了" })).toBeVisible();
}

test.describe("Phase 4 E2E: 受講者から管理者まで", () => {
  test("受講者が5問回答して送信完了まで進める", async ({ page }) => {
    await resetSheetMock();
    await submitFiveQuestionResponse(page, "Phase4 太郎");
  });

  test("受講者が送信した回答は同一 client + room だけに表示される", async ({ browser }) => {
    await resetSheetMock();
    const participant = await browser.newPage();
    await submitFiveQuestionResponse(participant, "Phase4 共有確認");
    await participant.close();

    const admin = await browser.newPage();
    await clearBrowserStorage(admin, ADMIN_URL);
    await admin.getByPlaceholder("管理者コード").fill("admin-demo");
    await admin.getByRole("button", { name: "入室する" }).click();
    await admin.getByRole("button", { name: "回答" }).click();

    await expect(admin.getByRole("heading", { name: "回答一覧（1）" })).toBeVisible();
    await expect(admin.getByText("Phase4 共有確認")).toBeVisible();

    const otherRoomResponses = await loadMockResponses("room-other");
    expect(otherRoomResponses).toEqual([]);

    const otherClientResponses = await loadMockResponses("room-demo-1", "client-other");
    expect(otherClientResponses).toEqual([]);

    const requests = await loadMockRequests();
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "POST", path: "rooms/verify", client: "client-demo" }),
        expect.objectContaining({ method: "POST", path: "responses", client: "client-demo", room: "room-demo-1" }),
        expect.objectContaining({ method: "GET", path: "responses", client: "client-demo", room: "room-demo-1", hasToken: true }),
      ]),
    );
  });
});
