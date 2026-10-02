import { expect, test } from '@playwright/test';

async function openLocalDemo(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('pv-account-mode', 'local');
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Find out whether your valuables are claim-ready.' })).toBeVisible();
}

test.describe('core documentation and incident protocol', () => {
  test('searches owner markings and combines inventory filters', async ({ page }) => {
    await openLocalDemo(page);
    await page.getByRole('button', { name: 'Inventory' }).click();

    await page.getByLabel('Search inventory').fill('NJR');
    const inventoryRows = page.locator('button.itemrow');
    await expect(inventoryRows).toHaveCount(1);
    await expect(inventoryRows).toContainText('Milwaukee M18 Brushless Drill');

    await page.getByLabel('Search inventory').fill('');
    await page.getByLabel('Filter by category').selectOption('Tools');
    await page.getByLabel('Filter by location').selectOption('Garage');
    await page.getByLabel('Has SN').check();
    await expect(inventoryRows).toHaveCount(1);
    await expect(inventoryRows).toContainText('Milwaukee M18 Brushless Drill');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(inventoryRows).toHaveCount(5);
  });

  test('keeps manual values available when free access locks automatic comparison', async ({ page }) => {
    await openLocalDemo(page);
    await page.getByRole('button', { name: 'Inventory' }).click();
    await page.getByText('Milwaukee M18 Brushless Drill').click();

    await expect(page.getByText('Know what replacement may cost')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Estimate replacement cost' })).toBeDisabled();
    await page.getByLabel('Manual value').fill('275');
    await page.getByRole('button', { name: 'Add manual value' }).click();
    await expect(page.getByText('Manual value saved.')).toBeVisible();
  });

  test('creates an incident with an affected item and renders the export preview', async ({ page }) => {
    await openLocalDemo(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('AssetVault mock subscription plan').selectOption('complete');
    await page.getByRole('button', { name: 'Incident', exact: true }).click();
    await page.getByRole('button', { name: 'New incident' }).click();
    await page.getByLabel('Incident title').fill('Testing burglary');
    await page.getByLabel('Affected location').fill('Garage');
    await page.getByRole('checkbox', { name: /Milwaukee M18 Brushless Drill/i }).check();
    await page.getByRole('button', { name: 'Save incident' }).click();

    await expect(page.getByRole('heading', { name: 'Testing burglary' })).toBeVisible();
    await expect(page.getByText('Claim Ready Report & Law Enforcement Packet')).toBeVisible();
    await page.getByText('Preview plain-text report').click();
    await expect(page.getByText(/Owner-applied marking: NJR/)).toBeVisible();
    await expect(page.getByText(/not an appraisal/i)).toBeVisible();
  });
});
