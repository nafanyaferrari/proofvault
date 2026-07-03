import type { SQLiteDatabase } from 'expo-sqlite';
import type { InventoryItem } from '@proofvault/domain';
import { schema } from './schema';

type ItemRow = { id: string; item_name: string; category: string; location_text: string; make: string | null; model: string | null; serial_number: string | null; user_entered_value: number | null; condition: InventoryItem['condition']; status: InventoryItem['status']; created_at: string; updated_at: string };

const emptyEvidence = { comparableListings: [], photos: [], serialPhotos: [], markingPhotos: [], receiptFiles: [], appraisalFiles: [], warrantyFiles: [] };
const fromRow = (row: ItemRow): InventoryItem => ({ id: row.id, itemName: row.item_name, category: row.category, location: row.location_text, make: row.make ?? undefined, model: row.model ?? undefined, serialNumber: row.serial_number ?? undefined, userEnteredValue: row.user_entered_value ?? undefined, condition: row.condition, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, ...emptyEvidence });

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(schema);
  const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM inventory_items');
  if (!result?.count) {
    const now = new Date().toISOString();
    await db.runAsync('INSERT INTO inventory_items (id,item_name,category,location_text,make,model,serial_number,user_entered_value,condition,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', 'item_demo_drill', 'M18 Drill/Driver Kit', 'Tools', 'Garage', 'Milwaukee', 'M18', 'PV-M18-48291', 225, 'used', 'normal', now, now);
  }
}

export async function listInventory(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<ItemRow>('SELECT id,item_name,category,location_text,make,model,serial_number,user_entered_value,condition,status,created_at,updated_at FROM inventory_items WHERE archived_at IS NULL ORDER BY updated_at DESC');
  return rows.map(fromRow);
}
