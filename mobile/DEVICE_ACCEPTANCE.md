# ProofVault mobile device acceptance

## Automated checks completed

- TypeScript compilation passes for the Expo workspace.
- Expo dependency compatibility passes for SDK 56.
- Metro produces Android and iOS Hermes bundles.
- Shared valuation, completeness, backup, and export tests pass.
- The Vite production build remains green.

## Real-device checks

Run these on one current iPhone and one current Android device before a store build:

1. Fresh install opens the seeded inventory from SQLite.
2. Add an inventory item with purchase, barcode, room, status, marking, and value fields; reopen it, edit those fields, and confirm changes persist.
3. Add a saved location in Settings and confirm it appears as a one-tap suggestion in the item editor.
4. Start a manual mobile inventory item, use **Save & add another**, and confirm a blank form opens for the next item.
5. Start a photo-assisted intake item, use **Save & photograph another**, and confirm the next camera/photo-intake flow starts after the saved item appears in inventory.
6. Open the drill and take an item photo. Deny permission once, then grant it and retry.
7. Choose a library photo, close the app, reopen it, and confirm both images remain visible.
8. Record an owner marking and location, attach separate serial and marking photos, reopen the item, and confirm each appears under the correct heading.
9. Attach a receipt, appraisal, warranty, and other PDF; restart and confirm each remains under the correct heading.
10. Attach a damage/loss photo and confirm it does not appear in the general item-photo gallery.
11. Generate an AI description, confirm it is labeled unverified, and verify the user-authored description remains unchanged.
12. Create an incident with two affected items and different statuses; restart and confirm both relationships persist.
13. Edit that incident with owner, police case, and insurance claim details; reopen it and confirm changes persist.
14. Add different notes to both affected items and confirm the shared packet keeps each note with the correct item.
15. Attach a different incident photo to each affected item, edit the incident, and confirm both photos remain correctly associated.
16. Share in Premium and confirm the packet contains incident-photo counts, contact/claim details, estimate, confidence, checked date, disclaimer, and comparable links.
17. Delete a test incident, confirm the warning, and verify its inventory items and evidence still exist.
18. Archive an item referenced by another incident; verify the incident and shared packet still show it, then restore it.
19. Switch to Free, share again, and confirm marketplace links are omitted while valuation evidence remains.
20. Find comparable values, choose "Use this value," restart, and confirm the estimate persists.
21. Confirm manual value editing still works in Free, then switch back to Premium.
22. Enable App Lock. Background and reopen the app; confirm authentication is required.
23. Cancel authentication and confirm inventory stays hidden, then unlock successfully.
24. Confirm VoiceOver/TalkBack announces tabs, cards, form fields, evidence buttons, App Lock, and valuation actions.

Face ID requires an Expo development build rather than Expo Go. Camera, file persistence, and biometric behavior must be tested on physical devices; successful native bundles cannot prove hardware behavior.

Also export a database backup, export the attachment manifest, change a disposable record, restore the backup, and confirm the original record returns. Repeat with an invalid file and confirm the live database is not replaced. Remember that this checkpoint does not package private attachment files into the database backup.
