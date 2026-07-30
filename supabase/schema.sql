-- EBC Manager database setup
-- Run this entire file once in Supabase Dashboard > SQL Editor for a new project.
-- This consolidated schema includes the core CRM, render, and invoice objects.

create extension if not exists pgcrypto;

create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'staff' check (role in ('admin','staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  address text,
  service text,
  message text,
  preferred_timing text,
  status text not null default 'new' check (status in ('new','contacted','estimate_scheduled','quoted','won','lost')),
  estimated_value numeric(12,2),
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  service text,
  status text not null default 'planning' check (status in ('planning','scheduled','in_progress','on_hold','completed','cancelled')),
  address text,
  start_date date,
  end_date date,
  contract_value numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (not (project_id is not null and lead_id is not null))
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  table_name text not null,
  record_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_active_staff(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_profiles
    where user_id = check_user and is_active = true
  );
$$;

create or replace function public.is_admin_staff(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_profiles
    where user_id = check_user and is_active = true and role = 'admin'
  );
$$;

revoke all on function public.is_active_staff(uuid) from public;
revoke all on function public.is_admin_staff(uuid) from public;
grant execute on function public.is_active_staff(uuid) to anon, authenticated;
grant execute on function public.is_admin_staff(uuid) to authenticated;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (actor_id, action, table_name, record_id, after_data)
    values (auth.uid(), tg_op, tg_table_name, new.id, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (actor_id, action, table_name, record_id, before_data, after_data)
    values (auth.uid(), tg_op, tg_table_name, new.id, to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_log (actor_id, action, table_name, record_id, before_data)
    values (auth.uid(), tg_op, tg_table_name, old.id, to_jsonb(old));
    return old;
  end if;
end;
$$;

revoke all on function public.write_audit_log() from public;

-- Updated-at triggers.
drop trigger if exists staff_profiles_set_updated_at on public.staff_profiles;
create trigger staff_profiles_set_updated_at
before update on public.staff_profiles
for each row execute function public.set_updated_at();

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- Append-only audit triggers.
drop trigger if exists leads_write_audit on public.leads;
create trigger leads_write_audit
after insert or update or delete on public.leads
for each row execute function public.write_audit_log();

drop trigger if exists clients_write_audit on public.clients;
create trigger clients_write_audit
after insert or update or delete on public.clients
for each row execute function public.write_audit_log();

drop trigger if exists projects_write_audit on public.projects;
create trigger projects_write_audit
after insert or update or delete on public.projects
for each row execute function public.write_audit_log();

drop trigger if exists project_files_write_audit on public.project_files;
create trigger project_files_write_audit
after insert or update or delete on public.project_files
for each row execute function public.write_audit_log();

alter table public.staff_profiles enable row level security;
alter table public.leads enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.audit_log enable row level security;

-- Staff profile access. The first admin must be inserted from the SQL editor.
drop policy if exists "staff read own profile" on public.staff_profiles;
create policy "staff read own profile"
on public.staff_profiles for select to authenticated
using (user_id = auth.uid() or public.is_admin_staff());

drop policy if exists "admins manage staff profiles" on public.staff_profiles;
create policy "admins manage staff profiles"
on public.staff_profiles for all to authenticated
using (public.is_admin_staff())
with check (public.is_admin_staff());

-- Public website may submit new estimate requests only.
drop policy if exists "public can create leads" on public.leads;
create policy "public can create leads"
on public.leads for insert to anon
with check (source = 'website');

drop policy if exists "public can add estimate file metadata" on public.project_files;
create policy "public can add estimate file metadata"
on public.project_files for insert to anon
with check (
  lead_id is not null
  and project_id is null
  and uploaded_by is null
  and storage_path like 'incoming/%'
);

-- Only explicitly approved EBC staff can manage private records.
drop policy if exists "authenticated manage leads" on public.leads;
drop policy if exists "active staff manage leads" on public.leads;
create policy "active staff manage leads"
on public.leads for all to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

drop policy if exists "authenticated manage clients" on public.clients;
drop policy if exists "active staff manage clients" on public.clients;
create policy "active staff manage clients"
on public.clients for all to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

drop policy if exists "authenticated manage projects" on public.projects;
drop policy if exists "active staff manage projects" on public.projects;
create policy "active staff manage projects"
on public.projects for all to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

drop policy if exists "authenticated manage files" on public.project_files;
drop policy if exists "active staff manage files" on public.project_files;
create policy "active staff manage files"
on public.project_files for all to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

drop policy if exists "active staff read audit log" on public.audit_log;
create policy "active staff read audit log"
on public.audit_log for select to authenticated
using (public.is_active_staff());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime',
    'application/pdf'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Approved staff storage access.
drop policy if exists "staff upload project files" on storage.objects;
create policy "staff upload project files"
on storage.objects for insert to authenticated
with check (bucket_id = 'project-files' and public.is_active_staff());

drop policy if exists "staff read project files" on storage.objects;
create policy "staff read project files"
on storage.objects for select to authenticated
using (bucket_id = 'project-files' and public.is_active_staff());

drop policy if exists "staff update project files" on storage.objects;
create policy "staff update project files"
on storage.objects for update to authenticated
using (bucket_id = 'project-files' and public.is_active_staff())
with check (bucket_id = 'project-files' and public.is_active_staff());

drop policy if exists "staff delete project files" on storage.objects;
create policy "staff delete project files"
on storage.objects for delete to authenticated
using (bucket_id = 'project-files' and public.is_active_staff());

-- Public website uploads into a limited incoming folder. It cannot read that folder.
drop policy if exists "public upload estimate photos" on storage.objects;
create policy "public upload estimate photos"
on storage.objects for insert to anon
with check (
  bucket_id = 'project-files'
  and (storage.foldername(name))[1] = 'incoming'
);

create index if not exists leads_status_created_at_idx
on public.leads (status, created_at desc);

create index if not exists clients_name_idx
on public.clients (name);

create index if not exists projects_status_start_date_idx
on public.projects (status, start_date);

create index if not exists project_files_project_id_idx
on public.project_files (project_id);

create index if not exists project_files_lead_id_idx
on public.project_files (lead_id);

create index if not exists audit_log_created_at_idx
on public.audit_log (created_at desc);

create index if not exists audit_log_record_idx
on public.audit_log (table_name, record_id, created_at desc);

-- Bootstrap the first administrator after creating the user in Authentication:
--
-- insert into public.staff_profiles (user_id, display_name, role)
-- select id, coalesce(raw_user_meta_data ->> 'full_name', email), 'admin'
-- from auth.users
-- where email = 'YOUR_ADMIN_EMAIL'
-- on conflict (user_id) do update
-- set role = 'admin', is_active = true;

-- Private, auditable AI construction render jobs.
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
create trigger render_jobs_write_audit
after insert or update or delete on public.render_jobs
for each row execute function public.write_audit_log();

alter table public.render_jobs enable row level security;
revoke all on public.render_jobs from anon, authenticated;
grant select on public.render_jobs to authenticated;

drop policy if exists "staff read own render jobs" on public.render_jobs;
create policy "staff read own render jobs"
on public.render_jobs for select to authenticated
using (user_id = auth.uid() and public.is_active_staff());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('render-inputs', 'render-inputs', false, 12582912, array['image/jpeg','image/png','image/webp']),
  ('project-renders', 'project-renders', false, 20971520, array['image/jpeg','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff upload own render inputs" on storage.objects;
create policy "staff upload own render inputs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'render-inputs'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_active_staff()
);

drop policy if exists "staff read own render inputs" on storage.objects;
create policy "staff read own render inputs"
on storage.objects for select to authenticated
using (
  bucket_id = 'render-inputs'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_active_staff()
);

drop policy if exists "staff delete own render inputs" on storage.objects;
create policy "staff delete own render inputs"
on storage.objects for delete to authenticated
using (
  bucket_id = 'render-inputs'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_active_staff()
);

drop policy if exists "staff read own project renders" on storage.objects;
create policy "staff read own project renders"
on storage.objects for select to authenticated
using (
  bucket_id = 'project-renders'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_active_staff()
);

drop policy if exists "staff delete own project renders" on storage.objects;
create policy "staff delete own project renders"
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-renders'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_active_staff()
);

-- Private invoices and payment tracking. Bank and card numbers are never stored.
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  invoice_number text not null,
  quote_number text,
  invoice_date date not null,
  due_date date not null,
  status text not null default 'Draft' check (status in ('Draft','Sent','Partially paid','Paid','Overdue')),
  language text not null default 'en' check (language in ('en','es')),
  client_name text,
  client_phone text,
  client_email text,
  project_address text,
  project_total numeric(12,2) not null default 0 check (project_total >= 0),
  payment_schedule numeric[] not null default array[30,45,25]::numeric[] check (cardinality(payment_schedule) = 3),
  payment_phase text not null check (payment_phase in ('initial','progress','final','custom')),
  phase_percent numeric(7,2) not null default 0 check (phase_percent >= 0),
  amount_due numeric(12,2) not null default 0 check (amount_due >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  description text,
  payment_methods text[] not null default '{}',
  payment_link text,
  payment_instructions text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

alter table public.invoices
add column if not exists payment_schedule numeric[] not null
default array[30,45,25]::numeric[] check (cardinality(payment_schedule) = 3);

create index if not exists invoices_user_created_idx
on public.invoices (user_id, created_at desc);

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists invoices_write_audit on public.invoices;
create trigger invoices_write_audit
after insert or update or delete on public.invoices
for each row execute function public.write_audit_log();

alter table public.invoices enable row level security;
revoke all on public.invoices from anon;
grant select, insert, update, delete on public.invoices to authenticated;

drop policy if exists "staff manage own invoices" on public.invoices;
create policy "staff manage own invoices"
on public.invoices for all to authenticated
using (user_id = auth.uid() and public.is_active_staff())
with check (user_id = auth.uid() and public.is_active_staff());
