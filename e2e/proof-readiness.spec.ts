import { expect, test, type Page } from '@playwright/test';

async function startProofCheck(page: Page) {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.getByRole('button', { name: 'Open the interactive demo' }).click();
  await expect(page.getByRole('heading', { name: 'What are you trying to protect?' })).toBeVisible();
  await page.getByRole('button', { name: 'Homeowner/renter' }).click();
  await page.getByRole('button', { name: 'Theft or burglary' }).click();
  await expect(page.getByRole('heading', { name: 'Most people cannot prove what they own fast enough.' })).toBeVisible();
  await page.getByRole('button', { name: 'Start my Top 10 Assets Challenge' }).click();
  await expect(page.getByRole('heading', { name: 'Find out whether your valuables are claim-ready.' })).toBeVisible();
}

async function addMinimalItem(page: Page, number: number) {
  await page.getByRole('button', { name: 'Add one item' }).first().click();
  await page.getByLabel('Item name').fill(`Challenge item ${number}`);
  await page.getByRole('combobox', { name: 'Location' }).fill('Home');
  await page.getByRole('button', { name: 'Save item' }).click();
  if (number < 10) await page.getByRole('button', { name: 'Inventory' }).first().click();
}

test.describe('AssetVault Proof Check activation', () => {
  test('guides a visitor to the Top 10 challenge and shows proof-readiness gaps', async ({ page }) => {
    await startProofCheck(page);
    await expect(page.getByText('TOP 10 ASSETS CHALLENGE', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '5/10 assets documented' })).toBeVisible();
    await expect(page.getByText('YOUR PROOF READINESS')).toBeVisible();
    await expect(page.getByText('Missing serials')).toBeVisible();
    await expect(page.getByText('Missing owner-applied markings')).toBeVisible();
    await expect(page.getByText('Missing receipts/appraisals')).toBeVisible();
  });

  test('keeps high-intent Proof Check limits outcome-focused and unlocks Complete preview', async ({ page }) => {
    await startProofCheck(page);
    await page.getByRole('button', { name: 'Inventory' }).click();
    await page.getByText('Milwaukee M18 Brushless Drill').click();
    await expect(page.getByRole('button', { name: 'Estimate replacement cost' })).toBeDisabled();
    await page.getByRole('button', { name: 'Preview AssetVault Complete' }).click();
    await expect(page.getByText(/AssetVault Complete preview enabled/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Estimate replacement cost' })).toBeEnabled();

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('Referral code').fill('READY10');
    await expect(page.getByLabel('Referral code')).toHaveValue('READY10');
    await expect(page.getByText('Partner & referral placeholder')).toBeVisible();
  });

  test('shows the one-time Incident Packet path on Proof Check', async ({ page }) => {
    await startProofCheck(page);
    await page.getByRole('button', { name: 'Incident', exact: true }).click();
    await page.getByRole('button', { name: 'Garage burglary Burglary · 2026-06-28 · 1 affected item' }).click();
    await expect(page.getByRole('heading', { name: 'Need a polished police and insurance packet?' })).toBeVisible();
    await expect(page.getByText('Create one Incident Packet for $39, or get the packet plus one year of AssetVault Complete for $59.')).toBeVisible();
  });

  test('reaches the Top 10 milestone and offers a non-obtrusive share prompt', async ({ page }) => {
    await startProofCheck(page);
    for (let number = 6; number <= 10; number += 1) await addMinimalItem(page, number);
    await expect(page.getByRole('heading', { name: 'You reached Top 10 Assets Challenge.' })).toBeVisible();
    await page.getByRole('button', { name: 'Not now' }).click();
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await expect(page.getByRole('heading', { name: '10/10 assets documented' })).toBeVisible();
  });
});
