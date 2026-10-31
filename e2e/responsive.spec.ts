import { expect, test } from '@playwright/test';

test('the page does not scroll sideways', async ({ page }) => {
  await page.goto('/');
  // wait for React to render, because an empty page cannot overflow and the test would pass without checking anything
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - window.innerWidth;
  });

  expect(overflow).toBeLessThanOrEqual(0);
});
