import { test, expect } from "@playwright/test";

test.describe("搜索 E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    await expect(page.getByText("快速笔记")).toBeVisible({ timeout: 15000 });
  });

  async function createFolderViaStorage(page: any, name: string) {
    await page.evaluate(async (folderName) => {
      const storage = (window as any).__notes_storage__();
      await storage.createFolder({ name: folderName });
      const folders = await storage.listFolders();
      (window as any).__notes_stores__.folders.getState().setFolders(folders);
    }, name);
  }

  async function createTagViaStorage(page: any, name: string) {
    await page.evaluate(async (tagName) => {
      const storage = (window as any).__notes_storage__();
      await storage.createTag(tagName);
      const tags = await storage.listTags();
      (window as any).__notes_stores__.tags.getState().setTags(tags);
    }, name);
  }

  test("应在侧栏搜索栏中按关键词搜索笔记", async ({ page }) => {
    const textarea = page.getByPlaceholder("想写点什么？");
    await textarea.fill("搜索关键词笔记");
    await page.waitForTimeout(1000);
    await expect(page.getByRole("button", { name: /^搜索关键词笔记/ }).first()).toBeVisible({
      timeout: 10000,
    });

    const searchInput = page.getByPlaceholder("搜索笔记...");
    await searchInput.fill("搜索关键词");
    await page.waitForTimeout(1500);

    await expect(page.getByText("搜索关键词笔记").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("应清除搜索关键词", async ({ page }) => {
    const textarea = page.getByPlaceholder("想写点什么？");
    await textarea.fill("清除搜索笔记");
    await page.waitForTimeout(1000);

    const searchInput = page.getByPlaceholder("搜索笔记...");
    await searchInput.fill("清除搜索");
    await page.waitForTimeout(500);

    const clearBtn = page.getByRole("button", { name: "清除搜索", exact: true });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    await expect(searchInput).toHaveValue("");
  });

  test("应显示搜索筛选面板", async ({ page }) => {
    const filterToggle = page.getByRole("button", { name: "筛选切换" });
    await filterToggle.click();

    await expect(page.getByText("标签筛选")).toBeVisible();
    await expect(page.getByText("时间范围")).toBeVisible();
  });

  test("应通过文件夹下拉按文件夹筛选", async ({ page }) => {
    await createFolderViaStorage(page, "搜索文件夹");

    const folderDropdown = page.getByText("全部笔记").first();
    await folderDropdown.click();

    const folderItem = page.locator("[data-folder-id]").filter({ hasText: "搜索文件夹" });
    await expect(folderItem).toBeVisible({ timeout: 5000 });
    await folderItem.click();

    await expect(page.getByText("搜索文件夹")).toBeVisible({ timeout: 5000 });
  });

  test("应通过搜索筛选面板按标签筛选", async ({ page }) => {
    await createTagViaStorage(page, "搜索标签");

    const filterToggle = page.getByRole("button", { name: "筛选切换" });
    await filterToggle.click();

    const searchFilterPanel = page.locator(".flex.flex-col.gap-3.p-3.rounded-lg");
    await expect(searchFilterPanel.getByText("搜索标签")).toBeVisible({
      timeout: 5000,
    });

    const tagBtn = searchFilterPanel.getByText("搜索标签");
    await tagBtn.click();

    await expect(tagBtn).toHaveClass(/bg-blue-500/);
  });

  test("应在筛选面板中切换标签交集/并集模式", async ({ page }) => {
    await createTagViaStorage(page, "交集标签A");
    await createTagViaStorage(page, "交集标签B");

    const filterToggle = page.getByRole("button", { name: "筛选切换" });
    await filterToggle.click();

    const modeBtn = page.getByText("并集");
    await expect(modeBtn).toBeVisible();
    await modeBtn.click();
    await expect(page.getByRole("button", { name: "交集", exact: true })).toBeVisible();
  });

  test("应在快速笔记中切换搜索栏", async ({ page }) => {
    const searchToggle = page.getByTestId("search-toggle");
    await searchToggle.click();

    await expect(page.getByTestId("main-area").getByPlaceholder("搜索笔记...")).toBeVisible({
      timeout: 5000,
    });

    await searchToggle.click();
    await expect(page.getByTestId("main-area").getByPlaceholder("搜索笔记...")).not.toBeVisible({
      timeout: 3000,
    });
  });
});
