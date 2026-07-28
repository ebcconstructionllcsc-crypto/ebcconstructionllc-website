-- EBC Manager database setup
-- Run this entire file once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

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
  updated_at timestamptz not null default now()
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_updated_at();
drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_files enable row level security;

-- Public website may submit new estimate requests only.
drop policy if exists "public can create leads" on public.leads;
create policy "public can create leads" on public.leads for insert to anon with check (source = 'website');
drop policy if exists "public can add estimate file metadata" on public.project_files;
create policy "public can add estimate file metadata" on public.project_files for insert to anon with check (lead_id is not null and project_id is null and uploaded_by is null and storage_path like 'incoming/%');

-- Signed-in EBC staff can manage all CRM records.
drop policy if exists "authenticated manage leads" on public.leads;
create policy "authenticated manage leads" on public.leads for all to authenticated using (true) with check (true);
drop policy if exists "authenticated manage clients" on public.clients;
create policy "authenticated manage clients" on public.clients for all to authenticated using (true) with check (true);
drop policy if exists "authenticated manage projects" on public.projects;
create policy "authenticated manage projects" on public.projects for all to authenticated using (true) with check (true);
drop policy if exists "authenticated manage files" on public.project_files;
create policy "authenticated manage files" on public.project_files for all to authenticated using (true) with check (true);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('project-files','project-files',false,52428800,array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Authenticated staff file access.
drop policy if exists "staff upload project files" on storage.objects;
create policy "staff upload project files" on storage.objects for insert to authenticated with check (bucket_id='project-files');
drop policy if exists "staff read project files" on storage.objects;
create policy "staff read project files" on storage.objects for select to authenticated using (bucket_id='project-files');
drop policy if exists "staff update project files" on storage.objects;
create policy "staff update project files" on storage.objects for update to authenticated using (bucket_id='project-files') with check (bucket_id='project-files');
drop policy if exists "staff delete project files" on storage.objects;
create policy "staff delete project files" on storage.objects for delete to authenticated using (bucket_id='project-files');

-- Public website uploads into a limited incoming folder.
drop policy if exists "public upload estimate photos" on storage.objects;
create policy "public upload estimate photos" on storage.objects for insert to anon with check (bucket_id='project-files' and (storage.foldername(name))[1]='incoming');

-- Create the first admin user in Supabase Dashboard > Authentication > Users.
