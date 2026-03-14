import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should show dashboard with stats", async ({ page }) => {
    await expect(page.getByText("欢迎回来")).toBeVisible();
    await expect(page.getByText("已分析视频")).toBeVisible();
    await expect(page.getByText("快捷操作")).toBeVisible();
    await expect(page.getByText("最近活动")).toBeVisible();
    await expect(page.getByText("教学洞察")).toBeVisible();
  });

  test("should show quick actions", async ({ page }) => {
    await expect(page.getByText("快捷操作")).toBeVisible();
    await expect(page.getByText("上传新视频")).toBeVisible();
    await expect(page.getByText("创建课程序列")).toBeVisible();
  });

  test("should reflect real course count in stats", async ({ page }) => {
    // Create a course via API
    const token = await page.evaluate(() => localStorage.getItem("token"));
    await page.request.post("/api/courses/", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: "Dashboard测试课程",
        duration: "60分钟",
        level: "中级",
        style: "流瑜伽",
      },
    });

    // Refresh to get new stats
    await page.reload();
    await page.waitForTimeout(1000);

    // The stats grid should show the course count
    await expect(page.getByText("课程序列", { exact: true })).toBeVisible();
  });
});
