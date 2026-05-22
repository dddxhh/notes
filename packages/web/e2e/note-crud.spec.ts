import { test, expect } from "@playwright/test";

test.describe("笔记 CRUD E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    await expect(page.getByText("快速笔记")).toBeVisible({ timeout: 15000 });
  });

  test("应在快速笔记中创建笔记并显示标题", async ({ page }) => {
    const textarea = page.getByPlaceholder("想写点什么？");
    await textarea.fill("CRUD测试笔记");
    await page.waitForTimeout(1000);
    await expect(page.getByRole("button", { name: /^CRUD测试笔记/ }).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("应点击笔记卡片打开 NoteView", async ({ page }) => {
    const textarea = page.getByPlaceholder("想写点什么？");
    await textarea.fill("打开笔记测试");
    await page.waitForTimeout(1000);
    const noteCard = page.getByRole("button", { name: /^打开笔记测试/ }).first();
    await expect(noteCard).toBeVisible({ timeout: 10000 });
    await noteCard.click();
    await expect(page.getByText("打开笔记测试")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("自动保存")).toBeVisible();
  });

  test("应在 NoteView 中编辑笔记并自动保存", async ({ page }) => {
    const textarea = page.getByPlaceholder("想写点什么？");
    await textarea.fill("编辑前标题");
    await page.waitForTimeout(1000);
    const noteCard = page.getByRole("button", { name: /^编辑前标题/ }).first();
    await expect(noteCard).toBeVisible({ timeout: 10000 });
    await noteCard.click();
    await expect(page.getByText("编辑前标题")).toBeVisible({
      timeout: 10000,
    });

    const editorArea = page.locator(".tiptap");
    await editorArea.click();
    await editorArea.pressSequentially(" 编辑后内容");
    await page.waitForTimeout(1000);

    await expect(page.getByText("自动保存")).toBeVisible();
  });

  test("应通过右键菜单删除笔记到回收站", async ({ page }) => {
    const textarea = page.getByPlaceholder("想写点什么？");
    await textarea.fill("待删除笔记");
    await page.waitForTimeout(1000);
    const noteCard = page.getByRole("button", { name: /^待删除笔记/ }).first();
    await expect(noteCard).toBeVisible({ timeout: 10000 });
    await noteCard.click();
    await expect(page.getByText("待删除笔记")).toBeVisible({
      timeout: 10000,
    });

    const noteViewContent = page.locator("[data-radix-context-menu-trigger]");
    await noteViewContent.click({ button: "right" });

    const deleteItem = page.getByText("删除笔记");
    await expect(deleteItem).toBeVisible();
    await deleteItem.click();

    const confirmBtn = page.getByRole("alertdialog").getByRole("button", { name: "删除" });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await expect(page.getByText("待删除笔记")).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("应在回收站中恢复笔记", async ({ page }) => {
    const textarea = page.getByPlaceholder("想写点什么？");
    await textarea.fill("恢复测试笔记");
    await page.waitForTimeout(1000);
    const noteCard = page.getByRole("button", { name: /^恢复测试笔记/ }).first();
    await expect(noteCard).toBeVisible({ timeout: 10000 });
    await noteCard.click();
    await expect(page.getByText("恢复测试笔记")).toBeVisible({
      timeout: 10000,
    });

    const noteViewContent = page.locator("[data-radix-context-menu-trigger]");
    await noteViewContent.click({ button: "right" });
    await page.getByText("删除笔记").click();
    const confirmBtn = page.getByRole("alertdialog").getByRole("button", { name: "删除" });
    await confirmBtn.click();

    await page.evaluate(() => {
      (window as any).__notes_stores__.ui.getState().setShowTrash(true);
      (window as any).__notes_stores__.notes.getState().loadDeletedNotes();
    });

    await expect(page.locator("[data-trash-view]")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("恢复测试笔记")).toBeVisible({
      timeout: 5000,
    });

    const restoreBtn = page.getByRole("button", { name: "恢复" });
    await restoreBtn.click();

    await expect(page.getByText("回收站为空")).toBeVisible({
      timeout: 5000,
    });
  });

  test("应在回收站中彻底删除笔记", async ({ page }) => {
    const textarea = page.getByPlaceholder("想写点什么？");
    await textarea.fill("彻底删除笔记");
    await page.waitForTimeout(1000);
    const noteCard = page.getByRole("button", { name: /^彻底删除笔记/ }).first();
    await expect(noteCard).toBeVisible({ timeout: 10000 });
    await noteCard.click();

    const noteViewContent = page.locator("[data-radix-context-menu-trigger]");
    await noteViewContent.click({ button: "right" });
    await page.getByText("删除笔记").click();
    const confirmBtn = page.getByRole("alertdialog").getByRole("button", { name: "删除" });
    await confirmBtn.click();

    await page.evaluate(() => {
      (window as any).__notes_stores__.ui.getState().setShowTrash(true);
      (window as any).__notes_stores__.notes.getState().loadDeletedNotes();
    });

    await expect(page.locator("[data-trash-view]")).toBeVisible({
      timeout: 5000,
    });

    const permanentDeleteBtn = page.getByRole("button", { name: "彻底删除" });
    await permanentDeleteBtn.click();

    const confirmInTrash = page.locator("[data-confirm-delete]").getByRole("button", {
      name: "确定",
    });
    await confirmInTrash.click();

    await expect(page.getByText("回收站为空")).toBeVisible({
      timeout: 5000,
    });
  });

  test("应清空回收站", async ({ page }) => {
    const textarea = page.getByPlaceholder("想写点什么？");
    await textarea.fill("清空回收站笔记1");
    await page.waitForTimeout(1000);
    await expect(page.getByRole("button", { name: /^清空回收站笔记1/ }).first()).toBeVisible({
      timeout: 10000,
    });

    const note1Id = await page.evaluate(() => {
      const notes = (window as any).__notes_stores__.notes.getState().notes;
      return notes.find((n: any) => n.title.startsWith("清空回收站"))?.id;
    });

    await page.evaluate(async (id) => {
      const storage = (window as any).__notes_storage__();
      await storage.deleteNote(id);
      (window as any).__notes_stores__.notes.getState().removeNoteFromList(id);
    }, note1Id);

    await textarea.fill("清空回收站笔记2");
    await page.waitForTimeout(1000);

    const note2Id = await page.evaluate(() => {
      const notes = (window as any).__notes_stores__.notes.getState().notes;
      return notes.find((n: any) => n.title.startsWith("清空回收站"))?.id;
    });

    await page.evaluate(async (id) => {
      const storage = (window as any).__notes_storage__();
      await storage.deleteNote(id);
      (window as any).__notes_stores__.notes.getState().removeNoteFromList(id);
    }, note2Id);

    await page.evaluate(() => {
      (window as any).__notes_stores__.ui.getState().setShowTrash(true);
      (window as any).__notes_stores__.notes.getState().loadDeletedNotes();
    });

    await expect(page.locator("[data-trash-view]")).toBeVisible({
      timeout: 5000,
    });

    const emptyBtn = page.getByRole("button", { name: "清空回收站" });
    await emptyBtn.click();

    const confirmInTrash = page.locator("[data-confirm-empty]").getByRole("button", {
      name: "确定",
    });
    await confirmInTrash.click();

    await expect(page.getByText("回收站为空")).toBeVisible({
      timeout: 5000,
    });
  });

  test("应自动提取标题并持久保存", async ({ page }) => {
    const textarea = page.getByPlaceholder("想写点什么？");
    await textarea.fill("持久标题测试");
    await page.waitForTimeout(1000);
    await expect(page.getByRole("button", { name: /^持久标题测试/ }).first()).toBeVisible({
      timeout: 10000,
    });

    await page.reload();
    await expect(page.getByText("快速笔记")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /^持久标题测试/ }).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
