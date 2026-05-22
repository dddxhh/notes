import { test, expect } from "@playwright/test";

test.describe("文件夹管理 E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    await expect(page.getByText("快速笔记")).toBeVisible({ timeout: 15000 });
  });

  async function createFolderViaStorage(page: any, name: string) {
    const folderId = await page.evaluate(async (folderName) => {
      const storage = (window as any).__notes_storage__();
      const folder = await storage.createFolder({ name: folderName });
      const folders = await storage.listFolders();
      (window as any).__notes_stores__.folders.getState().setFolders(folders);
      return folder.id;
    }, name);
    return folderId;
  }

  async function createNoteInFolderViaStorage(page: any, title: string, folderId: string) {
    const noteId = await page.evaluate(
      async ({ noteTitle, fid }) => {
        const storage = (window as any).__notes_storage__();
        const note = await storage.createNote({ title: noteTitle, folderId: fid });
        (window as any).__notes_stores__.notes.getState().addNote(note);
        return note.id;
      },
      { noteTitle: title, fid: folderId },
    );
    return noteId;
  }

  test("应通过存储层创建文件夹并在下拉中显示", async ({ page }) => {
    await createFolderViaStorage(page, "工作笔记");

    const folderDropdown = page.getByText("全部笔记").first();
    await folderDropdown.click();
    await expect(page.getByText("工作笔记")).toBeVisible({ timeout: 5000 });
  });

  test("应选择文件夹筛选笔记列表", async ({ page }) => {
    const folderId = await createFolderViaStorage(page, "筛选文件夹");
    await createNoteInFolderViaStorage(page, "文件夹内笔记", folderId);

    const folderDropdown = page.getByText("全部笔记").first();
    await folderDropdown.click();
    await expect(page.getByText("筛选文件夹")).toBeVisible({ timeout: 5000 });

    const folderItem = page.locator("[data-folder-id]").filter({
      hasText: "筛选文件夹",
    });
    await folderItem.click();

    await expect(page.getByText("文件夹内笔记")).toBeVisible({
      timeout: 5000,
    });
  });

  test("应选择全部笔记取消文件夹筛选", async ({ page }) => {
    await createFolderViaStorage(page, "临时文件夹");

    const folderDropdown = page.getByText("全部笔记").first();
    await folderDropdown.click();

    const allNotesItem = page.locator("[data-all-notes]");
    await allNotesItem.click();

    const currentLabel = page.getByText("全部笔记").first();
    await expect(currentLabel).toBeVisible();
  });

  test("应通过右键菜单移动笔记到文件夹", async ({ page }) => {
    await createFolderViaStorage(page, "目标文件夹");

    const textarea = page.getByPlaceholder("想写点什么？");
    await textarea.fill("移动笔记测试");
    await page.waitForTimeout(1000);
    const noteCard = page.getByRole("button", { name: /^移动笔记测试/ }).first();
    await expect(noteCard).toBeVisible({ timeout: 10000 });
    await noteCard.click();

    await expect(page.getByText("移动笔记测试")).toBeVisible({
      timeout: 10000,
    });

    const noteViewContent = page.locator("[data-radix-context-menu-trigger]");
    await noteViewContent.click({ button: "right" });

    const moveItem = page.getByText("移动到文件夹");
    await expect(moveItem).toBeVisible();
    await moveItem.click();

    await expect(page.getByText("目标文件夹")).toBeVisible({ timeout: 5000 });
    const targetFolderInDialog = page.getByRole("dialog").getByText("目标文件夹");
    await targetFolderInDialog.click();

    await expect(page.getByText("移动到文件夹")).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("应通过右键菜单重命名文件夹", async ({ page }) => {
    await createFolderViaStorage(page, "原始文件夹名");

    const folderDropdown = page.getByText("全部笔记").first();
    await folderDropdown.click();
    await expect(page.getByText("原始文件夹名")).toBeVisible({
      timeout: 5000,
    });

    const folderItem = page.locator("[data-folder-id]").filter({
      hasText: "原始文件夹名",
    });
    await folderItem.click({ button: "right" });

    const renameItem = page.getByText("重命名");
    await expect(renameItem).toBeVisible();
    await renameItem.click();

    const dialog = page.getByRole("dialog");
    const renameInput = dialog.locator("input");
    await renameInput.fill("重命名后文件夹");
    await dialog.getByRole("button", { name: "确认" }).click();

    await expect(page.getByText("重命名后文件夹")).toBeVisible({
      timeout: 5000,
    });
  });

  test("应通过右键菜单删除文件夹", async ({ page }) => {
    await createFolderViaStorage(page, "待删除文件夹");

    const folderDropdown = page.getByText("全部笔记").first();
    await folderDropdown.click();
    await expect(page.getByText("待删除文件夹")).toBeVisible({
      timeout: 5000,
    });

    const folderItem = page.locator("[data-folder-id]").filter({
      hasText: "待删除文件夹",
    });
    await folderItem.click({ button: "right" });

    const deleteItem = page.getByText("删除文件夹");
    await expect(deleteItem).toBeVisible();
    await deleteItem.click();

    const confirmBtn = page.getByRole("alertdialog").getByRole("button", { name: "删除" });
    await confirmBtn.click();

    await expect(page.getByText("待删除文件夹")).not.toBeVisible({
      timeout: 5000,
    });
  });
});
