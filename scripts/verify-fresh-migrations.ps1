$ErrorActionPreference = 'Stop'
# Fixed local container and a newly generated database; never accepts a remote URL.
$taskContainer = 'supabase_db_local-stack'
$taskDatabase = 'baraq_fresh_' + [guid]::NewGuid().ToString('N')
$taskDump = '/tmp/' + $taskDatabase + '.sql'
$taskRoot = Split-Path $PSScriptRoot -Parent
function Invoke-LocalSql([string]$sql) {
  $taskOutput = $sql | docker exec -i $taskContainer psql -U supabase_admin -d $taskDatabase -v ON_ERROR_STOP=1 2>&1
  if ($LASTEXITCODE -ne 0) { $taskOutput | Select-Object -Last 8; throw 'Fresh local database SQL failed; no production connection was used.' }
}
docker exec $taskContainer pg_dump -U supabase_admin -d postgres --schema-only --file=$taskDump
if ($LASTEXITCODE -ne 0) { throw 'Local infrastructure schema dump failed' }
docker exec $taskContainer psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $taskDatabase TEMPLATE template0;" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Fresh database creation failed' }
$taskRestore = docker exec $taskContainer psql -U supabase_admin -d $taskDatabase -v ON_ERROR_STOP=1 -f $taskDump 2>&1
if ($LASTEXITCODE -ne 0) { $taskRestore | Select-Object -Last 8; throw 'Local infrastructure schema restore failed' }
# Discard copied application definitions only in the fresh, empty verification database.
Invoke-LocalSql 'DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS app_private CASCADE; CREATE SCHEMA public; GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;'
Invoke-LocalSql @'
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects',p.policyname);
  END LOOP;
END $$;
'@
$taskMigrations = @(Get-ChildItem -LiteralPath (Join-Path $taskRoot 'supabase/migrations') -Filter '*.sql' | Where-Object { $_.Name -match '^\d{14}_' } | Sort-Object Name)
foreach ($taskMigration in $taskMigrations) {
  Invoke-LocalSql (Get-Content -Raw -LiteralPath $taskMigration.FullName)
  Write-Output "PASS canonical migration: $($taskMigration.Name)"
}
Invoke-LocalSql @'
DO $$ BEGIN
  IF (SELECT count(*) FROM pg_tables WHERE schemaname='public')<>43 THEN RAISE EXCEPTION 'Table count mismatch'; END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='material_request_attachments' AND column_name='phase') THEN RAISE EXCEPTION 'Attachment phase missing'; END IF;
  IF (SELECT count(*) FROM storage.buckets WHERE id IN ('company-logos','signatures','checklist-photos','documents') AND NOT public AND file_size_limit IS NOT NULL AND allowed_mime_types IS NOT NULL)<>4 THEN RAISE EXCEPTION 'Private buckets or upload limits missing'; END IF;
END $$;
'@
$taskReport = @{ passed=$true; database=$taskDatabase; localContainer=$taskContainer; migrations=@($taskMigrations.Name); productionDataCopied=$false; applicationRows=0 }
$taskReport | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $taskRoot 'verification-results/fresh-migrations.json') -Encoding utf8
Write-Output "PASS fresh isolated application schema and $($taskMigrations.Count) upgrades"
