-- Secure household sharing, v1.
--
-- Some early ProofVault projects used only the foundation migration. Create the
-- membership table here as well so this migration is safe to apply on either
-- project history.
create table if not exists public.proofvault_household_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  unique (owner_user_id, member_user_id),
  check (owner_user_id <> member_user_id)
);

alter table public.proofvault_household_members enable row level security;
drop policy if exists "Users read their household membership" on public.proofvault_household_members;
create policy "Users read their household membership" on public.proofvault_household_members for select
  to authenticated
  using ((select auth.uid()) = owner_user_id or (select auth.uid()) = member_user_id);
-- One owner can connect one existing ProofVault account. Shared household data
-- remains stored under the owner's account ID, while row-level security grants
-- the connected member the same access. Do not expose service-role credentials
-- to the browser; invitations are created by the serverless endpoint.

create or replace function public.proofvault_household_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select owner_user_id from public.proofvault_household_members where member_user_id = auth.uid() limit 1),
    auth.uid()
  );
$$;

create or replace function public.proofvault_household_owner_for_user(target_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select owner_user_id from public.proofvault_household_members where member_user_id = target_user_id limit 1),
    target_user_id
  );
$$;

revoke all on function public.proofvault_household_owner_id() from public;
grant execute on function public.proofvault_household_owner_id() to authenticated, service_role;
revoke all on function public.proofvault_household_owner_for_user(uuid) from public;
grant execute on function public.proofvault_household_owner_for_user(uuid) to service_role;

drop policy if exists "Users manage their own inventory items" on public.proofvault_inventory_items;
drop policy if exists "Users manage their own incidents" on public.proofvault_incidents;
drop policy if exists "Users manage their own locations" on public.proofvault_locations;
drop policy if exists "Users manage their own settings" on public.proofvault_user_settings;

create policy "Household members manage shared inventory items" on public.proofvault_inventory_items for all
  using (user_id = public.proofvault_household_owner_id())
  with check (user_id = public.proofvault_household_owner_id());
create policy "Household members manage shared incidents" on public.proofvault_incidents for all
  using (user_id = public.proofvault_household_owner_id())
  with check (user_id = public.proofvault_household_owner_id());
create policy "Household members manage shared locations" on public.proofvault_locations for all
  using (user_id = public.proofvault_household_owner_id())
  with check (user_id = public.proofvault_household_owner_id());
create policy "Household members manage shared settings" on public.proofvault_user_settings for all
  using (user_id = public.proofvault_household_owner_id())
  with check (user_id = public.proofvault_household_owner_id());

drop policy if exists "Users read their own analysis jobs" on public.proofvault_analysis_jobs;
drop policy if exists "Users create their own analysis jobs" on public.proofvault_analysis_jobs;
drop policy if exists "Users acknowledge or cancel their own analysis jobs" on public.proofvault_analysis_jobs;
drop policy if exists "Users delete their own analysis jobs" on public.proofvault_analysis_jobs;
create policy "Household members read shared analysis jobs" on public.proofvault_analysis_jobs for select
  using (user_id = public.proofvault_household_owner_id());
create policy "Household members create shared analysis jobs" on public.proofvault_analysis_jobs for insert
  with check (user_id = public.proofvault_household_owner_id());
create policy "Household members acknowledge shared analysis jobs" on public.proofvault_analysis_jobs for update
  using (user_id = public.proofvault_household_owner_id() and status in ('queued', 'retrying', 'complete'))
  with check (user_id = public.proofvault_household_owner_id() and status in ('cancelled', 'reviewed'));
create policy "Household members delete shared analysis jobs" on public.proofvault_analysis_jobs for delete
  using (user_id = public.proofvault_household_owner_id());

create policy "Household members read shared item photos" on storage.objects for select
  using (bucket_id = 'proofvault-item-photos' and (storage.foldername(name))[1] = public.proofvault_household_owner_id()::text);
create policy "Household members upload shared item photos" on storage.objects for insert
  with check (bucket_id = 'proofvault-item-photos' and (storage.foldername(name))[1] = public.proofvault_household_owner_id()::text);
create policy "Household members read shared documents" on storage.objects for select
  using (bucket_id = 'proofvault-documents' and (storage.foldername(name))[1] = public.proofvault_household_owner_id()::text);
create policy "Household members upload shared documents" on storage.objects for insert
  with check (bucket_id = 'proofvault-documents' and (storage.foldername(name))[1] = public.proofvault_household_owner_id()::text);
