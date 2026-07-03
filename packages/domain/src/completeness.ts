import type { InventoryItem } from './types';

export function completenessScore(item: InventoryItem) {
  const score = (item.photos.length ? 15 : 0) + (item.serialNumber || item.ownerMarking ? 15 : 0) +
    (item.serialPhotos.length || item.markingPhotos.length ? 10 : 0) + (item.make && item.model ? 10 : 0) +
    (item.userEnteredValue ? 8 : 0) + (item.estimatedReplacementValueSelected ? 8 : 0) +
    (item.comparableListings.length ? 7 : 0) + (item.receiptFiles.length || item.appraisalFiles.length ? 12 : 0) +
    (item.distinguishingFeatures ? 8 : 0) + (item.location ? 7 : 0);
  const label = score >= 90 ? 'Excellent record' : score >= 70 ? 'Strong record' : score >= 45 ? 'Good record' : 'Weak record';
  const next = !item.photos.length ? 'Add an item photo.' : !(item.receiptFiles.length || item.appraisalFiles.length) ? 'Add a receipt or appraisal to improve this.' : 'This item is well documented.';
  return { score, label, feedback: `${label}: ${next}` };
}
