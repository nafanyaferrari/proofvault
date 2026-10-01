import assert from 'node:assert/strict';
import test from 'node:test';
import type { SQLiteDatabase } from 'expo-sqlite';
import { protocolIncident, protocolItems } from './fixtures/proofvaultRecords.ts';
import { getLatestValuation, initializeDatabase, listInventory, saveInventoryItem, saveValuation } from '../apps/mobile/src/db/inventoryRepository.ts';
import { saveIncidentRecord } from '../apps/mobile/src/db/incidentRepository.ts';
import type { InventoryDraft } from '../packages/domain/src/types.ts';

type Call = { sql: string; args: unknown[] };

class RepositoryDb {
  readonly calls: Call[] = [];
  inventoryRows: unknown[] = [];
  async execAsync(sql: string) { this.calls.push({ sql, args: [] }); }
  async runAsync(sql: string, ...args: unknown[]) { this.calls.push({ sql, args }); return { changes: 1 }; }
  async getFirstAsync<T>(sql: string, ...args: unknown[]): Promise<T | null> {
    this.calls.push({ sql, args });
    if (sql.includes('COUNT(*)')) return { count: 1 } as T;
    if (sql.includes('valuation_records')) return null;
    return null;
  }
  async getAllAsync<T>(sql: string, ...args: unknown[]): Promise<T[]> {
    this.calls.push({ sql, args });
    if (sql.includes('PRAGMA table_info(incidents)')) return [];
    if (sql.includes('PRAGMA table_info(inventory_items)')) return [];
    if (sql.includes('FROM inventory_items WHERE archived_at IS NULL')) return this.inventoryRows as T[];
    return [];
  }
  async withTransactionAsync(callback: () => Promise<void>) { await callback(); }
}

const draft: InventoryDraft = {
  itemName: 'Milwaukee M18 Fuel Drill', category: 'Tools', location: 'Garage', room: 'Workbench', make: 'Milwaukee', model: 'M18 Fuel', serialNumber: 'MIL-123456789', barcode: '',
  ownerMarking: 'NF written in black marker', markingType: 'initials', markingLocation: 'inside battery slot', markingNotes: 'Hidden under battery', distinguishingFeatures: 'Red tool case', purchaseDate: '', purchasePrice: undefined,
  userDescription: 'Cordless drill kit.', notes: '', userEnteredValue: 249.99, condition: 'used', status: 'normal',
};

test('mobile repository creates, reloads, and preserves owner marking fields', async () => {
  const fake = new RepositoryDb();
  await initializeDatabase(fake as unknown as SQLiteDatabase);
  const itemId = await saveInventoryItem(fake as unknown as SQLiteDatabase, draft);
  assert.match(itemId, /^item_/);
  const insert = fake.calls.find(call => call.sql.startsWith('INSERT INTO inventory_items'));
  assert.ok(insert);
  assert.ok(insert.args.includes('NF written in black marker'));
  assert.ok(insert.args.includes('inside battery slot'));

  fake.inventoryRows = [{
    id: itemId, item_name: draft.itemName, ai_suggested_title: null, ai_description: null, ai_fields_reviewed_at: null, category: draft.category, location_text: draft.location, room: draft.room,
    make: draft.make, model: draft.model, serial_number: draft.serialNumber, barcode: null, owner_marking: draft.ownerMarking, marking_type: draft.markingType, marking_location: draft.markingLocation,
    marking_notes: draft.markingNotes, distinguishing_features: draft.distinguishingFeatures, purchase_date: null, purchase_price: null, user_description: draft.userDescription, notes: null, user_entered_value: draft.userEnteredValue,
    condition: draft.condition, status: draft.status, archived_at: null, created_at: '2026-09-30T12:00:00.000Z', updated_at: '2026-09-30T12:00:00.000Z',
  }];
  const items = await listInventory(fake as unknown as SQLiteDatabase);
  assert.equal(items[0].serialNumber, 'MIL-123456789');
  assert.equal(items[0].ownerMarking, 'NF written in black marker');
  assert.equal(items[0].markingLocation, 'inside battery slot');
});

test('mobile repository persists comparable listings and incident item status transactionally', async () => {
  const fake = new RepositoryDb();
  const sourceItem = protocolItems[0];
  const valuation = {
    estimatedReplacementValueLow: 199, estimatedReplacementValueHigh: 279, suggestedReplacementValue: 249, confidence: 'high' as const, sourceSummary: 'Three exact comparables', missingFields: [],
    disclaimer: 'This is an approximate replacement estimate based on comparable marketplace listings. It is not an appraisal, guarantee of coverage, or confirmed insurance value.',
    comparableListings: [{ id: 'listing-1', title: 'Milwaukee M18 Fuel Drill', marketplace: 'Retailer', condition: 'new' as const, price: 249, currency: 'USD', url: 'https://example.com/m18', matchReason: 'Exact make/model', matchConfidence: 'high' as const, checkedAt: '2026-09-30T12:00:00.000Z' }],
  };
  await saveValuation(fake as unknown as SQLiteDatabase, sourceItem.id, valuation);
  assert.ok(fake.calls.some(call => call.sql.startsWith('INSERT INTO valuation_records')));
  assert.ok(fake.calls.some(call => call.sql.startsWith('INSERT INTO comparable_listings') && call.args.includes('https://example.com/m18')));

  await saveIncidentRecord(fake as unknown as SQLiteDatabase, {
    title: protocolIncident.title, type: protocolIncident.type, incidentDate: protocolIncident.incidentDate, location: protocolIncident.location,
    ownerName: '', ownerPhone: '', ownerEmail: '', ownerAddress: '', policeAgency: protocolIncident.policeAgency ?? '', policeCaseNumber: protocolIncident.policeCaseNumber ?? '',
    insuranceCompany: protocolIncident.insuranceCompany ?? '', insuranceClaimNumber: protocolIncident.insuranceClaimNumber ?? '', notes: protocolIncident.notes ?? '', items: protocolIncident.items,
  });
  assert.ok(fake.calls.some(call => call.sql.startsWith('INSERT INTO incidents')));
  assert.ok(fake.calls.some(call => call.sql.startsWith('INSERT INTO incident_items') && call.args.includes('stolen')));
});

test('mobile hydration leaves a missing valuation safe and returns the base item record', async () => {
  const fake = new RepositoryDb();
  const item = protocolItems[1];
  const hydrated = await getLatestValuation(fake as unknown as SQLiteDatabase, item);
  assert.equal(hydrated.id, item.id);
  assert.equal(hydrated.ownerMarking, 'Inscription inside band');
  assert.deepEqual(hydrated.comparableListings, []);
});
