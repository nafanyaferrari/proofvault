import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const liveUrl = process.env.LIVE_E2E_URL;
const here = path.dirname(fileURLToPath(import.meta.url));
const photoFixture = path.join(here, '..', 'tests', 'fixtures', 'item-photo.svg');

test.describe('live photo provider smoke test', () => {
  test.skip(process.env.RUN_LIVE_PHOTO_TESTS !== 'true' || !liveUrl, 'Live requests are opt-in so routine tests never consume a provider allowance.');

  test('production turns a photo into a non-mock review draft', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('pv-account-mode', 'local');
    });
    await page.goto(liveUrl!);
    await expect(page.getByRole('heading', { name: 'Document your home without the paperwork.' })).toBeVisible();
    await page.getByRole('button', { name: 'Inventory' }).click();

    const responsePromise = page.waitForResponse(response => response.url().includes('/api/analyze-item') && response.request().method() === 'POST');
    await page.getByLabel('Choose one item photo for photo analysis').setInputFiles(photoFixture);
    const response = await responsePromise;
    const payload = await response.json() as {
      providersUsed?: string[];
      suggestedDescription?: string;
      draft?: { itemName?: string; userDescription?: string };
    };

    expect(response.status(), `Live intake response: ${JSON.stringify(payload)}`).toBe(200);
    expect(payload.providersUsed?.[0]).toMatch(/gemini-vision|openai-vision/);
    expect(payload.draft?.itemName?.trim().length).toBeGreaterThan(2);
    expect(payload.suggestedDescription?.trim().length).toBeGreaterThan(20);

    await expect(page.getByText('REVIEW PHOTO DRAFT')).toBeVisible();
    await expect(page.getByLabel('Item name', { exact: true })).toHaveValue(payload.draft!.itemName!);
    await page.locator('details.moreDetails > summary').click();
    await expect(page.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue(payload.draft!.userDescription!);
  });
});
