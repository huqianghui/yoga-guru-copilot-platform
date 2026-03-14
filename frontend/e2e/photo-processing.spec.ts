import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Photo Processing", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should navigate to photo processing page", async ({ page }) => {
    await page.goto("/photo-processing");
    await expect(page.getByRole("heading", { name: "关键帧处理" })).toBeVisible();
  });

  test("should show empty state when no analyzed videos", async ({ page }) => {
    await page.goto("/photo-processing");
    await page.waitForTimeout(1000);
    // Should show the empty message in the selector area
    await expect(page.getByText("暂无已分析的视频")).toBeVisible();
  });

  test("should show prompt to select video", async ({ page }) => {
    await page.goto("/photo-processing");
    await page.waitForTimeout(1000);
    await expect(page.getByRole("heading", { name: "请选择已分析的视频" })).toBeVisible();
  });
});
