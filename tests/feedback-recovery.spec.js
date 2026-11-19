import { test, expect } from '@playwright/test';

test('feedback renders when the optional HTML caption is absent', async ({ page, baseURL }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    const html = (await response.text()).replace(/<p\b[^>]*id="feedback-preview-label"[^>]*>[\s\S]*?<\/p>/, '');
    await route.fulfill({ response, body: html });
  });
  await page.goto(baseURL);
  const viewport = page.getByRole('region', { name: 'Dải phản hồi' });
  await expect(viewport).toBeVisible();
  await expect(viewport.locator('.feedback-group:not([aria-hidden]) .feedback-slide')).toHaveCount(16);
  await expect(page.locator('#feedback-rating')).toBeVisible();
  await expect(page.locator('#feedback-empty')).toBeHidden();
  await expect(page.locator('#feedback-preview-label')).toBeVisible();
  await expect(page.locator('#feedback-preview-label')).toHaveCount(1);
  expect(errors).toEqual([]);
});
