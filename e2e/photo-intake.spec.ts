import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const photoFixture = path.join(here, '..', 'tests', 'fixtures', 'item-photo.svg');

const analysisResponse = {
  draft: {
    itemName: 'Makita XDT19 impact driver kit', category: 'Tools', location: 'Garage', room: 'Workbench',
    make: 'Makita', model: 'XDT19', serialNumber: 'VERIFY-MKT-48291', barcode: '', ownerMarking: '',
    markingType: '', markingLocation: '', markingNotes: '', distinguishingFeatures: 'Teal impact driver with battery and bit case',
    purchaseDate: '', userDescription: 'Makita XDT19 cordless impact driver kit with battery and bit case. Verify the serial number from its label.',
    notes: 'Created by secure backend photo analysis. User must verify all suggested identifiers.', condition: 'used', status: 'normal'
  },
  suggestedTitle: 'Makita XDT19 impact driver kit',
  suggestedDescription: 'Makita XDT19 cordless impact driver kit with battery and bit case. Verify the serial number from its label.',
  fields: {
    make: { value: 'Makita', confidence: 'high', source: 'gemini-vision' },
    model: { value: 'XDT19', confidence: 'high', source: 'gemini-vision' },
    serialNumber: { value: 'VERIFY-MKT-48291', confidence: 'low', source: 'gemini-vision' }
  },
  warnings: ['Serial-number candidates must be verified against the physical item.'],
  needsSerialVerification: true,
  providersUsed: ['gemini-vision'],
  valuation: {
    estimatedReplacementValueLow: 129, estimatedReplacementValueHigh: 199, suggestedReplacementValue: 164,
    confidence: 'high', sourceSummary: '3 comparable listings across 3 sources', comparableListings: [], missingFields: [],
    disclaimer: 'This is an approximate replacement estimate based on comparable marketplace listings.'
  }
};

async function openLocalDemo(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('pv-account-mode', 'local');
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Document your home without the paperwork.' })).toBeVisible();
}

test.describe('photo-to-description intake', () => {
  test('turns an uploaded item photo into a clearly marked, reviewable description draft', async ({ page }) => {
    const requests: unknown[] = [];
    await page.route('**/api/analyze-item', async route => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(analysisResponse) });
    });

    await openLocalDemo(page);
    await page.getByRole('button', { name: 'Inventory' }).click();
    await page.getByLabel('Choose one item photo for photo analysis').setInputFiles(photoFixture);

    await expect(page.getByText('REVIEW PHOTO DRAFT')).toBeVisible();
    await expect(page.getByText('Photo intake prefilled this draft')).toBeVisible();
    await expect(page.getByLabel('Item name', { exact: true })).toHaveValue('Makita XDT19 impact driver kit');
    await expect(page.getByLabel('Make', { exact: true })).toHaveValue('Makita');
    await expect(page.getByLabel('Model', { exact: true })).toHaveValue('XDT19');
    await expect(page.getByLabel('Serial Number (SN)', { exact: true })).toHaveValue('VERIFY-MKT-48291');
    await expect(page.getByText(/Serial-number candidates must be verified/i)).toBeVisible();
    expect(requests).toHaveLength(1);
    expect((requests[0] as { photos: unknown[]; includeValuation: boolean }).photos).toHaveLength(1);
    expect((requests[0] as { includeValuation: boolean }).includeValuation).toBe(true);

    await page.getByRole('button', { name: 'Save item' }).click();
    await expect(page.getByText('Item added to inventory.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Makita XDT19 impact driver kit' })).toBeVisible();
  });

  test('creates a short bulk-review flow when the analysis finds more than one item', async ({ page }) => {
    const secondCandidate = {
      ...analysisResponse.draft,
      itemName: 'DeWalt DCB205 battery pack', make: 'DeWalt', model: 'DCB205', serialNumber: '',
      userDescription: 'DeWalt 20V MAX battery pack visible beside the primary tool.'
    };
    await page.route('**/api/analyze-item', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ...analysisResponse, candidates: [analysisResponse.draft, secondCandidate] })
    }));

    await openLocalDemo(page);
    await page.getByRole('button', { name: 'Inventory' }).click();
    await page.getByLabel('Choose overview and close-up photos of one item').setInputFiles([
      { name: 'overview.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32"/></svg>') },
      { name: 'label.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="teal"/></svg>') }
    ]);

    await expect(page.getByText('QUICK REVIEW')).toBeVisible();
    await expect(page.getByText('2 drafts waiting')).toBeVisible();
    await expect(page.getByLabel('Make', { exact: true })).toHaveValue('Makita');
    await page.getByRole('button', { name: 'Save this item' }).click();
    await expect(page.getByText('1 draft waiting')).toBeVisible();
    await expect(page.getByLabel('Make', { exact: true })).toHaveValue('DeWalt');
  });

  test('labels development fallback output instead of presenting it as live photo analysis', async ({ page }) => {
    await page.route('**/api/analyze-item', route => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Photo analysis is temporarily busy.', code: 'AI_PROVIDER_UNAVAILABLE' })
    }));

    await openLocalDemo(page);
    await page.getByRole('button', { name: 'Inventory' }).click();
    await page.getByLabel('Choose one item photo for photo analysis').setInputFiles(photoFixture);

    await expect(page.getByText('REVIEW PHOTO DRAFT')).toBeVisible();
    await expect(page.getByText(/Secure photo analysis was unavailable, so ProofVault used a local sample result/i)).toBeVisible();
    await expect(page.getByLabel('Make', { exact: true })).toHaveValue('Milwaukee');
  });
});

test('landing, pricing, coverage, and home-binder navigation render on desktop and mobile', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByRole('heading', { name: 'Protect your home records for less while ProofVault grows.' })).toBeVisible();

  await openLocalDemo(page);
  await page.getByRole('button', { name: 'Coverage Center' }).click();
  await expect(page.getByRole('heading', { name: 'See what is ready—and what could cost you later.' })).toBeVisible();
  await page.getByRole('button', { name: 'Home Binder' }).click();
  await expect(page.getByRole('heading', { name: 'Keep the useful household details in one place.' })).toBeVisible();
});
