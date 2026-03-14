import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Course Planning", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should navigate to course planning page", async ({ page }) => {
    await page.goto("/course-planning");
    await expect(page.getByText("课程序列规划")).toBeVisible();
    await expect(page.getByRole("button", { name: /创建新序列/ })).toBeVisible();
  });

  test("should open and close the create form", async ({ page }) => {
    await page.goto("/course-planning");
    // Open form
    await page.getByRole("button", { name: /创建新序列/ }).click();
    await expect(page.getByText("新建课程序列")).toBeVisible();
    // Close form
    await page.getByRole("button", { name: /取消/ }).click();
    await expect(page.getByText("新建课程序列")).not.toBeVisible();
  });

  test("should show empty state when no courses", async ({ page }) => {
    await page.goto("/course-planning");
    // Wait for courses to load
    await page.waitForTimeout(1000);
    await expect(page.getByText("已保存的序列")).toBeVisible();
  });

  test("should create a course via API and show it in the list", async ({ page }) => {
    const uniqueTitle = `E2E课程_${Date.now()}`;
    const token = await page.evaluate(() => localStorage.getItem("token"));
    const response = await page.request.post("/api/courses/", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: uniqueTitle,
        theme: "测试主题",
        duration: "60分钟",
        level: "中级",
        style: "流瑜伽",
        focus: "测试",
        poses: [
          { name: "山式", duration: "2分钟", notes: "测试体式" },
        ],
      },
    });
    expect(response.status()).toBe(201);

    // Navigate and verify it appears
    await page.goto("/course-planning");
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 5000 });

    // Clean up: delete the course
    const courseData = await response.json();
    await page.request.delete(`/api/courses/${courseData.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });
});
