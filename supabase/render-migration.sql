-- EBC private AI construction-render feature.
-- Run once in Supabase Dashboard > SQL Editor before deploying generate-render.

create extension if not exists pgcrypto;

create table if not exists public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  source_storage_path text not null,
  mask_storage_path text,
  output_storage_path text,
  service text not null,
  finish text not null,
  quality text not null check (quality in ('low','high')),
  status text not null check (status in ('processing','completed','failed')),
  model text not null,
  prompt_version text not null,
  idempotency_key uuid not null,
  source_bytes bigint,
  output_bytes bigint,
  has_mask boolean not null default false,
  error_code text,
  request_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, idempotency_key)
);

create index if not exists render_jobs_user_created_idx
  on public.render_jobs (user_id, created_at desc);
create index if not exists render_jobs_project_idx
  on public.render_jobs (project_id, created_at desc);

drop trigger if exists render_jobs_write_audit on public.render_jobs;
create trigger render_jobs_write_audit after insert or update or delete on public.render_jobs
  for each row execute function public.write_audit_log();

alter table public.render_jobs enable row level security;
revoke all on public.render_jobs from anon, authenticated;
grant select on public.render_jobs to authenticated;
drop policy if exists "staff read own render jobs" on public.render_jobs;
create policy "staff read own render jobs" on public.render_jobs
  for select to authenticated using (user_id = auth.uid() and public.is_active_staff());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
  ('render-inputs','render-inputs',false,12582912,array['image/jpeg','image/png','image/webp']),
  ('project-renders','project-renders',false,20971520,array['image/jpeg','image/webp'])
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "staff upload own render inputs" on storage.objects;
create policy "staff upload own render inputs" on storage.objects
  for insert to authenticated
  with check (bucket_id='render-inputs' and (storage.foldername(name))[1]=auth.uid()::text and public.is_active_staff());
drop policy if exists "staff read own render inputs" on storage.objects;
create policy "staff read own render inputs" on storage.objects
  for select to authenticated
  using (bucket_id='render-inputs' and (storage.foldername(name))[1]=auth.uid()::text and public.is_active_staff());
drop policy if exists "staff delete own render inputs" on storage.objects;
create policy "staff delete own render inputs" on storage.objects
  for delete to authenticated
  using (bucket_id='render-inputs' and (storage.foldername(name))[1]=auth.uid()::text and public.is_active_staff());

drop policy if exists "staff read own project renders" on storage.objects;
create policy "staff read own project renders" on storage.objects
  for select to authenticated
  using (bucket_id='project-renders' and (storage.foldername(name))[1]=auth.uid()::text and public.is_active_staff());
drop policy if exists "staff delete own project renders" on storage.objects;
create policy "staff delete own project renders" on storage.objects
  for delete to authenticated
  using (bucket_id='project-renders' and (storage.foldername(name))[1]=auth.uid()::text and public.is_active_staff());
