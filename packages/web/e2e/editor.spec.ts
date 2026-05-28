import { test, expect } from "@playwright/test";

test.describe("编辑器 E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    await expect(page.getByText("快速笔记")).toBeVisible({ timeout: 15000 });
  });

  async function openNoteInEditor(page: any, title: string) {
    const textarea = page.getByPlaceholder("想写点什么？");
    await textarea.fill(title);
    await page.waitForTimeout(1000);
    const noteCard = page.getByRole("button", { name: new RegExp(`^${title}`) }).first();
    await expect(noteCard).toBeVisible({ timeout: 10000 });
    await noteCard.click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
  }

  test("应在 WYSIWYG 编辑器中输入内容", async ({ page }) => {
    await openNoteInEditor(page, "编辑器输入测试");

    const editorArea = page.locator(".tiptap");
    await editorArea.click();
    await editorArea.pressSequentially("Hello World 编辑器测试");
    await page.waitForTimeout(1000);

    await expect(page.locator(".tiptap").getByText("Hello World")).toBeVisible();
    await expect(page.getByText("自动保存")).toBeVisible();
  });

  test("应在工具栏切换粗体格式", async ({ page }) => {
    await openNoteInEditor(page, "粗体测试");

    const boldBtn = page.getByTitle("粗体");
    await boldBtn.click();

    const editorArea = page.locator(".tiptap");
    await editorArea.click();
    await editorArea.pressSequentially("Bold Text");

    await expect(page.locator("strong")).toHaveText(/Bold Text/);
  });

  test("应在工具栏切换斜体格式", async ({ page }) => {
    await openNoteInEditor(page, "斜体测试");

    const italicBtn = page.getByTitle("斜体");
    await italicBtn.click();

    const editorArea = page.locator(".tiptap");
    await editorArea.click();
    await editorArea.pressSequentially("Italic Text");

    await expect(page.locator("em")).toHaveText(/Italic Text/);
  });

  test("应在工具栏切换标题1", async ({ page }) => {
    await openNoteInEditor(page, "标题1测试");

    const h1Btn = page.getByTitle("标题1");
    await h1Btn.click();

    const editorArea = page.locator(".tiptap");
    await editorArea.click();
    await editorArea.pressSequentially("Heading One");

    await expect(page.locator("h1")).toHaveText(/Heading One/);
  });

  test("应在工具栏切换标题2", async ({ page }) => {
    await openNoteInEditor(page, "标题2测试");

    const h2Btn = page.getByTitle("标题2");
    await h2Btn.click();

    const editorArea = page.locator(".tiptap");
    await editorArea.click();
    await editorArea.pressSequentially("Heading Two");

    await expect(page.locator("h2")).toHaveText(/Heading Two/);
  });

  test("应在工具栏插入无序列表", async ({ page }) => {
    await openNoteInEditor(page, "列表测试");

    const listBtn = page.getByTitle("无序列表");
    await listBtn.click();

    const editorArea = page.locator(".tiptap");
    await editorArea.click();
    await editorArea.pressSequentially("List Item 1");

    await expect(page.locator("ul li")).toHaveText(/List Item 1/);
  });

  test("应在工具栏插入有序列表", async ({ page }) => {
    await openNoteInEditor(page, "有序列表测试");

    const orderedListBtn = page.getByTitle("有序列表");
    await orderedListBtn.click();

    const editorArea = page.locator(".tiptap");
    await editorArea.click();
    await editorArea.pressSequentially("Ordered Item");

    await expect(page.locator("ol li")).toHaveText(/Ordered Item/);
  });

  test("应在工具栏插入任务列表", async ({ page }) => {
    await openNoteInEditor(page, "任务列表测试");

    const taskBtn = page.getByTitle("任务列表");
    await taskBtn.click();

    const editorArea = page.locator(".tiptap");
    await editorArea.click();
    await editorArea.pressSequentially("Task Item");

    await expect(page.locator(".tiptap li")).toHaveText(/Task Item/);
  });

  test("应在工具栏插入表格", async ({ page }) => {
    await openNoteInEditor(page, "表格测试");

    const tableBtn = page.getByTitle("插入表格");
    await tableBtn.click();

    await expect(page.locator("table")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("td, th")).toHaveCount(9);
  });

  test("应在工具栏插入代码块", async ({ page }) => {
    await openNoteInEditor(page, "代码块测试");

    const codeBtn = page.getByTitle("代码块");
    await codeBtn.click();

    const editorArea = page.locator(".tiptap");
    await editorArea.click();
    await editorArea.pressSequentially("const x = 1;");

    await expect(page.locator("pre code")).toHaveText(/const x = 1/);
  });

  test("应显示字数统计", async ({ page }) => {
    await openNoteInEditor(page, "字数统计测试");

    const editorArea = page.locator(".tiptap");
    await editorArea.click();
    await editorArea.pressSequentially("Count me");

    await expect(page.getByText(/\d+ 字$/)).toBeVisible({ timeout: 5000 });
  });

  test("应在 Markdown 模式中编辑内容", async ({ page }) => {
    await openNoteInEditor(page, "Markdown模式测试");

    const mdBtn = page.getByText("Markdown", { exact: true });
    await mdBtn.click();

    const mdTextarea = page.getByPlaceholder("开始编写 Markdown...");
    await expect(mdTextarea).toBeVisible({ timeout: 10000 });

    await mdTextarea.fill("# Markdown Title\n\nParagraph text");
    await page.waitForTimeout(1000);

    await expect(page.getByText("自动保存")).toBeVisible();
  });

  test("应在 Markdown 编辑器中切换预览模式", async ({ page }) => {
    await openNoteInEditor(page, "Markdown预览测试");

    const mdBtn = page.getByText("Markdown", { exact: true });
    await mdBtn.click();

    const mdTextarea = page.getByPlaceholder("开始编写 Markdown...");
    await expect(mdTextarea).toBeVisible({ timeout: 10000 });
    await mdTextarea.fill("# 预览标题\n\n预览段落");

    const previewBtn = page.getByText("预览", { exact: true });
    await previewBtn.click();

    await expect(page.getByText("预览标题")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("预览段落")).toBeVisible();
  });

  test("应从 Markdown 切换回所见即所得并保留内容", async ({ page }) => {
    await openNoteInEditor(page, "模式切换保留内容");

    const mdBtn = page.getByText("Markdown", { exact: true });
    await mdBtn.click();

    const mdTextarea = page.getByPlaceholder("开始编写 Markdown...");
    await expect(mdTextarea).toBeVisible({ timeout: 10000 });
    await mdTextarea.fill("# 模式切换标题");
    await page.waitForTimeout(1000);

    const wysiwygBtn = page.getByText("富文本", { exact: true });
    await wysiwygBtn.click();

    await expect(page.locator(".tiptap")).toBeVisible({ timeout: 10000 });
  });

  test("应在侧栏中切换显示/隐藏", async ({ page }) => {
    await expect(page.getByTestId("sidebar")).toBeVisible();

    const collapseBtn = page.getByRole("button", { name: "收起侧栏" });
    await collapseBtn.click();

    await expect(page.getByTestId("sidebar")).not.toBeVisible();

    const expandBtn = page.getByLabel("展开侧栏");
    await expandBtn.click();

    await expect(page.getByTestId("sidebar")).toBeVisible();
  });
});
