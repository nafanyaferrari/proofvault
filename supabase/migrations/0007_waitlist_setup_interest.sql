-- A lightweight demand signal for the future guided/concierge inventory service.
-- Run this once after 0006_early_access_waitlist.sql in the Supabase SQL editor.
alter table public.proofvault_waitlist
  add column if not exists setup_interest boolean not null default false;
