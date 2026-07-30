-- EBC Supabase mobile production preflight
-- Read-only: returns the remaining security and platform metadata in one table.
-- Run only after the table/RLS and expected-column checks have completed.

with expected_functions(signature) as (
  values
    ('public.set_updated_at()'),
    ('public.is_active_staff(uuid)'),
    ('public.is_admin_staff(uuid)'),
    ('public.write_audit_log()'),
    ('public.submit_estimate_request(uuid,text,text,text,text,text,text,text)')
),
function_checks as (
  select
    'function'::text as check_group,
    expected_functions.signature::text as item,
    case when functions.oid is null then 'missing' else 'present' end::text as state,
    concat(
      'security_definer=', coalesce(functions.prosecdef::text, 'NULL'),
      ' | config=', coalesce(array_to_string(functions.proconfig, ','), 'NULL')
    )::text as details
  from expected_functions
  left join pg_proc as functions
    on functions.oid = to_regprocedure(expected_functions.signature)
),
policy_checks as (
  select
    'policy'::text as check_group,
    concat(policies.tablename, '.', policies.policyname)::text as item,
    case
      when 'authenticated' = any (policies.roles) then 'authenticated'
      when 'anon' = any (policies.roles) then 'anonymous'
      else 'other'
    end::text as state,
    concat(
      'roles=', array_to_string(policies.roles, ','),
      ' | cmd=', policies.cmd,
      ' | permissive=', policies.permissive,
      ' | using=', coalesce(policies.qual, 'NULL'),
      ' | check=', coalesce(policies.with_check, 'NULL')
    )::text as details
  from pg_policies as policies
  where policies.schemaname = 'public'
    and policies.tablename in (
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
),
trigger_check as (
  select
    'trigger'::text as check_group,
    'expected public tables'::text as item,
    case
      when count(*) = 0 then 'none'
      else concat(count(*), ' observed')
    end::text as state,
    coalesce(
      string_agg(
        concat(
          event_object_table,
          '.',
          trigger_name,
          ' [',
          action_timing,
          ' ',
          event_manipulation,
          ']'
        ),
        ' | '
        order by event_object_table, trigger_name, event_manipulation
      ),
      'none'
    )::text as details
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
),
expected_buckets(bucket_id) as (
  values
    ('project-files'),
    ('render-inputs'),
    ('project-renders')
),
bucket_checks as (
  select
    'bucket'::text as check_group,
    expected_buckets.bucket_id::text as item,
    case when buckets.id is null then 'missing' else 'present' end::text as state,
    concat(
      'public=', coalesce(buckets.public::text, 'NULL'),
      ' | file_size_limit=', coalesce(buckets.file_size_limit::text, 'NULL'),
      ' | mime_types=', coalesce(array_to_string(buckets.allowed_mime_types, ','), 'NULL')
    )::text as details
  from expected_buckets
  left join storage.buckets as buckets
    on buckets.id = expected_buckets.bucket_id
),
migration_check as (
  select
    'migration_history'::text as check_group,
    'supabase_migrations.schema_migrations'::text as item,
    case
      when to_regclass('supabase_migrations.schema_migrations') is null then 'missing'
      else 'present'
    end::text as state,
    'relation existence only'::text as details
),
grant_check as (
  select
    'grants'::text as check_group,
    'anon/authenticated expected-table privileges'::text as item,
    case
      when count(*) = 0 then 'none'
      else concat(count(*), ' observed')
    end::text as state,
    coalesce(
      string_agg(
        concat(table_name, '.', grantee, '.', privilege_type),
        ' | '
        order by table_name, grantee, privilege_type
      ),
      'none'
    )::text as details
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
)
select
  checks.check_group,
  checks.item,
  checks.state,
  checks.details
from (
  select * from policy_checks
  union all
  select * from function_checks
  union all
  select * from trigger_check
  union all
  select * from bucket_checks
  union all
  select * from migration_check
  union all
  select * from grant_check
) as checks
order by
  case checks.check_group
    when 'policy' then 1
    when 'function' then 2
    when 'trigger' then 3
    when 'bucket' then 4
    when 'migration_history' then 5
    when 'grants' then 6
    else 7
  end,
  checks.item;
