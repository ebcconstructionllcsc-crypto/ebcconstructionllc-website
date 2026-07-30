-- EBC versioned quotes migration
-- Run after schema.sql or staff-security-migration.sql.

begin;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  language text not null default 'en' check (language in ('en','es')),
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined','expired')),
  client_name text not null,
  client_phone text,
  client_email text,
  project_address text,
  valid_through date,
  fields jsonb not null default '{}'::jsonb,
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  tax_rate numeric(7,4) not null default 0 check (tax_rate >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  payment_schedule jsonb not null default '[]'::jsonb,
  revision integer not null default 1 check (revision >= 1),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table if not exists public.quote_versions (
  id bigint generated always as identity primary key,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  revision integer not null check (revision >= 1),
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (quote_id, revision)
);

create or replace function public.prepare_quote_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  old_payload jsonb;
  new_payload jsonb;
begin
  new.updated_at = now();
  new.updated_by = auth.uid();

  if tg_op = 'INSERT' then
    new.revision = greatest(coalesce(new.revision, 1), 1);
    if new.status = 'accepted' and new.accepted_at is null then
      new.accepted_at = now();
    end if;
    return new;
  end if;

  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    new.accepted_at = now();
  elsif new.status <> 'accepted' then
    new.accepted_at = null;
  end if;

  old_payload = to_jsonb(old) - array['updated_at','updated_by','revision','accepted_at'];
  new_payload = to_jsonb(new) - array['updated_at','updated_by','revision','accepted_at'];

  if new_payload is distinct from old_payload then
    new.revision = old.revision + 1;
  else
    new.revision = old.revision;
  end if;

  return new;
end;
$$;

create or replace function public.archive_quote_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.quote_versions (quote_id, revision, snapshot, created_by)
    values (new.id, new.revision, to_jsonb(new), auth.uid())
    on conflict (quote_id, revision) do nothing;
    return new;
  end if;

  if new.revision is distinct from old.revision then
    insert into public.quote_versions (quote_id, revision, snapshot, created_by)
    values (new.id, new.revision, to_jsonb(new), auth.uid())
    on conflict (quote_id, revision) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.archive_quote_revision() from public;

drop trigger if exists quotes_prepare_write on public.quotes;
create trigger quotes_prepare_write
before insert or update on public.quotes
for each row execute function public.prepare_quote_write();

drop trigger if exists quotes_archive_revision on public.quotes;
create trigger quotes_archive_revision
after insert or update on public.quotes
for each row execute function public.archive_quote_revision();

drop trigger if exists quotes_write_audit on public.quotes;
create trigger quotes_write_audit
after insert or update or delete on public.quotes
for each row execute function public.write_audit_log();

alter table public.quotes enable row level security;
alter table public.quote_versions enable row level security;

drop policy if exists "active staff manage quotes" on public.quotes;
create policy "active staff manage quotes"
on public.quotes for all to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

drop policy if exists "active staff read quote versions" on public.quote_versions;
create policy "active staff read quote versions"
on public.quote_versions for select to authenticated
using (public.is_active_staff());

create index if not exists quotes_status_updated_at_idx
on public.quotes (status, updated_at desc);

create index if not exists quotes_lead_id_idx
on public.quotes (lead_id);

create index if not exists quotes_client_id_idx
on public.quotes (client_id);

create index if not exists quotes_project_id_idx
on public.quotes (project_id);

create index if not exists quote_versions_quote_revision_idx
on public.quote_versions (quote_id, revision desc);

commit;
