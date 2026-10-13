$ErrorActionPreference = 'Stop'
$taskWorkdir = (Get-Location).Path
$taskSession = "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',false);"
$taskFirstSql = "BEGIN; $taskSession SELECT review_budget_entry('10000000-0000-0000-0000-000000000602',true,null); SELECT pg_sleep(3); COMMIT;"
$taskSecondSql = "$taskSession SELECT review_budget_entry('10000000-0000-0000-0000-000000000602',true,null);"
$taskFirst = Start-Job -ScriptBlock { param($sql) $result = docker exec supabase_db_local-stack psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $sql 2>&1; [pscustomobject]@{Code=$LASTEXITCODE;Output=($result -join "`n")} } -ArgumentList $taskFirstSql
# Wait for the first independent connection to hold the row lock, rather than guessing timing.
$taskLocked = $false
for ($taskAttempt=0; $taskAttempt -lt 30; $taskAttempt++) {
  $taskState = docker exec supabase_db_local-stack psql -U postgres -d postgres -At -c "SELECT count(*) FROM pg_stat_activity WHERE wait_event='PgSleep' AND query LIKE '%000000000602%';"
  if ($taskState.Trim() -eq '1') { $taskLocked=$true; break }
  Start-Sleep -Milliseconds 100
}
if (-not $taskLocked) { throw 'First connection never reached its lock-holding state' }
$taskSecond = docker exec supabase_db_local-stack psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $taskSecondSql 2>&1
$taskSecondCode = $LASTEXITCODE
$taskFirstResult = Receive-Job -Job $taskFirst -Wait
Remove-Job -Job $taskFirst
$taskFinalState = docker exec supabase_db_local-stack psql -U postgres -d postgres -At -c "SELECT status FROM budget_actual_entries WHERE id='10000000-0000-0000-0000-000000000602';"
if ($taskFirstResult.Code -ne 0 -or $taskSecondCode -eq 0 -or $taskFinalState.Trim() -ne 'pending_finance_approval') { throw 'Concurrent PM review validation failed' }
$taskResult = @{passed=$true;firstExit=$taskFirstResult.Code;secondExit=$taskSecondCode;finalStatus=$taskFinalState.Trim();independentConnections=$true;secondOutput=($taskSecond -join "`n")}
$taskResult | ConvertTo-Json | Set-Content -LiteralPath 'verification-results\concurrency-real-postgres.json' -Encoding utf8
Write-Output 'PASS independent PostgreSQL connections: concurrent PM review advances only one stage'
