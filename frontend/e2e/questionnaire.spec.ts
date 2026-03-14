import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Questionnaire Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should navigate to questionnaire page", async ({ page }) => {
    await page.goto("/questionnaire");
    await expect(page.getByRole("heading", { name: "问卷管理" })).toBeVisible();
    await expect(page.getByRole("button", { name: /创建问卷/ })).toBeVisible();
  });

  test("should show statistics cards", async ({ page }) => {
    await page.goto("/questionnaire");
    await expect(page.getByText("总问卷数")).toBeVisible();
    await expect(page.getByText("总反馈数")).toBeVisible();
    await expect(page.getByText("平均满意度")).toBeVisible();
  });

  test("should open and close the create form", async ({ page }) => {
    await page.goto("/questionnaire");
    // Open form
    await page.getByRole("button", { name: /创建问卷/ }).click();
    await expect(page.getByText("智能生成课后问卷")).toBeVisible();
    // Close form
    await page.getByRole("button", { name: /取消/ }).click();
    await expect(page.getByText("智能生成课后问卷")).not.toBeVisible();
  });

  test("should create a survey via API and show it in the list", async ({ page }) => {
    const uniqueTitle = `E2E问卷_${Date.now()}`;
    const token = await page.evaluate(() => localStorage.getItem("token"));
    const response = await page.request.post("/api/surveys/", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: uniqueTitle,
        description: "E2E测试问卷描述",
        questions: [
          { text: "课程整体感受如何？", question_type: "text" },
          { text: "请为课程打分", question_type: "rating" },
        ],
      },
    });
    expect(response.status()).toBe(201);

    // Navigate and verify it appears
    await page.goto("/questionnaire");
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("课程整体感受如何？")).toBeVisible();
    await expect(page.getByText("请为课程打分")).toBeVisible();

    // Clean up: delete the survey
    const surveyData = await response.json();
    await page.request.delete(`/api/surveys/${surveyData.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test("should expand survey details", async ({ page }) => {
    const uniqueTitle = `E2E详情_${Date.now()}`;
    const token = await page.evaluate(() => localStorage.getItem("token"));
    const response = await page.request.post("/api/surveys/", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: uniqueTitle,
        description: "测试详情展开",
        questions: [
          { text: "您对课程满意吗？", question_type: "text" },
        ],
      },
    });
    expect(response.status()).toBe(201);
    const surveyData = await response.json();

    await page.goto("/questionnaire");
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 5000 });

    // Expand details
    await page.getByRole("button", { name: /查看详情/ }).first().click();
    await expect(page.getByText("暂无反馈")).toBeVisible();

    // Collapse
    await page.getByRole("button", { name: /收起/ }).first().click();
    await expect(page.getByText("暂无反馈")).not.toBeVisible();

    // Clean up
    await page.request.delete(`/api/surveys/${surveyData.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });
});
