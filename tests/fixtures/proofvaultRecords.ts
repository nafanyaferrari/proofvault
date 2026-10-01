import type { Incident, InventoryItem } from '../../packages/domain/src/types';

const now = '2026-09-30T12:00:00.000Z';
const evidence = 'data:image/svg+xml;base64,PHN2Zy8+';

export function makeInventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'fixture-item', itemName: 'Fixture item', category: 'Other', location: 'Home', condition: 'used',
    comparableListings: [], photos: [], serialPhotos: [], markingPhotos: [], receiptFiles: [], appraisalFiles: [], warrantyFiles: [],
    status: 'normal', createdAt: now, updatedAt: now, ...overrides,
  };
}

export const protocolItems: InventoryItem[] = [
  makeInventoryItem({
    id: 'milwaukee-drill', itemName: 'Milwaukee M18 Fuel Drill', category: 'Tools', location: 'Garage', make: 'Milwaukee', model: 'M18 Fuel', serialNumber: 'MIL-123456789',
    ownerMarking: 'NF written in black marker inside battery compartment', markingType: 'initials', markingLocation: 'inside battery slot', userEnteredValue: 249.99,
    photos: [evidence], serialPhotos: [evidence], markingPhotos: [evidence], distinguishingFeatures: 'Red drill with two batteries and hard case', receiptFiles: ['data:application/pdf;base64,UEQ='],
  }),
  makeInventoryItem({
    id: 'wedding-ring', itemName: 'Wedding Ring', category: 'Jewelry', location: 'Master Bedroom', ownerMarking: 'Inscription inside band', markingType: 'engraved', markingLocation: 'inner band', userEnteredValue: 4500,
    photos: [evidence], markingPhotos: [evidence], appraisalFiles: ['data:application/pdf;base64,UEQ='],
  }),
  makeInventoryItem({
    id: 'trek-bike', itemName: 'Trek Mountain Bike', category: 'Bicycle', location: 'Garage', make: 'Trek', serialNumber: 'TREK-987654', userEnteredValue: 850, photos: [evidence], serialPhotos: [evidence],
  }),
  makeInventoryItem({
    id: 'macbook', itemName: 'MacBook Pro', category: 'Electronics', location: 'Office', make: 'Apple', model: 'MacBook Pro', serialNumber: 'APPLE-555555', userEnteredValue: 1800, photos: [evidence], serialPhotos: [evidence],
  }),
  makeInventoryItem({
    id: 'storage-tote', itemName: 'Christmas Storage Tote', category: 'Storage', location: 'Storage Unit', ownerMarking: 'QR asset label PV-UNIT-003', markingType: 'QR/asset tag', markingLocation: 'top right of tote lid', userEnteredValue: 150, photos: [evidence], markingPhotos: [evidence],
  }),
];

export const protocolIncident: Incident = {
  id: 'burglary-incident', title: 'Garage burglary', type: 'Burglary', incidentDate: '2026-09-29', location: 'Home garage',
  policeAgency: 'Example Police Department', policeCaseNumber: 'CASE-2026-77', insuranceCompany: 'Example Mutual', insuranceClaimNumber: 'CLAIM-42',
  notes: 'Rear garage door forced open.', createdAt: now,
  items: [
    { itemId: 'milwaukee-drill', status: 'stolen', notes: 'Case and batteries were also taken.', photos: [evidence] },
    { itemId: 'macbook', status: 'missing' },
  ],
};
