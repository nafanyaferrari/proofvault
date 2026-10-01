import { completenessScore } from './completeness';
import type { InventoryItem, ItemStatus } from './types';

/**
 * Shared inventory search and filter rules. Keeping these outside either UI
 * prevents the web and mobile apps from silently disagreeing about what a
 * recoverable identifier is.
 */
export interface InventoryFilters {
  query?: string;
  category?: string;
  location?: string;
  status?: ItemStatus;
  hasSerialNumber?: boolean;
  hasOwnerMarking?: boolean;
  missingValue?: boolean;
  missingPhotos?: boolean;
  lowDocumentation?: boolean;
  includeArchived?: boolean;
}

const normalized = (value?: string) => value?.trim().toLocaleLowerCase() ?? '';

export function inventorySearchText(item: InventoryItem) {
  return [
    item.itemName,
    item.category,
    item.location,
    item.room,
    item.make,
    item.model,
    item.serialNumber,
    item.barcode,
    item.ownerMarking,
    item.markingType,
    item.markingLocation,
    item.distinguishingFeatures,
  ].filter(Boolean).join(' ').toLocaleLowerCase();
}

export function filterInventoryItems(items: InventoryItem[], filters: InventoryFilters = {}) {
  const query = normalized(filters.query);
  const category = normalized(filters.category);
  const location = normalized(filters.location);

  return items.filter(item => {
    if (!filters.includeArchived && item.archivedAt) return false;
    if (filters.includeArchived && !item.archivedAt) return false;
    if (query && !inventorySearchText(item).includes(query)) return false;
    if (category && normalized(item.category) !== category) return false;
    if (location && normalized(item.location) !== location) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.hasSerialNumber && !item.serialNumber?.trim()) return false;
    if (filters.hasOwnerMarking && !item.ownerMarking?.trim()) return false;
    if (filters.missingValue && (item.userEnteredValue || item.estimatedReplacementValueSelected)) return false;
    if (filters.missingPhotos && item.photos.length > 0) return false;
    if (filters.lowDocumentation && completenessScore(item).score >= 45) return false;
    return true;
  });
}
