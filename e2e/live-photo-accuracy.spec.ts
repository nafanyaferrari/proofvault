import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const liveUrl = process.env.LIVE_E2E_URL;
const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureFolder = path.join(here, '..', 'tests', 'fixtures', 'photo-analysis');

const cases = [
  { id: 'cordless drill in garage', file: 'cordless-drill-garage.png', subject: /drill|driver/i },
  { id: 'mirrorless camera in living room', file: 'mirrorless-camera-living-room.png', subject: /camera/i },
  { id: 'laptop in home office', file: 'laptop-home-office.png', subject: /laptop|notebook computer/i },
  { id: 'mountain bike in workshop', file: 'mountain-bike-workshop.png', subject: /mountain bike|bicycle/i },
  { id: 'gold wedding band in bedroom', file: 'wedding-band-bedroom.png', subject: /wedding band|wedding ring|gold ring|ring/i }
];

test.describe('live photo description accuracy', () => {
  test.skip(process.env.RUN_LIVE_PHOTO_TESTS !== 'true' || !liveUrl, 'Live requests are opt-in so routine tests never consume a provider allowance.');

  for (const photoCase of cases) {
    test(`identifies the ${photoCase.id} despite background clutter`, async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem('pv-account-mode', 'local');
      });
      await page.goto(liveUrl!);
      await page.getByRole('button', { name: 'Inventory' }).click();

      const responsePromise = page.waitForResponse(response => response.url().includes('/api/analyze-item') && response.request().method() === 'POST');
      await page.getByLabel('Choose one item photo for photo analysis').setInputFiles(path.join(fixtureFolder, photoCase.file));
      const response = await responsePromise;
      const payload = await response.json() as {
        providersUsed?: string[];
        suggestedDescription?: string;
        draft?: { itemName?: string; userDescription?: string; make?: string; model?: string; serialNumber?: string };
      };
      const observed = [payload.draft?.itemName, payload.suggestedDescription].filter(Boolean).join(' | ');
      console.log(`PHOTO_QA_RESULT ${JSON.stringify({ case: photoCase.id, status: response.status(), provider: payload.providersUsed?.[0], itemName: payload.draft?.itemName, description: payload.suggestedDescription, make: payload.draft?.make, model: payload.draft?.model, serialNumber: payload.draft?.serialNumber })}`);

      expect(response.status(), `Live intake response: ${JSON.stringify(payload)}`).toBe(200);
      expect(payload.providersUsed?.[0]).toMatch(/gemini-vision|openai-vision/);
      expect(payload.draft?.itemName?.trim().length).toBeGreaterThan(2);
      expect(payload.suggestedDescription?.trim().length).toBeGreaterThan(20);
      expect(observed).toMatch(photoCase.subject);
      await expect(page.getByText(/REVIEW PHOTO DRAFT|QUICK REVIEW/)).toBeVisible();
    });
  }
});
