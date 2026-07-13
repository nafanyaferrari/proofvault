# AI Photo Intake Backend Plan

ProofVault’s current web demo is intentionally no-cloud: photo intake uses one fixed simulated result so the product flow can be tested without paid services or exposed API keys.

The production path should keep the same user experience—photo → review → save—while moving real AI and marketplace lookup work to a secure backend.

## Target flow

1. The user takes or uploads one or more item photos.
2. The app sends short-lived photo references, not provider API keys, to a ProofVault backend.
3. The backend runs vision/OCR and optional marketplace valuation providers.
4. The backend returns an editable draft item, confidence levels, serial verification warnings, comparable listings, and the valuation disclaimer.
5. The user reviews the draft before anything is treated as final inventory evidence.

## Backend contract

The shared domain package now includes:

- `SecureItemIntakeRequest`
- `SecureItemIntakeResponse`
- `SecureItemIntakeBackendClient`
- `createSecureBackendItemIntakeAnalyzer`

These live in `packages/domain/src/itemIntakeBackendContract.ts`. The web and mobile apps can keep calling the same `ItemIntakeAnalyzer` interface, then swap today’s mock analyzer for a backend-backed analyzer later.

## Security rules

- Never ship OpenAI, OCR, eBay, Amazon, Walmart, Best Buy, or other provider API keys in the web or mobile client.
- Serial numbers and barcodes extracted from images must be marked for user verification.
- Store only the minimum photo data needed for the task.
- Keep the valuation language framed as an approximate replacement estimate, not an appraisal or guaranteed insurance value.

## Suggested future endpoint

`POST /api/intake/analyze-item`

The endpoint should accept `SecureItemIntakeRequest` and return `SecureItemIntakeResponse`. It can be implemented later with whatever backend stack we choose; the client-side app should not depend on a specific AI or marketplace provider.
