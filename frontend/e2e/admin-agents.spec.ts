import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Admin Agent Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should navigate to agent management page", async ({ page }) => {
    await page.goto("/admin/agents");
    await expect(
      page.getByRole("heading", { name: "Agent 管理" })
    ).toBeVisible();
  });

  test("should show adapter status", async ({ page }) => {
    await page.goto("/admin/agents");
    await expect(page.getByText("AI 后端适配器")).toBeVisible();
    await expect(page.getByText("Mock")).toBeVisible();
  });

  test("should show agent list or empty state", async ({ page }) => {
    await page.goto("/admin/agents");
    await page.waitForTimeout(1000);
    const agentList = page.getByText("Agent 列表");
    await expect(agentList).toBeVisible();
  });

  test("should show create agent form", async ({ page }) => {
    await page.goto("/admin/agents");
    await page.getByRole("button", { name: /创建 Agent/ }).click();
    await expect(page.getByText("创建新 Agent")).toBeVisible();
  });
});
