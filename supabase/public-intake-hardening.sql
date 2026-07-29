-- EBC public estimate intake hardening
-- Run after schema.sql or staff-security-migration.sql.
-- Replaces direct anonymous lead inserts with an idempotent validated RPC.

alter table public.leads
add column if not exists submission_token uuid;

create unique index if not exists leads_submission_token_uidx
on public.leads (submission_token)
where submission_token is not null;

create or replace function public.submit_estimate_request(
  p_submission_token uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_service text,
  p_preferred_timing text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_id uuid;
  created_id uuid;
  clean_name text := trim(coalesce(p_name, ''));
  clean_phone text := trim(coalesce(p_phone, ''));
  clean_email text := nullif(trim(coalesce(p_email, '')), '');
  clean_address text := nullif(trim(coalesce(p_address, '')), '');
  clean_service text := nullif(trim(coalesce(p_service, '')), '');
  clean_timing text := nullif(trim(coalesce(p_preferred_timing, '')), '');
  clean_message text := nullif(trim(coalesce(p_message, '')), '');
begin
  if p_submission_token is null then
    raise exception 'invalid_submission_token';
  end if;

  select id into existing_id
  from public.leads
  where submission_token = p_submission_token;

  if existing_id is not null then
    return existing_id;
  end if;

  if char_length(clean_name) not between 2 and 120 then
    raise exception 'invalid_name';
  end if;

  if char_length(clean_phone) not between 7 and 30 then
    raise exception 'invalid_phone';
  end if;

  if clean_email is not null and char_length(clean_email) > 254 then
    raise exception 'invalid_email';
  end if;

  if clean_address is null or char_length(clean_address) > 500 then
    raise exception 'invalid_address';
  end if;

  if clean_service is null or clean_service not in (
    'Concrete / Concreto',
    'Grading / Nivelación',
    'Excavation / Excavación',
    'Pavers / Adoquines',
    'Landscaping / Jardinería',
    'Remodeling / Remodelación',
    'Other / Otro'
  ) then
    raise exception 'invalid_service';
  end if;

  if clean_timing is not null and char_length(clean_timing) > 200 then
    raise exception 'invalid_timing';
  end if;

  if clean_message is null or char_length(clean_message) > 5000 then
    raise exception 'invalid_message';
  end if;

  insert into public.leads (
    submission_token,
    name,
    phone,
    email,
    address,
    service,
    preferred_timing,
    message,
    status,
    estimated_value,
    source
  )
  values (
    p_submission_token,
    clean_name,
    clean_phone,
    clean_email,
    clean_address,
    clean_service,
    clean_timing,
    clean_message,
    'new',
    null,
    'website'
  )
  returning id into created_id;

  return created_id;
exception
  when unique_violation then
    select id into existing_id
    from public.leads
    where submission_token = p_submission_token;
    return existing_id;
end;
$$;

revoke all on function public.submit_estimate_request(uuid,text,text,text,text,text,text,text) from public;
grant execute on function public.submit_estimate_request(uuid,text,text,text,text,text,text,text) to anon, authenticated;

-- Anonymous users must use the validated RPC rather than writing leads directly.
drop policy if exists "public can create leads" on public.leads;
revoke insert on public.leads from anon;

-- Public file metadata must match the exact lead folder and conservative limits.
drop policy if exists "public can add estimate file metadata" on public.project_files;
create policy "public can add estimate file metadata"
on public.project_files for insert to anon
with check (
  lead_id is not null
  and project_id is null
  and uploaded_by is null
  and storage_path like 'incoming/' || lead_id::text || '/%'
  and size_bytes between 1 and 15728640
  and mime_type in (
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/avif'
  )
);

grant insert on public.project_files to anon;

-- Keep the private bucket large enough for staff videos, while expanding safe image support.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'video/mp4',
  'video/quicktime',
  'application/pdf'
]
where id = 'project-files';

-- Public users can upload only image files into incoming/. They cannot read that folder.
drop policy if exists "public upload estimate photos" on storage.objects;
create policy "public upload estimate photos"
on storage.objects for insert to anon
with check (
  bucket_id = 'project-files'
  and (storage.foldername(name))[1] = 'incoming'
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','heic','heif','avif')
);
