import test from 'node:test';
import assert from 'node:assert/strict';
import { seedItems } from '../src/data';
import { binderDocumentCount, expiringWarranties, maintenanceEntries, nextMaintenanceDate } from '../src/services/homeBinderService';

test('maintenance sorts overdue work before upcoming work and identifies due-soon tasks', () => {
  const today = new Date('2026-07-28T12:00:00');
  const entries = maintenanceEntries([
    { ...seedItems[0], id: 'later', maintenanceTask: 'Later', maintenanceDueAt: '2026-10-02' },
    { ...seedItems[0], id: 'overdue', maintenanceTask: 'Overdue', maintenanceDueAt: '2026-07-20' },
    { ...seedItems[0], id: 'soon', maintenanceTask: 'Soon', maintenanceDueAt: '2026-08-10' }
  ], today);
  assert.deepEqual(entries.map(entry => entry.item.id), ['overdue', 'soon', 'later']);
  assert.equal(entries[0].state, 'overdue');
  assert.equal(entries[1].state, 'due-soon');
  assert.equal(entries[2].state, 'upcoming');
});

test('completion schedule preserves sensible calendar dates', () => {
  assert.equal(nextMaintenanceDate('2026-01-31', 1), '2026-02-28');
  assert.equal(nextMaintenanceDate('2026-11-30', 3), '2027-02-28');
});

test('home binder collects expiring warranties and all saved references', () => {
  const today = new Date('2026-07-28T12:00:00');
  const expiring = expiringWarranties([{ ...seedItems[0], warrantyExpiresAt: '2026-08-01' }, { ...seedItems[1], warrantyExpiresAt: '2027-02-01' }], today);
  assert.equal(expiring.length, 1);
  assert.equal(binderDocumentCount({ ...seedItems[0], receiptFiles: ['receipt'], warrantyFiles: ['warranty'], appraisalFiles: [], manualUrl: 'https://example.com/manual' }), 3);
});
