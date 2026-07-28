-- EBC website media library migration
-- Run once in Supabase Dashboard > SQL Editor.

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
  created_at timestamptz not null default now()
);

alter table public.site_media enable row level security;

drop policy if exists "public read active site media" on public.site_media;
create policy "public read active site media"
on public.site_media for select to anon, authenticated
using (is_active = true or auth.role() = 'authenticated');

drop policy if exists "authenticated manage site media" on public.site_media;
create policy "authenticated manage site media"
on public.site_media for all to authenticated
using (true) with check (true);

-- EBC staff can already manage the private project-files bucket.
-- This policy permits public pages to read only files intentionally placed in website/.
drop policy if exists "public read website media" on storage.objects;
create policy "public read website media"
on storage.objects for select to anon
using (bucket_id = 'project-files' and (storage.foldername(name))[1] = 'website');
