$ErrorActionPreference='Stop'
$taskContract=[guid]::NewGuid().ToString();$taskRequest=[guid]::NewGuid().ToString();$taskChain=[guid]::NewGuid().ToString();$taskStep=[guid]::NewGuid().ToString()
$taskSeed="BEGIN; SET LOCAL session_replication_role=replica; INSERT INTO public.contracts(id,project_id,contract_name,total_value,status) VALUES ('$taskContract','10000000-0000-0000-0000-000000000201','Concurrency contract',100,'pending_pm_approval'); INSERT INTO public.internal_requests(id,company_id,user_id,title,status) VALUES ('$taskRequest','10000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000002','Concurrency request','pending'); INSERT INTO public.internal_approval_chains(id,internal_request_id) VALUES ('$taskChain','$taskRequest'); INSERT INTO public.internal_approval_chain_steps(id,chain_id,step_order,department_id,assigned_user_id) VALUES ('$taskStep','$taskChain',1,'10000000-0000-0000-0000-000000000111','10000000-0000-0000-0000-000000000003'); COMMIT;"
docker exec supabase_db_local-stack psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $taskSeed | Out-Null
if($LASTEXITCODE-ne 0){throw 'Concurrency fixture failed'}
$taskResults=@()
foreach($taskCase in @(@{Name='contract';Id=$taskContract;Rpc='review_contract';Table='contracts';Expected='pending_finance_approval'},@{Name='internal chain';Id=$taskStep;Rpc='review_internal_approval_step';Table='internal_approval_chain_steps';Expected='approved'})){
 $taskAction="SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',false); SELECT public.$($taskCase.Rpc)('$($taskCase.Id)',true,null);"
 $taskSql="BEGIN; $taskAction SELECT pg_sleep(3); COMMIT;"
 $taskJob=Start-Job -ScriptBlock {param($sql) $output=docker exec supabase_db_local-stack psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $sql 2>&1; [pscustomobject]@{Code=$LASTEXITCODE;Output=($output-join "`n")}} -ArgumentList $taskSql
 $taskReady=$false
 for($taskAttempt=0;$taskAttempt-lt 40;$taskAttempt++){
  $taskState=docker exec supabase_db_local-stack psql -U postgres -d postgres -At -c "SELECT count(*) FROM pg_stat_activity WHERE wait_event='PgSleep' AND query LIKE '%$($taskCase.Id)%';"
  if($taskState.Trim()-eq '1'){$taskReady=$true;break};Start-Sleep -Milliseconds 100
 }
 if(-not $taskReady){$taskFailure=Receive-Job -Job $taskJob -Wait;throw "First request did not acquire lock: $($taskFailure.Output)"}
 $taskSecond=docker exec supabase_db_local-stack psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c $taskAction 2>&1
 $taskSecondCode=$LASTEXITCODE
 $taskFirst=Receive-Job -Job $taskJob -Wait;Remove-Job -Job $taskJob
 $taskStatus=docker exec supabase_db_local-stack psql -U postgres -d postgres -At -c "SELECT status FROM public.$($taskCase.Table) WHERE id='$($taskCase.Id)';"
 if($taskFirst.Code-ne 0-or $taskSecondCode-eq 0-or $taskStatus.Trim()-ne $taskCase.Expected){throw "Concurrency failed: $($taskCase.Name)"}
 $taskResults+=@{name=$taskCase.Name;firstExit=$taskFirst.Code;secondExit=$taskSecondCode;status=$taskStatus.Trim();independentConnections=$true;passed=$true}
 Write-Output "PASS independent connections: $($taskCase.Name)"
}
$taskResults | ConvertTo-Json | Set-Content -LiteralPath 'verification-results\workflow-concurrency-real.json' -Encoding utf8
