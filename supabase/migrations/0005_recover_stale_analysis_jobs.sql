-- Recover jobs that were claimed by a serverless worker which then stopped
-- before it could write a result. Without this, a provider/configuration
-- failure can leave a photo permanently displayed as "Working".

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
    where (
      status in ('queued', 'retrying')
      or (status = 'processing' and started_at < now() - interval '5 minutes')
    )
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
