# ProofVault prototype trial run

Use this checklist for the first live prototype pass after deployment.

## Before opening the app

- Vercel Deployment Protection is off for the public URL.
- Public URL: https://proofvault-app.vercel.app
- Supabase Auth allowed redirect URLs include:
  - https://proofvault-app.vercel.app
  - http://localhost:5173
- Vercel production environment variables are present:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `GEMINI_API_KEY`
  - `GEMINI_VISION_MODEL`

## Suggested test accounts

Use two email addresses you control:

- Free user test account
- Premium demo test account

Plan status is still mocked in the app for this prototype, so switch the plan in Settings during the walkthrough.

## Free user flow

1. Open https://proofvault-app.vercel.app in a fresh private/incognito window.
2. Sign in with the free test email.
3. Confirm the account starts empty.
4. Confirm the top status banner says signed-in account and free plan.
5. Open Inventory.
6. Confirm AI Photo Intake says it is Premium.
7. Add an item manually.
8. Add at least one photo manually.
9. Add a serial number manually.
10. Add a user-entered replacement value manually.
11. Save the item.
12. Confirm the app shows an autosave status.
13. Refresh the page and confirm the item remains in the signed-in account.

## Premium demo flow

1. Switch the account to Premium in Settings.
2. Open Inventory.
3. Confirm AI Photo Intake is available.
4. Use Photograph & prefill with a clear item photo.
5. Confirm the draft includes AI-filled description, make/model help, and a serial candidate if visible.
6. Save the draft.
7. Open the item detail screen.
8. Confirm Replacement Value Assist shows a value estimate, confidence, checked date, disclaimer, and comparables.
9. Confirm the item persists after refresh.

## Incident export flow

1. Open Incident Mode.
2. Create a new incident.
3. Select at least one affected item.
4. Add incident details and save.
5. Open the incident packet.
6. Confirm the export preview includes:
   - user-entered value
   - approximate replacement estimate
   - confidence rating
   - checked date
   - disclaimer
   - comparable links for Premium
7. Try Copy, CSV, and Print / Save PDF.

## Expected prototype limitations

- Subscription status is still mocked locally.
- Marketplace value lookup is mocked.
- Live AI photo analysis uses Gemini for testing.
- Real billing and server-side subscription enforcement still need to be built before real customers.
- Multi-device conflict handling is basic snapshot sync, not full conflict resolution yet.
