import { InventoryItem } from '../types';

export type MaintenanceState = 'overdue' | 'due-soon' | 'upcoming';
export interface MaintenanceEntry { item: InventoryItem; state: MaintenanceState; daysUntil: number; }

const calendarDate = (value: string) => new Date(`${value}T12:00:00`);
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dayMs = 86_400_000;

export const nextMaintenanceDate = (from: string, cadenceMonths: number) => {
  const base = calendarDate(from);
  const desiredDay = base.getDate();
  const result = new Date(base.getFullYear(), base.getMonth() + cadenceMonths, 1, 12);
  const finalDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(desiredDay, finalDay));
  return dateKey(result);
};

export const maintenanceEntries = (items: InventoryItem[], today = new Date()): MaintenanceEntry[] => {
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime();
  return items.filter(item => Boolean(item.maintenanceTask && item.maintenanceDueAt && !item.archivedAt)).map(item => {
    const daysUntil = Math.round((calendarDate(item.maintenanceDueAt!).getTime() - todayStart) / dayMs);
    const state: MaintenanceState = daysUntil < 0 ? 'overdue' : daysUntil <= 30 ? 'due-soon' : 'upcoming';
    return { item, daysUntil, state };
  }).sort((a, b) => a.daysUntil - b.daysUntil);
};

export const expiringWarranties = (items: InventoryItem[], today = new Date()) => {
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime();
  return items.filter(item => Boolean(item.warrantyExpiresAt && !item.archivedAt)).map(item => ({
    item,
    daysUntil: Math.round((calendarDate(item.warrantyExpiresAt!).getTime() - todayStart) / dayMs)
  })).filter(entry => entry.daysUntil <= 90).sort((a, b) => a.daysUntil - b.daysUntil);
};

export const binderDocumentCount = (item: InventoryItem) => item.receiptFiles.length + item.warrantyFiles.length + item.appraisalFiles.length + (item.manualUrl ? 1 : 0);
