import assert from 'node:assert/strict';
import test from 'node:test';
import { aiDescriptionService, completenessScore, filterInventoryItems, incidentTextPacket, valuationService } from '../packages/domain/src/index.ts';
import { incidentCsv, incidentReport, printableIncidentHtml } from '../src/services/exportService.ts';
import { makeInventoryItem, protocolIncident, protocolItems } from './fixtures/proofvaultRecords.ts';

test('protocol fixture set contains the five repeatable documentation scenarios', () => {
  assert.deepEqual(protocolItems.map(item => item.id), ['milwaukee-drill', 'wedding-ring', 'trek-bike', 'macbook', 'storage-tote']);
  assert.match(protocolItems[0].ownerMarking ?? '', /NF written/i);
  assert.equal(protocolItems[1].serialNumber, undefined);
  assert.match(protocolItems[4].ownerMarking ?? '', /PV-UNIT-003/);
});

test('inventory search finds serials, owner markings, barcode, make/model, and rooms', () => {
  const items = [...protocolItems, makeInventoryItem({ id: 'barcode', itemName: 'Camera', category: 'Electronics', location: 'Home', room: 'Office shelf', barcode: 'UPC-12345' })];
  for (const query of ['MIL-123456789', 'NF written', 'Trek', 'APPLE-555555', 'PV-UNIT-003', 'UPC-12345', 'Office shelf']) {
    assert.equal(filterInventoryItems(items, { query }).length, 1, `expected one result for ${query}`);
  }
  assert.equal(filterInventoryItems(items, { query: 'not in inventory' }).length, 0);
});

test('inventory filters compose without hiding owner-marked or low-documentation records', () => {
  const weak = makeInventoryItem({ id: 'weak', itemName: 'Lamp', category: 'Furniture', location: 'Office' });
  const records = [...protocolItems, weak];
  assert.deepEqual(filterInventoryItems(records, { category: 'Tools', location: 'Garage', hasSerialNumber: true }).map(item => item.id), ['milwaukee-drill']);
  assert.deepEqual(filterInventoryItems(records, { hasOwnerMarking: true }).map(item => item.id).sort(), ['milwaukee-drill', 'storage-tote', 'wedding-ring']);
  assert.deepEqual(filterInventoryItems(records, { missingValue: true }).map(item => item.id), ['weak']);
  assert.deepEqual(filterInventoryItems(records, { missingPhotos: true }).map(item => item.id), ['weak']);
  assert.deepEqual(filterInventoryItems(records, { lowDocumentation: true }).map(item => item.id), ['weak']);
});

test('completeness treats an owner marking as a first-class identifier', () => {
  const weak = makeInventoryItem({ itemName: 'Lamp', category: 'Furniture' });
  const marked = makeInventoryItem({ itemName: 'Lamp', category: 'Furniture', ownerMarking: 'PV-19', markingLocation: 'underside', markingPhotos: ['data:image/svg+xml;base64,PHN2Zy8+'] });
  const excellent = makeInventoryItem({ ...protocolItems[0], comparableListings: [{ id: 'comp', title: 'M18 Fuel Drill', marketplace: 'Retailer', condition: 'new', price: 249.99, currency: 'USD', url: 'https://example.com/drill', matchReason: 'Exact make and model', matchConfidence: 'high', checkedAt: '2026-09-30T12:00:00.000Z' }] });
  assert.equal(completenessScore(weak).label, 'Weak record');
  assert.ok(completenessScore(marked).score > completenessScore(weak).score);
  assert.equal(completenessScore(excellent).label, 'Excellent record');
});

test('mock description suggestions are explicitly unverified and report missing evidence', async () => {
  const result = await aiDescriptionService.suggest({ photos: [], category: 'Jewelry' });
  assert.equal(result.needsUserVerification, true);
  assert.ok(result.missingRecommendedFields.includes('item photos'));
  assert.ok(result.missingRecommendedFields.includes('serial number or owner marking'));
  assert.match(result.suggestedDescription, /Confirm all identifying details/i);
});

test('mock valuation produces high, medium, low, and no-comparable outcomes safely', async () => {
  const high = await valuationService.findComparableValues(protocolItems[0]);
  const medium = await valuationService.findComparableValues({ itemName: 'Cordless drill', category: 'Tools' });
  const low = await valuationService.findComparableValues({ itemName: 'Decorative vase' });
  const none = await valuationService.findComparableValues({ itemName: 'Unknown item', category: 'Other' });
  assert.equal(high.confidence, 'high');
  assert.equal(medium.confidence, 'medium');
  assert.equal(low.confidence, 'low');
  assert.deepEqual(none.comparableListings, []);
  assert.equal(none.suggestedReplacementValue, 0);
  assert.match(none.sourceSummary, /No suitable/i);
  assert.match(none.disclaimer, /not an appraisal/i);
});

test('incident exports preserve serials, owner markings, valuation disclaimer, and missing case/claim resilience', () => {
  const valuedItems = protocolItems.map(item => item.id === 'milwaukee-drill' ? {
    ...item, estimatedReplacementValueLow: 199, estimatedReplacementValueHigh: 279, estimatedReplacementValueSelected: 249, valuationConfidence: 'high' as const, valuationCheckedAt: '2026-09-30T12:00:00.000Z',
    comparableListings: [{ id: 'listing', title: 'Milwaukee M18 Fuel Drill', marketplace: 'Retailer', condition: 'new' as const, price: 249, currency: 'USD', url: 'https://example.com/m18', matchReason: 'Exact match', matchConfidence: 'high' as const, checkedAt: '2026-09-30T12:00:00.000Z' }],
  } : item);
  const incompleteIncident = { ...protocolIncident, policeCaseNumber: undefined, insuranceClaimNumber: undefined };
  const text = incidentReport(incompleteIncident, valuedItems, 'premium');
  assert.match(text, /Serial Number: MIL-123456789/);
  assert.match(text, /Owner Mark: NF written/i);
  assert.match(text, /Police case: Not recorded/);
  assert.match(text, /Claim: Not recorded/);
  assert.match(text, /example\.com\/m18/);
  assert.match(text, /not an appraisal/i);
  assert.match(incidentCsv(protocolIncident, valuedItems, 'premium'), /https:\/\/example\.com\/m18/);
  assert.match(printableIncidentHtml(protocolIncident, valuedItems, 'premium'), /Comparable listings/);
  assert.match(incidentTextPacket(protocolIncident, valuedItems, 'premium'), /Owner Marking/);
});

test('exporting a long incident preserves every inventory row', () => {
  const items = Array.from({ length: 55 }, (_, index) => makeInventoryItem({ id: `item-${index}`, itemName: `Inventory item ${index}`, serialNumber: `SN-${index}` }));
  const incident = { ...protocolIncident, items: items.map(item => ({ itemId: item.id, status: 'stolen' as const })) };
  const csv = incidentCsv(incident, items, 'free');
  assert.equal(csv.trim().split('\n').length, 56);
  assert.match(incidentReport(incident, items, 'free'), /ITEM: Inventory item 54/);
});
