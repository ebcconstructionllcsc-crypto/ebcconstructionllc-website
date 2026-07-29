-- EBC private invoice and payment tracking.
-- Run once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

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

create index if not exists invoices_user_created_idx on public.invoices (user_id, created_at desc);
drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();
drop trigger if exists invoices_write_audit on public.invoices;
create trigger invoices_write_audit after insert or update or delete on public.invoices
  for each row execute function public.write_audit_log();

alter table public.invoices enable row level security;
revoke all on public.invoices from anon;
grant select,insert,update,delete on public.invoices to authenticated;
drop policy if exists "staff manage own invoices" on public.invoices;
create policy "staff manage own invoices" on public.invoices
  for all to authenticated
  using (user_id = auth.uid() and public.is_active_staff())
  with check (user_id = auth.uid() and public.is_active_staff());
