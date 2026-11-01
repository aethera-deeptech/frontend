import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

test('the home page has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  // wait for React to render, because the load event can come before it
  await expect(page.getByRole('heading', { level: 1, name: 'Konveksi Maju Jaya' })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();

  expect(results.violations).toEqual([]);
});
