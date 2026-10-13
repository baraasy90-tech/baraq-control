const fs=require('node:fs'),assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process');
const {createClient}=require('@supabase/supabase-js');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const config=read('.verification/local-stack/connection.json');assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const user=read('.verification/local-stack/browser-users.json').find(u=>u.role==='owner');
const fixture=read('.verification/local-stack/browser-document.json');
const check=r=>{if(r.error)throw r.error;return r.data;};
const sql=query=>{const r=spawnSync('docker',['exec','supabase_db_local-stack','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',query],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
(async()=>{
 const client=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 check(await client.auth.signInWithPassword({email:user.email,password:user.password}));
 const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 assert.match(user.id,/^[a-f0-9-]{36}$/i);assert.match(fixture.folderId,/^[a-f0-9-]{36}$/i);
 const path=user.id+'/link-race-'+Date.now()+'.txt',documentId=crypto.randomUUID();
 check(await client.storage.from('documents').upload(path,Buffer.from('Synthetic in-flight file reference'),{contentType:'text/plain'}));
 sql(`BEGIN;SET LOCAL session_replication_role=replica;UPDATE storage.objects SET created_at=now()-interval '3 days',updated_at=now()-interval '3 days' WHERE bucket_id='documents' AND name='${path}';UPDATE app_private.storage_orphan_scan_state SET last_object_id=null;COMMIT;`);
 const action=`BEGIN;SET LOCAL ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${user.id}',true);INSERT INTO public.documents(id,folder_id,name,file_url) VALUES ('${documentId}','${fixture.folderId}','Synthetic in-flight reference','${path}');SELECT pg_sleep(4);COMMIT;`;
 const first=spawn('docker',['exec','supabase_db_local-stack','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',action]);
 let firstOutput='';first.stdout.on('data',x=>firstOutput+=x);first.stderr.on('data',x=>firstOutput+=x);
 const completion=new Promise(resolve=>first.on('close',resolve));
 let ready=false;
 for(let i=0;i<30;i++){
  if(sql(`SELECT count(*) FROM pg_stat_activity WHERE wait_event='PgSleep' AND query LIKE '%${documentId}%';`)==='1'){ready=true;break;}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert.ok(ready,'Reference transaction did not acquire its lock: '+firstOutput);
 check(await admin.rpc('enqueue_storage_orphans',{p_limit:500,p_min_age_hours:24}));
 assert.equal(sql(`SELECT count(*) FROM app_private.storage_cleanup_queue WHERE bucket='documents' AND path='${path}';`),'0','In-flight linked file was queued as orphan');
 const claims=check(await admin.rpc('claim_storage_cleanup',{p_limit:50}));assert.ok(!claims.some(j=>j.path===path));
 for(const claim of claims)check(await admin.rpc('finish_storage_cleanup',{p_id:claim.id,p_error:'Released unrelated test claim'}));
 assert.equal(await completion,0,firstOutput);
 assert.equal(check(await client.from('documents').select('id').eq('id',documentId)).length,1);
 check(await client.storage.from('documents').download(path));
 fs.writeFileSync('verification-results/storage-link-concurrency.json',JSON.stringify({passed:true,independentConnections:true,inFlightReferenceProtected:true,orphanNotQueued:true,filePreserved:true},null,2));
 await client.auth.signOut();console.log('PASS file-link concurrency: orphan scan and cleanup skip an in-flight reference');
})().catch(e=>{console.error(e.message);process.exitCode=1});
