# Supabase free-tier setup for ProofVault

This adds the real backend foundation for the demo while keeping the local browser backup mode intact.

## 1. Create a free Supabase project

Create a project at <https://supabase.com>. The free tier is enough for early testing of:

- email-link auth
- Postgres inventory/incident/location records
- private storage buckets for item photos and documents

## 2. Apply the schema

Open Supabase → SQL Editor → New query, paste the contents of:

Run every file in `supabase/migrations` in numeric order. For the current prototype, run `0001` through `0008` once each. The later migrations add durable photo jobs, early-access sign-ups, and secure one-member household sharing.

## 3. Add app environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Use the public anon key only. Do not put a service-role key in the mobile app or web client.

## 4. Configure auth redirect URLs

In Supabase → Authentication → URL Configuration:

- Site URL for local dev: `http://localhost:5173`
- Add the deployed Vercel URL when ready: `https://proofvault-app.vercel.app`

## 5. Run locally

```bash
npm run dev
```

Go to Settings → Cloud sync. Send yourself a magic link, sign in, then upload local demo data to Supabase.

## What this does not do yet

- Household sharing is intentionally limited to one connected existing ProofVault account. The household owner connects it from Settings → Household access; both people should refresh after connecting.
- It does not enforce paid subscriptions server-side yet. Current premium/free mode is still demo-mode until real payments/auth claims are added.
- It does not run live AI analysis yet. AI calls should be made from a backend endpoint so provider keys stay off the client.
