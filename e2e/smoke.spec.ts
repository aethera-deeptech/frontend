import { expect, test } from './fixtures';

test('the home page shows its heading and the menu', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'Beranda' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Menu utama' })).toBeVisible();
});

test('an unknown path still loads the app', async ({ page }) => {
  const response = await page.goto('/halaman-yang-tidak-ada');

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Halaman tidak ditemukan' }),
  ).toBeVisible();
});

test('the page logs no console errors', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  expect(errors).toEqual([]);
});
