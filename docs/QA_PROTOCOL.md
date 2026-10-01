# ProofVault QA Protocol

This protocol is the release gate for the current ProofVault web prototype and Expo/SQLite mobile scaffold. It is intentionally local-first: a test must not require a production account, a paid marketplace API, or real customer data.

## Automated release gate

Run from the repository root:

```powershell
npm install
npm run qa
```

`qa` runs web and mobile TypeScript checks, ESLint, Node/TypeScript unit and mocked-SQLite integration tests with coverage output, and deterministic desktop/mobile Playwright flows. It does not call a live vision provider.

Optional, opt-in live-provider checks consume configured provider quota and run only against production:

```powershell
npm run test:e2e:live-photo
npm run test:e2e:live-accuracy
```

The live tests use five stable, photo-realistic scenes in `tests/fixtures/photo-analysis/`. Treat their results as a provider-quality observation, not an approval to trust an unverified make, model, serial number, appraisal, or value.

## Automated coverage map

| Area | Automated check | Coverage |
| --- | --- | --- |
| Inventory | `tests/testing-protocol.test.ts` | Search, combined filters, identifiers, weak/strong records |
| Owner-applied markings | `tests/testing-protocol.test.ts`, `tests/mobile-repository.integration.test.ts` | Marking persistence, search, completeness, export labels |
| Photo analysis | `tests/analyze-item-provider.test.ts`, `e2e/photo-intake.spec.ts` | Provider output, serial verification, fallback labeling, multi-item review |
| Replacement Value Assist | `tests/testing-protocol.test.ts` | High/medium/low confidence, no-comparable state, disclaimer |
| Incidents and exports | `tests/testing-protocol.test.ts`, `tests/logic.test.ts`, `e2e/core-protocol.spec.ts` | Statuses, 50+ rows, serial/marking separation, CSV/print/text output |
| Free vs. premium | `e2e/core-protocol.spec.ts`, `tests/logic.test.ts` | Manual values stay free; automatic comparison is gated |
| Mobile SQLite | `tests/mobile-repository.integration.test.ts` | Item/marking mapping, valuation rows, incident links, missing valuation safety |
| Backups and local persistence | `tests/logic.test.ts` | Browser backup/restore, bulk drafts, usage counters, mobile attachment manifest |

## Stable test records

Use the fixtures in `tests/fixtures/proofvaultRecords.ts` for manual and automated regression work:

1. Milwaukee M18 Fuel Drill — serial number, initials marking, item/serial/marking photos, receipt, value.
2. Wedding Ring — no serial number, engraved inner-band marking, appraisal placeholder.
3. Trek Mountain Bike — make and serial number.
4. MacBook Pro — make, model, and serial number.
5. Christmas Storage Tote — QR/asset-tag marking in a storage unit.

Never replace these with real customer information in source control.

## Manual web smoke test

Run this before a production deploy:

1. Start `npm run dev`, choose the local demo, and confirm the Overview loads without console errors.
2. Open Inventory. Search by serial number, owner marking, barcode, make/model, and room. Combine category, location, status, identifier, missing-value, missing-photo, and low-score filters. Clear filters.
3. Create a basic item, save it, refresh the browser, and confirm it persists.
4. Create a complete drill record. Add item, serial, and marking photos; record the marking type and location; confirm all are separate on Item Detail.
5. In free mode, confirm manual value entry works while automatic comparable lookup is locked and explained.
6. Switch to Premium demo access. Run the mock valuation, select a comparable value, and confirm the range, confidence, checked time, link, and disclaimer appear.
7. Create an incident, assign an affected item a status, add incident-specific notes/photos, and open the text, CSV, and printable packet. Confirm serial number and owner-applied marking are separate fields.
8. Test an empty or vague item with valuation. Confirm the no-comparables message recommends clearer name, make/model, photos, or a manual value instead of saving `$0`.
9. Reset local demo data only after downloading a backup if the test data must be retained.

## Mobile device acceptance

The Expo app is tested at repository level with a SQLite double. Before labeling a mobile build release-ready, also complete `mobile/DEVICE_ACCEPTANCE.md` on one iOS device/simulator and one Android device/emulator:

- Camera/library permission grant and denial.
- General, serial, owner-marking, damage, receipt, appraisal, warranty, and other-document evidence categories.
- App restart persistence and archive/restore.
- Offline item, incident, manual-value, and text export flow.
- Native share sheet open and cancel behavior.
- Device text scaling, screen reader labels, and small-phone layout.

## Privacy and offline checks

- In local web demo mode, disable the network and verify that manual inventory, owner markings, manual values, incident drafting, and text export continue to work. Photo analysis and cloud sync may be unavailable but must fail visibly and preserve the draft.
- In mobile mode, verify the app describes data as device-local and that database backup does not claim to embed app-private evidence files.
- Do not put provider or marketplace keys in browser or mobile client code. Live photo analysis belongs behind the existing server endpoint.

## Known test boundaries

- The web prototype uses browser storage locally and Supabase only for signed-in cloud sync; it is not SQLite.
- Mobile repository integration tests use a deterministic SQLite-compatible double. A real device/Expo SQLite run remains a required manual gate.
- Marketplace results are deliberately mocked. No test certifies an insurance value or a live marketplace price.
- Playwright tests validate the web experience. Maestro/Detox is not configured yet; use Expo device acceptance until a native E2E runner is added.

## Bug report format

```markdown
## Bug title
Severity: Critical | High | Medium | Low
Area: Inventory | Photos | Owner markings | Valuation | Incidents | Export | SQLite | UI | Privacy

Steps to reproduce:
1.
2.

Expected result:
Actual result:
Screenshot/log:
Suggested fix:
Regression test needed: Yes | No
```

## Definition of done

A change is ready for review only when `npm run qa` passes, required manual smoke steps pass, no critical data-loss or export defect remains, and any untested mobile/device or live-provider limitation is documented in the change notes.
