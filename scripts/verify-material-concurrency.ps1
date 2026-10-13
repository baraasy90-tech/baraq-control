$ErrorActionPreference='Stop'
$taskResults=@()
foreach($taskPhase in @('sample','purchase')) {
  $taskId=[guid]::NewGuid().ToString()
  $taskStatus=if($taskPhase-eq 'sample'){'draft'}else{'sample_approved'}
  $taskSeed="BEGIN; SET LOCAL session_replication_role=replica; UPDATE public.projects SET procurement_department_id='10000000-0000-0000-0000-000000000112' WHERE id='10000000-0000-0000-0000-000000000201'; INSERT INTO public.material_requests(id,project_id,item_name,created_by,status,quote_price) VALUES ('$taskId','10000000-0000-0000-0000-000000000201','Synthetic concurrent material','10000000-0000-0000-0000-000000000002','$taskStatus',100); COMMIT;"
  docker exec supabase_db_local-stack psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $taskSeed | Out-Null
  if($LASTEXITCODE-ne 0){throw 'Material concurrency fixture failed'}
  $taskSteps = @(@{user_id='10000000-0000-0000-0000-000000000003'}) | ConvertTo-Json -Compress -AsArray
  $taskRpc=if($taskPhase-eq 'sample'){"public.submit_material_sourcing('$taskId',null)"}else{"public.submit_material_purchase_chain('$taskId','$taskSteps'::jsonb,null)"}
  $taskAction="SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false); SELECT $taskRpc;"
  $taskJob=Start-Job -ScriptBlock {param($sql) $output=docker exec supabase_db_local-stack psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $sql 2>&1; [pscustomobject]@{Code=$LASTEXITCODE;Output=($output-join "`n")}} -ArgumentList "BEGIN; $taskAction SELECT pg_sleep(3); COMMIT;"
  $taskReady=$false
  for($taskAttempt=0;$taskAttempt-lt 40;$taskAttempt++) {
    $taskState=docker exec supabase_db_local-stack psql -U postgres -d postgres -At -c "SELECT count(*) FROM pg_stat_activity WHERE wait_event='PgSleep' AND query LIKE '%$taskId%';"
    if($taskState.Trim()-eq '1'){$taskReady=$true;break}; Start-Sleep -Milliseconds 100
  }
  if(-not $taskReady){$taskFailure=Receive-Job -Job $taskJob -Wait;throw "First material request failed: $($taskFailure.Output)"}
  $taskSecond=docker exec supabase_db_local-stack psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $taskAction 2>&1
  $taskSecondCode=$LASTEXITCODE
  $taskFirst=Receive-Job -Job $taskJob -Wait;Remove-Job -Job $taskJob
  $taskCount=docker exec supabase_db_local-stack psql -U postgres -d postgres -At -c "SELECT count(*) FROM public.approval_chains WHERE material_request_id='$taskId' AND phase='$taskPhase';"
  if($taskFirst.Code-ne 0-or $taskSecondCode-eq 0-or $taskCount.Trim()-ne '1'){throw "Material concurrency failed: $taskPhase"}
  $taskResults+=@{phase=$taskPhase;firstExit=$taskFirst.Code;secondExit=$taskSecondCode;chains=1;independentConnections=$true;passed=$true}
  Write-Output "PASS independent connections: material $taskPhase creates exactly one chain"
}
$taskResults | ConvertTo-Json | Set-Content -LiteralPath 'verification-results/material-concurrency-real.json' -Encoding utf8

