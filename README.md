# ProofVault web demo

A responsive, local-first demo of ProofVault and its premium **Replacement Value Assist** module. Built with React, TypeScript, and Vite for GitHub/Vercel deployment. The domain models and service boundary are intentionally portable to the planned Expo/SQLite mobile app.

## Run locally

```bash
npm install
npm run dev
```

## Test the feature

1. Open Inventory → Milwaukee M18 Brushless Drill.
2. In free mode, confirm lookup is locked and add a manual value.
3. Open Settings and switch the demo to Premium.
4. Return to the drill and choose **Find Comparable Values**.
5. Select a used/refurbished comparable value.
6. Open Incident and generate the packet. It includes the estimate, comparable links, checked date, confidence, and disclaimer.

Data is stored only in browser `localStorage`. Marketplace results are mocked and adapters are defined for a future secure backend; API keys must never be put in the client.


## Deploy

Import the repository into Vercel. The included `vercel.json` supports client-side routing; the default Vite build settings are sufficient.

## Mobile preparation

The normalized SQLite schema and web-to-mobile plan live in `mobile/`. The schema has been executed against SQLite in memory to validate table, index, constraint, and foreign-key syntax. Shared models, completeness scoring, valuation contracts, and the mock valuation engine live in `packages/domain` for both web and mobile.

The install-ready Expo scaffold is in `apps/mobile`. When npm registry access is available, run `npm install`, then `npm run start --workspace @proofvault/mobile` and open it with Expo Go or an emulator.
