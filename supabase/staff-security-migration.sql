-- EBC Manager staff authorization and audit migration
-- Use this file for an existing Supabase project that already ran schema.sql.
-- Run it in Supabase Dashboard > SQL Editor, then bootstrap the first administrator
-- using the statement at the bottom of this file.

create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'staff' check (role in ('admin','staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

-- Reuse the existing set_updated_at function from schema.sql.
drop trigger if exists staff_profiles_set_updated_at on public.staff_profiles;
create trigger staff_profiles_set_updated_at
before update on public.staff_profiles
for each row execute function public.set_updated_at();

-- Audit the existing core records.
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
alter table public.audit_log enable row level security;

-- Staff profile policies.
drop policy if exists "staff read own profile" on public.staff_profiles;
create policy "staff read own profile"
on public.staff_profiles for select to authenticated
using (user_id = auth.uid() or public.is_admin_staff());

drop policy if exists "admins manage staff profiles" on public.staff_profiles;
create policy "admins manage staff profiles"
on public.staff_profiles for all to authenticated
using (public.is_admin_staff())
with check (public.is_admin_staff());

drop policy if exists "active staff read audit log" on public.audit_log;
create policy "active staff read audit log"
on public.audit_log for select to authenticated
using (public.is_active_staff());

-- Replace broad authenticated policies with approved-staff policies.
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

-- Replace storage policies with approved-staff checks.
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

-- Harden site_media when that migration has already been installed.
do $$
begin
  if to_regclass('public.site_media') is not null then
    execute 'alter table public.site_media enable row level security';
    execute 'drop policy if exists "public read active site media" on public.site_media';
    execute 'create policy "public read active site media" on public.site_media for select to anon, authenticated using (is_active = true or public.is_active_staff())';
    execute 'drop policy if exists "authenticated manage site media" on public.site_media';
    execute 'drop policy if exists "active staff manage site media" on public.site_media';
    execute 'create policy "active staff manage site media" on public.site_media for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff())';
    execute 'drop trigger if exists site_media_write_audit on public.site_media';
    execute 'create trigger site_media_write_audit after insert or update or delete on public.site_media for each row execute function public.write_audit_log()';
  end if;
end;
$$;

create index if not exists audit_log_created_at_idx
on public.audit_log (created_at desc);

create index if not exists audit_log_record_idx
on public.audit_log (table_name, record_id, created_at desc);

-- REQUIRED: bootstrap the first administrator after this migration.
-- Replace YOUR_ADMIN_EMAIL with the email of an existing Supabase Auth user.
--
-- insert into public.staff_profiles (user_id, display_name, role)
-- select id, coalesce(raw_user_meta_data ->> 'full_name', email), 'admin'
-- from auth.users
-- where email = 'YOUR_ADMIN_EMAIL'
-- on conflict (user_id) do update
-- set role = 'admin', is_active = true;
