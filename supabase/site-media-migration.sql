-- EBC website media library migration
-- Run after supabase/schema.sql for a new project.
-- For an existing project, run staff-security-migration.sql first.

begin;

create table if not exists public.site_media (
  id uuid primary key default gen_random_uuid(),
  title_en text not null default 'EBC field work',
  title_es text not null default 'Trabajo de EBC',
  caption_en text,
  caption_es text,
  media_type text not null check (media_type in ('image','video')),
  category text not null default 'projects' check (category in ('projects','home','services','team')),
  storage_path text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_media
add column if not exists updated_at timestamptz not null default now();

alter table public.site_media enable row level security;

drop trigger if exists site_media_set_updated_at on public.site_media;
create trigger site_media_set_updated_at
before update on public.site_media
for each row execute function public.set_updated_at();

drop trigger if exists site_media_write_audit on public.site_media;
create trigger site_media_write_audit
after insert or update or delete on public.site_media
for each row execute function public.write_audit_log();

drop policy if exists "public read active site media" on public.site_media;
create policy "public read active site media"
on public.site_media for select to anon, authenticated
using (is_active = true or public.is_active_staff());

drop policy if exists "authenticated manage site media" on public.site_media;
drop policy if exists "active staff manage site media" on public.site_media;
create policy "active staff manage site media"
on public.site_media for all to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

-- Public pages can read only files intentionally placed in website/.
drop policy if exists "public read website media" on storage.objects;
create policy "public read website media"
on storage.objects for select to anon
using (
  bucket_id = 'project-files'
  and (storage.foldername(name))[1] = 'website'
);

create index if not exists site_media_public_order_idx
on public.site_media (category, is_active, sort_order, created_at desc);

commit;
