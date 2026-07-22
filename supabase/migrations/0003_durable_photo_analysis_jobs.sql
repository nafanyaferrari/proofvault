-- Durable photo-analysis queue for ProofVault.
-- Photos are uploaded to the existing private proofvault-item-photos bucket
-- before a job is created. Service-role server functions process and update
-- jobs; signed-in users can only create, read, or cancel their own jobs.

create table if not exists public.proofvault_analysis_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  mime_type text not null default 'image/jpeg',
  item_context jsonb not null default '{}'::jsonb,
  include_valuation boolean not null default true,
  status text not null default 'queued' check (status in ('queued', 'processing', 'retrying', 'complete', 'reviewed', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  provider_attempts jsonb not null default '[]'::jsonb,
  result jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists proofvault_analysis_jobs_ready_idx
  on public.proofvault_analysis_jobs (status, next_attempt_at, created_at);

create index if not exists proofvault_analysis_jobs_user_idx
  on public.proofvault_analysis_jobs (user_id, created_at desc);

alter table public.proofvault_analysis_jobs enable row level security;

create policy "Users read their own analysis jobs"
  on public.proofvault_analysis_jobs for select
  using (auth.uid() = user_id);

create policy "Users create their own analysis jobs"
  on public.proofvault_analysis_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users acknowledge or cancel their own analysis jobs"
  on public.proofvault_analysis_jobs for update
  using (auth.uid() = user_id and status in ('queued', 'retrying', 'complete'))
  with check (auth.uid() = user_id and status in ('cancelled', 'reviewed'));

create policy "Users delete their own analysis jobs"
  on public.proofvault_analysis_jobs for delete
  using (auth.uid() = user_id);

-- Atomically claims one eligible row. SKIP LOCKED prevents concurrent browser
-- kicks or scheduled workers from analyzing the same paid photo twice.
create or replace function public.proofvault_claim_analysis_job(target_user uuid default null)
returns setof public.proofvault_analysis_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidate as (
    select id
    from public.proofvault_analysis_jobs
    where status in ('queued', 'retrying')
      and next_attempt_at <= now()
      and (target_user is null or user_id = target_user)
    order by created_at asc
    for update skip locked
    limit 1
  )
  update public.proofvault_analysis_jobs as job
  set status = 'processing',
      attempts = job.attempts + 1,
      started_at = now(),
      updated_at = now(),
      last_error = null
  from candidate
  where job.id = candidate.id
  returning job.*;
end;
$$;

revoke all on function public.proofvault_claim_analysis_job(uuid) from public;
grant execute on function public.proofvault_claim_analysis_job(uuid) to service_role;

-- The client uploads to this user-owned folder before inserting its job.
-- Existing bucket policies from 0001 already allow this path convention.
