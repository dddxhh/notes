import { test, expect } from "@playwright/test";

test.describe("笔记应用 E2E", () => {
  test("应用应正常启动并显示快速笔记首屏", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("快速笔记")).toBeVisible({ timeout: 15000 });
  });

  test("应在快速笔记输入框中输入内容", async ({ page }) => {
    await page.goto("/");
    const textarea = page.getByPlaceholder("想写点什么？");
    await expect(textarea).toBeVisible({ timeout: 15000 });
    await textarea.fill("测试笔记内容");
    await expect(textarea).toHaveValue("测试笔记内容");
  });

  test("桌面端应显示双栏布局", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    await expect(page.getByText("全部笔记")).toBeVisible({ timeout: 15000 });
  });

  test("移动端应显示堆栈导航布局", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "📝 快速笔记" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "📋 全部笔记" })).toBeVisible({ timeout: 15000 });
  });

  test("模式切换应在所见即所得和Markdown之间切换", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    const textarea = page.getByPlaceholder("想写点什么？");
    await expect(textarea).toBeVisible({ timeout: 15000 });
    await textarea.fill("测试切换");
    await page.waitForTimeout(1000);
    await page
      .getByRole("button", { name: /^测试切换/ })
      .first()
      .click();
    await page.waitForTimeout(500);
    await expect(page.getByText("所见即所得")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Markdown")).toBeVisible({ timeout: 15000 });
    await page.getByText("Markdown", { exact: true }).click();
    await expect(page.getByPlaceholder("开始编写 Markdown...")).toBeVisible({ timeout: 10000 });
  });
});
