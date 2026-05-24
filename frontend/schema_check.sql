select
  n.id as novel_id,
  n.title,
  count(c.id) filter (where c.is_published = true) as published_chapters,
  min(c.chapter_number) as first_chapter_number,
  max(c.chapter_number) as last_chapter_number,
  count(cc.id) as chunk_count
from novels n
left join chapters c on c.novel_id = n.id
left join chapter_chunks cc on cc.chapter_id = c.id
group by n.id, n.title
order by n.created_at desc
limit 20;


select jsonb_pretty(
  jsonb_build_object(
    'tables',
    (
      select jsonb_agg(
        jsonb_build_object(
          'table_name', c.table_name,
          'columns', (
            select jsonb_agg(
              jsonb_build_object(
                'column_name', c2.column_name,
                'data_type', c2.data_type,
                'udt_name', c2.udt_name,
                'is_nullable', c2.is_nullable,
                'column_default', c2.column_default
              )
              order by c2.ordinal_position
            )
            from information_schema.columns c2
            where c2.table_schema = 'public'
              and c2.table_name = c.table_name
          )
        )
        order by c.table_name
      )
      from (
        select distinct table_name
        from information_schema.columns
        where table_schema = 'public'
      ) c
    ),

    'constraints',
    (
      select jsonb_agg(
        jsonb_build_object(
          'table_name', tc.table_name,
          'constraint_name', tc.constraint_name,
          'constraint_type', tc.constraint_type,
          'definition', pg_get_constraintdef(pc.oid)
        )
        order by tc.table_name, tc.constraint_name
      )
      from information_schema.table_constraints tc
      join pg_constraint pc
        on pc.conname = tc.constraint_name
      where tc.table_schema = 'public'
    ),

    'indexes',
    (
      select jsonb_agg(
        jsonb_build_object(
          'table_name', tablename,
          'index_name', indexname,
          'definition', indexdef
        )
        order by tablename, indexname
      )
      from pg_indexes
      where schemaname = 'public'
    ),

    'functions',
    (
      select jsonb_agg(
        jsonb_build_object(
          'function_name', p.proname,
          'arguments', pg_get_function_arguments(p.oid),
          'returns', pg_get_function_result(p.oid),
          'definition', pg_get_functiondef(p.oid)
        )
        order by p.proname
      )
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
    ),

    'policies',
    (
      select jsonb_agg(
        jsonb_build_object(
          'schemaname', schemaname,
          'tablename', tablename,
          'policyname', policyname,
          'permissive', permissive,
          'roles', roles,
          'cmd', cmd,
          'qual', qual,
          'with_check', with_check
        )
        order by tablename, policyname
      )
      from pg_policies
      where schemaname = 'public'
    )
  )
) as schema_context;
