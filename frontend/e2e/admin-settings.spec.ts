import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Admin Settings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should navigate to admin settings page", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(
      page.getByRole("heading", { name: "系统配置" })
    ).toBeVisible();
  });

  test("should show initialization or config list", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.waitForTimeout(1000);
    // Should show either "初始化默认配置" button or config entries
    const initButton = page.getByRole("button", { name: /初始化/ });
    const configSection = page.getByText("Azure OpenAI");
    await expect(initButton.or(configSection)).toBeVisible();
  });
});
