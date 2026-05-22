import { test, expect } from "@playwright/test";

test.describe("标签管理 E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    await expect(page.getByText("快速笔记")).toBeVisible({ timeout: 15000 });
  });

  async function createTagViaStorage(page: any, name: string) {
    await page.evaluate(async (tagName) => {
      const storage = (window as any).__notes_storage__();
      await storage.createTag(tagName);
      const tags = await storage.listTags();
      (window as any).__notes_stores__.tags.getState().setTags(tags);
    }, name);
  }

  async function openNoteInView(page: any, title: string) {
    const textarea = page.getByPlaceholder("想写点什么？");
    await textarea.fill(title);
    await page.waitForTimeout(1000);
    const noteCard = page.getByRole("button", { name: new RegExp(`^${title}`) }).first();
    await expect(noteCard).toBeVisible({ timeout: 10000 });
    await noteCard.click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
  }

  test("应通过存储层创建标签并在侧栏显示", async ({ page }) => {
    await createTagViaStorage(page, "重要");
    await expect(page.getByText("重要")).toBeVisible({ timeout: 5000 });
  });

  test("应在 NoteView 中通过标签选择器添加标签", async ({ page }) => {
    await createTagViaStorage(page, "技术");
    await openNoteInView(page, "标签笔记测试");

    const addTagBtn = page.getByText("添加标签", { exact: true });
    await addTagBtn.click();

    const tagSelector = page.locator(".flex.flex-col.gap-1.max-h-48");
    await expect(tagSelector.getByText("技术")).toBeVisible({ timeout: 5000 });

    await tagSelector.getByText("技术").click();

    const tagBadge = page.locator(".tag-badge").filter({ hasText: "技术" });
    await expect(tagBadge).toBeVisible({ timeout: 5000 });
  });

  test("应在 NoteView 中移除标签", async ({ page }) => {
    await createTagViaStorage(page, "待移除");
    await openNoteInView(page, "移除标签测试");

    const addTagBtn = page.getByText("添加标签", { exact: true });
    await addTagBtn.click();

    const tagSelector = page.locator(".flex.flex-col.gap-1.max-h-48");
    await tagSelector.getByText("待移除").click();

    const tagBadge = page.locator(".tag-badge").filter({ hasText: "待移除" });
    await expect(tagBadge).toBeVisible({ timeout: 5000 });

    const removeBtn = tagBadge.locator("button");
    await removeBtn.click();

    await expect(tagBadge).not.toBeVisible({ timeout: 5000 });
  });

  test("应通过新建标签对话框创建标签", async ({ page }) => {
    await openNoteInView(page, "新建标签测试");

    const addTagBtn = page.getByText("添加标签", { exact: true });
    await addTagBtn.click();

    const createTagBtn = page.getByText("新建标签");
    await createTagBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("新建标签")).toBeVisible({ timeout: 5000 });

    const tagNameInput = dialog.getByPlaceholder("标签名称");
    await tagNameInput.fill("自定义标签");
    await dialog.getByRole("button", { name: "创建" }).click();

    const tagBadge = page.locator(".tag-badge").filter({ hasText: "自定义标签" });
    await expect(tagBadge).toBeVisible({ timeout: 5000 });
  });

  test("应在侧栏通过标签按钮筛选笔记", async ({ page }) => {
    await createTagViaStorage(page, "筛选标签");

    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar.getByText("筛选标签")).toBeVisible({ timeout: 5000 });

    const tagBtnInSidebar = sidebar.getByText("筛选标签");
    await tagBtnInSidebar.click();

    await expect(tagBtnInSidebar).toHaveClass(/bg-blue-500/);
  });

  test("应通过右键菜单添加标签到笔记", async ({ page }) => {
    await createTagViaStorage(page, "右键标签");
    await openNoteInView(page, "右键标签测试");

    const noteViewContent = page.locator("[data-radix-context-menu-trigger]");
    await noteViewContent.click({ button: "right" });

    const addTagItem = page.getByText("添加标签");
    await expect(addTagItem).toBeVisible();
    await addTagItem.click();

    await expect(page.getByPlaceholder("搜索标签...")).toBeVisible({
      timeout: 5000,
    });
  });
});
