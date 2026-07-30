-- EBC Supabase production preflight
-- Read-only: run in Supabase Dashboard > SQL Editor before any migration.
-- The result contains schema and security metadata only, never customer rows.

with expected_tables(table_name) as (
  values
    ('staff_profiles'),
    ('leads'),
    ('clients'),
    ('projects'),
    ('project_files'),
    ('audit_log'),
    ('site_media'),
    ('quotes'),
    ('quote_versions'),
    ('render_jobs'),
    ('invoices')
)
select
  expected_tables.table_name,
  case when tables.oid is null then 'missing' else 'present' end as object_state,
  coalesce(tables.relrowsecurity, false) as rls_enabled,
  coalesce(tables.relforcerowsecurity, false) as force_rls
from expected_tables
left join pg_namespace
  on pg_namespace.nspname = 'public'
left join pg_class as tables
  on tables.relnamespace = pg_namespace.oid
  and tables.relname = expected_tables.table_name
  and tables.relkind in ('r', 'p')
order by expected_tables.table_name;

with expected_columns(table_name, column_name) as (
  values
    ('leads', 'submission_token'),
    ('project_files', 'lead_id'),
    ('project_files', 'project_id'),
    ('project_files', 'storage_path'),
    ('project_files', 'mime_type'),
    ('project_files', 'size_bytes'),
    ('project_files', 'uploaded_by')
)
select
  expected_columns.table_name,
  expected_columns.column_name,
  case when columns.column_name is null then 'missing' else 'present' end as column_state,
  columns.data_type,
  columns.is_nullable
from expected_columns
left join information_schema.columns as columns
  on columns.table_schema = 'public'
  and columns.table_name = expected_columns.table_name
  and columns.column_name = expected_columns.column_name
order by expected_columns.table_name, expected_columns.column_name;

with expected_tables(table_name) as (
  values
    ('staff_profiles'),
    ('leads'),
    ('clients'),
    ('projects'),
    ('project_files'),
    ('audit_log'),
    ('site_media'),
    ('quotes'),
    ('quote_versions'),
    ('render_jobs'),
    ('invoices')
)
select
  expected_tables.table_name,
  policies.policyname,
  policies.roles,
  policies.cmd,
  policies.permissive
from expected_tables
left join pg_policies as policies
  on policies.schemaname = 'public'
  and policies.tablename = expected_tables.table_name
order by expected_tables.table_name, policies.policyname;

with expected_functions(signature) as (
  values
    ('public.set_updated_at()'),
    ('public.is_active_staff(uuid)'),
    ('public.is_admin_staff(uuid)'),
    ('public.write_audit_log()'),
    ('public.submit_estimate_request(uuid,text,text,text,text,text,text,text)')
)
select
  expected_functions.signature,
  case when functions.oid is null then 'missing' else 'present' end as function_state,
  functions.prosecdef as security_definer,
  functions.proconfig as function_config
from expected_functions
left join pg_proc as functions
  on functions.oid = to_regprocedure(expected_functions.signature)
order by expected_functions.signature;

select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in (
    'staff_profiles',
    'leads',
    'clients',
    'projects',
    'project_files',
    'site_media',
    'quotes',
    'render_jobs',
    'invoices'
  )
order by event_object_table, trigger_name, event_manipulation;

with expected_buckets(bucket_id) as (
  values
    ('project-files'),
    ('render-inputs'),
    ('project-renders')
)
select
  expected_buckets.bucket_id,
  case when buckets.id is null then 'missing' else 'present' end as bucket_state,
  buckets.public,
  buckets.file_size_limit,
  buckets.allowed_mime_types
from expected_buckets
left join storage.buckets as buckets
  on buckets.id = expected_buckets.bucket_id
order by expected_buckets.bucket_id;

select
  case
    when migrations.oid is null then 'missing'
    else 'present'
  end as migration_history_state
from (
  select to_regclass('supabase_migrations.schema_migrations') as oid
) as migrations;

select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'staff_profiles',
    'leads',
    'clients',
    'projects',
    'project_files',
    'audit_log',
    'site_media',
    'quotes',
    'quote_versions',
    'render_jobs',
    'invoices'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
