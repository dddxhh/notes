import { test, expect } from '@playwright/test';

test.describe('存储层 E2E', () => {
  test('wa-sqlite 应在浏览器中正常初始化', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('快速笔记')).toBeVisible({ timeout: 15000 });
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('Error');
    expect(bodyText).not.toContain('error');
  });

  test('创建笔记应可写入数据库', async ({ page }) => {
    await page.goto('/');
    const textarea = page.getByPlaceholder('想写点什么？');
    await expect(textarea).toBeVisible({ timeout: 15000 });
    await textarea.fill('数据库测试笔记');
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: /^数据库测试笔记/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test('IndexedDB VFS 数据应在页面刷新后持久保存', async ({ page, context }) => {
    await page.goto('/');
    const textarea = page.getByPlaceholder('想写点什么？');
    await expect(textarea).toBeVisible({ timeout: 15000 });

    await textarea.fill('持久化测试笔记');
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: /^持久化测试笔记/ }).first()).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.getByText('快速笔记')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /^持久化测试笔记/ }).first()).toBeVisible({ timeout: 10000 });
  });
});