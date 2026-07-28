# Early-access waitlist setup

The public landing-page form stores interest separately from ProofVault accounts. It does not create an account, start a subscription, or reserve one of the first 500 paid founding spots.

## One-time setup

1. In Supabase, open **SQL Editor**, create a new query, paste the contents of `supabase/migrations/0006_early_access_waitlist.sql`, and run it.
2. In Supabase **Project Settings → API Keys**, copy the **service_role** key. Treat it like a password: never paste it into the app or share it publicly.
3. In Vercel **Project → Settings → Environment Variables**, add `SUPABASE_SERVICE_ROLE_KEY` for **Production** (and Development if you want the local/development deployment to accept sign-ups).
4. Add `VITE_PROOFVAULT_LAUNCH_MODE` with the value `waitlist` for **Production**. This removes all public account-creation and sign-in entry points while preserving the demo and early-access form.
5. In Supabase **Authentication → General Configuration**, turn off **Allow new users to sign up**. Also keep anonymous sign-ins off. This is the security control that prevents someone from creating an account outside the website.
6. Redeploy after changing the environment variables.

The endpoint accepts the form at `/api/join-waitlist`. Name, email, launch-notification permission, optional update preference, and timestamps are stored in `proofvault_waitlist`. To view the list, use Supabase **Table Editor → proofvault_waitlist**.

For launch emails, export or connect this table to a transactional email provider later. Do not email people who are marked `unsubscribed`.

## When ProofVault opens to accounts

1. Turn **Allow new users to sign up** back on in Supabase.
2. Remove `VITE_PROOFVAULT_LAUNCH_MODE` or set it to any value other than `waitlist` in Vercel.
3. Redeploy. The account creation and sign-in section will return.
