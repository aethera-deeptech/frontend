import { expect, test } from '@playwright/test';

test('the page does not scroll sideways', async ({ page }) => {
  await page.goto('/');

  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - window.innerWidth;
  });

  expect(overflow).toBeLessThanOrEqual(0);
});
