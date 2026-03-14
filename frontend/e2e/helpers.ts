import { Page, expect } from "@playwright/test";

/** Login as a test user and store auth state */
export async function login(page: Page, username = "admin", password = "admin123") {
  await page.goto("/login");
  await page.getByPlaceholder("请输入用户名").fill(username);
  await page.getByPlaceholder("请输入密码").fill(password);
  await page.getByRole("button", { name: /登录/ }).click();
  // Wait for redirect to dashboard
  await expect(page).toHaveURL("/", { timeout: 10000 });
}

/** Verify the main layout has loaded (sidebar + content) */
export async function expectLayoutLoaded(page: Page) {
  // Left sidebar should be present
  await expect(page.locator("nav")).toBeVisible();
}
