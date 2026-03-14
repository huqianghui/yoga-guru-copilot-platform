import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should show login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /登录/ })).toBeVisible();
  });

  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("请输入用户名").fill("admin");
    await page.getByPlaceholder("请输入密码").fill("admin123");
    await page.getByRole("button", { name: /登录/ }).click();
    await expect(page).toHaveURL("/", { timeout: 10000 });
  });

  test("should reject invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("请输入用户名").fill("admin");
    await page.getByPlaceholder("请输入密码").fill("wrongpassword");
    await page.getByRole("button", { name: /登录/ }).click();
    // Should stay on login page (not redirect to dashboard)
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/login/);
  });
});
