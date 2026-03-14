import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Video Analysis", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should navigate to video analysis page", async ({ page }) => {
    await page.goto("/video-analysis");
    await expect(page.getByRole("heading", { name: "视频内容分析" })).toBeVisible();
    await expect(page.getByText("上传录播视频")).toBeVisible();
  });

  test("should show upload area", async ({ page }) => {
    await page.goto("/video-analysis");
    await expect(page.getByText("点击上传或拖拽视频文件")).toBeVisible();
    await expect(page.getByText("支持 MP4, MOV, AVI 格式")).toBeVisible();
  });

  test("should show history sidebar", async ({ page }) => {
    await page.goto("/video-analysis");
    await expect(page.getByText("历史分析记录")).toBeVisible();
  });

  test("should show frame extraction info", async ({ page }) => {
    await page.goto("/video-analysis");
    await expect(page.getByText("关键帧智能提取")).toBeVisible();
    await expect(page.getByText("前往照片处理模块查看")).toBeVisible();
  });
});
