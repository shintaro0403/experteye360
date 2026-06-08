import { expect, test } from "@playwright/test";

test.describe("Phase 4 E2E: iframe レイアウト", () => {
  test("受講者 iframe は 25% 帯の中でアプリを 100% 表示する", async ({ page }) => {
    await page.goto("http://127.0.0.1:5275/participant/embed-preview.html");

    const frame = page.frameLocator("iframe");
    await expect(frame.getByText("研修コード")).toBeVisible();

    const metrics = await page.locator(".embed iframe").evaluate((iframe) => {
      const iframeRect = iframe.getBoundingClientRect();
      const embedRect = iframe.parentElement?.getBoundingClientRect();
      const embedClientWidth = iframe.parentElement?.clientWidth ?? 0;
      const embedClientHeight = iframe.parentElement?.clientHeight ?? 0;
      return {
        iframeWidth: iframeRect.width,
        iframeHeight: iframeRect.height,
        embedWidth: embedClientWidth,
        embedHeight: embedClientHeight,
        embedOuterHeight: embedRect?.height ?? 0,
        viewportHeight: window.innerHeight,
      };
    });

    expect(Math.abs(metrics.iframeWidth - metrics.embedWidth)).toBeLessThan(2);
    expect(Math.abs(metrics.iframeHeight - metrics.embedHeight)).toBeLessThan(2);
    expect(Math.abs(metrics.embedOuterHeight - metrics.viewportHeight * 0.25)).toBeLessThan(2);
  });

  test("管理者 iframe は 40% パネルの中でアプリを 100% 表示する", async ({ page }) => {
    await page.goto("http://127.0.0.1:5276/admin/embed-preview.html");

    const frame = page.frameLocator("iframe");
    await expect(frame.getByText("管理者コード").first()).toBeVisible();

    const metrics = await page.locator(".embed iframe").evaluate((iframe) => {
      const iframeRect = iframe.getBoundingClientRect();
      const embedRect = iframe.parentElement?.getBoundingClientRect();
      const embedClientWidth = iframe.parentElement?.clientWidth ?? 0;
      const embedClientHeight = iframe.parentElement?.clientHeight ?? 0;
      return {
        iframeWidth: iframeRect.width,
        iframeHeight: iframeRect.height,
        embedWidth: embedClientWidth,
        embedHeight: embedClientHeight,
        embedOuterWidth: embedRect?.width ?? 0,
        embedOuterHeight: embedRect?.height ?? 0,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    expect(Math.abs(metrics.iframeWidth - metrics.embedWidth)).toBeLessThan(2);
    expect(Math.abs(metrics.iframeHeight - metrics.embedHeight)).toBeLessThan(2);
    expect(Math.abs(metrics.embedOuterWidth - metrics.viewportWidth * 0.4)).toBeLessThan(2);
    expect(Math.abs(metrics.embedOuterHeight - metrics.viewportHeight)).toBeLessThan(2);
  });
});
