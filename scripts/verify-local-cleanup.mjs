import fs from 'node:fs';import assert from 'node:assert/strict';import {createClient} from '@supabase/supabase-js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));const config=read('.verification/local-stack/connection.json'),users=read('.verification/local-stack/browser-users.json'),fixture=read('.verification/local-stack/browser-document.json');
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const make=key=>createClient(config.API_URL,key,{auth:{persistSession:false}});const admin=make(config.SERVICE_ROLE_KEY);const check=r=>{if(r.error)throw new Error(r.error.message);return r.data;};
const actor=async role=>{const u=users.find(u=>u.role===role),c=make(config.ANON_KEY);const session=check(await c.auth.signInWithPassword(u)).session;return{u,c,token:session.access_token};};
const {u,c,token}=await actor('owner'),outsider=await actor('individual');
assert.ok(u.email.endsWith('@example.invalid')&&outsider.u.email.endsWith('@example.invalid'),'Synthetic accounts required');
const name=`cleanup-${Date.now()}.txt`,path=`${u.id}/${name}`,foreignPath=`${outsider.u.id}/${name}`;
const createdIds=[];const claimedIds=[];
try {
check(await c.storage.from('documents').upload(path,new Blob(['Synthetic cleanup verification'],{type:'text/plain'})));
const insert=stored=>c.from('documents').insert({folder_id:fixture.folderId,name:'Synthetic cleanup document',file_url:stored}).select('id').single();
const a=check(await insert(path)),b=check(await insert(path));
createdIds.push(a.id,b.id);
check(await c.from('documents').delete().eq('id',a.id).select('id').single());
const invoke=authorization=>fetch(`${config.API_URL}/functions/v1/storage-cleanup`,{method:'POST',headers:{apikey:config.ANON_KEY,Authorization:'Bearer '+authorization,'Content-Type':'application/json'},body:'{"limit":20}'});
assert.equal((await invoke(token)).status,401);assert.ok((await c.rpc('claim_storage_cleanup',{p_limit:20})).error);
let response=await invoke(config.SERVICE_ROLE_KEY);assert.equal(response.status,200,await response.clone().text());check(await c.storage.from('documents').download(path));
check(await c.from('documents').delete().eq('id',b.id).select('id').single());
const jobs=check(await admin.rpc('claim_storage_cleanup',{p_limit:50}));claimedIds.push(...jobs.map(j=>j.id));const job=jobs.find(j=>j.path===path);assert.ok(job,'Deleted last reference not queued');
assert.ok((await insert(path)).error,'A new reference was allowed while cleanup held the file');
check(await admin.rpc('finish_storage_cleanup',{p_id:job.id,p_error:'Synthetic transient Storage failure'}));
response=await invoke(config.SERVICE_ROLE_KEY);assert.equal(response.status,200,await response.clone().text());assert.ok((await c.storage.from('documents').download(path)).error,'File survived successful cleanup');
check(await outsider.c.storage.from('documents').upload(foreignPath,new Blob(['Foreign company file'],{type:'text/plain'})));
assert.ok((await insert(foreignPath)).error,'Foreign company file could be linked');
response=await invoke(config.SERVICE_ROLE_KEY);assert.equal(response.status,200);check(await outsider.c.storage.from('documents').download(foreignPath));
fs.writeFileSync('verification-results/cleanup-real-local.json',JSON.stringify({passed:true,serverOnly:true,sharedReferencePreserved:true,lastReferenceQueued:true,activeLeaseBlocksNewReference:true,transientFailureRetried:true,removed:true,otherCompanyFilePreserved:true,productionTouched:false},null,2));
console.log('PASS real cleanup worker: server authorization, shared references, last-reference deletion, lease safety, retry and foreign company protection');
} finally {
 for(const id of claimedIds) await admin.rpc('finish_storage_cleanup',{p_id:id,p_error:'Local test lease released'});
 if(createdIds.length) check(await admin.from('documents').delete().in('id',createdIds));
 check(await admin.storage.from('documents').remove([path,foreignPath]));
 await Promise.all([c.auth.signOut(),outsider.c.auth.signOut()]);
}
