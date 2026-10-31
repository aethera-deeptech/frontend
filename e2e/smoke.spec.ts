import { expect, test } from '@playwright/test';

test('the home page shows the product name', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'Audit Energi UMKM' })).toBeVisible();
});

test('an unknown path still loads the app', async ({ page }) => {
  const response = await page.goto('/halaman-yang-tidak-ada');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
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
