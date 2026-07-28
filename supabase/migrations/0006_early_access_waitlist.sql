-- Early-access contacts are deliberately separate from application accounts.
-- The browser only calls the serverless endpoint; service_role performs writes.

create table if not exists public.proofvault_waitlist (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(trim(first_name)) between 1 and 80),
  email text not null unique check (char_length(email) between 3 and 254),
  launch_notification_consent boolean not null default true,
  updates_opt_in boolean not null default false,
  source text not null default 'website',
  status text not null default 'interested' check (status in ('interested', 'invited', 'unsubscribed')),
  created_at timestamptz not null default now(),
  last_submitted_at timestamptz not null default now()
);

alter table public.proofvault_waitlist enable row level security;

-- Intentionally no anon/authenticated policies: waitlist contacts must not be
-- exposed to the client. The Vercel endpoint uses the service-role key.
revoke all on table public.proofvault_waitlist from anon, authenticated;
