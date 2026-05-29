import { expect, test } from '@playwright/test';

test.describe('DMS login smoke', () => {
  test('admin can sign in and reach the DMS shell', async ({ page }) => {
    await page.goto('/');

    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();

    await page.getByLabel('아이디').fill('admin');
    await page.getByLabel('비밀번호').fill('admin123!');
    await page.getByRole('button', { name: '로그인' }).click();

    await page.waitForURL('http://127.0.0.1:3001/');
    await expect(page.getByRole('button', { name: '새 도큐먼트' })).toBeVisible();
    await expect(page.getByPlaceholder('찾고 싶은 내용을 자유롭게 물어보세요!')).toBeVisible();
  });
});
