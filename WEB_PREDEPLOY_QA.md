# ProofVault web pre-deploy QA

Run this against the local or preview web build before approving a production deploy.

## Fast intake

1. Open Inventory.
2. Set a batch location and room/area in the fast-intake card.
3. Tab to **Photograph & prefill** and confirm Enter/Space opens the file picker.
4. Choose a normal item photo.
5. Confirm the item form opens as a new item, not an edit.
6. Confirm the batch location and room/area are prefilled.
7. Refresh the page and confirm the batch location and room/area are remembered locally.
8. Confirm the AI-prefilled warning is visible.
9. Confirm the warning says no-cloud demo mode uses a fixed simulated recognition result.
10. Confirm any intake-service warnings appear in the review card before saving.
11. Confirm photo, description, make/model, and serial candidate are editable.
12. Save with **Save & add another** and confirm the app returns to Inventory.
13. Confirm the **Bulk review queue** shows follow-up items and lists all remaining checks for each queued item when records still need verification, value, photo, or supporting document evidence.
14. Use **Review next** and confirm the top queued item opens directly in edit mode.
15. Save the reviewed item and confirm the AI-prefill review flag clears, while any remaining serial/value/photo/document flags stay visible.
16. If an item has a serial candidate, enter a confirmed serial from the quick-check list and confirm the serial verification flag clears.
17. If an item has no manual or assisted value, enter a quick manual value from the quick-check list and confirm the value flag clears.
18. Open a queued item and confirm the item detail screen shows the same quick-check list with an edit action.
19. Type into a quick serial/value field, switch to another item, and confirm the quick-entry field is cleared so stale text cannot be saved to the wrong item.
20. When all active items are complete enough, confirm the queue shows a clear-backlog confirmation instead of disappearing silently.
21. From Overview, click the **Need quick review** metric and confirm it opens Inventory with the review queue visible.

## Replacement Value Assist

1. In Settings, switch to Free.
2. Open an item and confirm automatic lookup is locked while manual value entry works.
3. Switch to Premium.
4. Run **Find Comparable Values** and confirm range, confidence, comparable listings, checked date, and disclaimer appear.

## Incidents and exports

1. Create or edit an incident with at least one affected item.
2. Confirm copy, CSV, print/save PDF, and share controls are present.
3. Confirm Premium exports include comparable links and Free exports omit marketplace links.

## Storage and reset

1. Open Settings and confirm browser storage meter appears or explains unavailable estimate.
2. Download a backup.
3. Choose **Reset demo data**, cancel once, then confirm once.
4. Confirm inventory, incident sample data, locations, and Free plan reset.

## Mobile backup smoke check

1. In mobile Settings, export the SQLite database backup.
2. Export the attachment manifest and confirm the JSON summary lists inventory and incident attachment counts.
3. Confirm the Settings copy still explains that app-private photo/document binaries are not embedded in the database-only backup.

## Mobile bulk-entry smoke check

1. Start a manual mobile inventory item and confirm **Save & add another** saves it and reopens a blank item form.
2. Start a photo-assisted mobile intake item and confirm **Save & photograph another** saves it and returns to the camera/photo intake flow.
3. Confirm normal **Save item** still closes the editor after saving.

## Final local checks

```bash
npm run build
npm test
git diff --check
```
