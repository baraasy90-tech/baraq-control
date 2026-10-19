import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {createClient} from '@supabase/supabase-js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));const config=read('.verification/local-stack/connection.json'),users=read('.verification/local-stack/browser-users.json');assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false}});const check=r=>{if(r.error)throw new Error(r.error.message);return r.data;};
for(const bucket of ['company-logos','signatures','checklist-photos','documents']){const existing=await admin.storage.getBucket(bucket);if(existing.error)check(await admin.storage.createBucket(bucket,{public:false}));}
for(const args of [['cp','supabase/migrations-history/20261012101733_storage_upload_limits.sql','supabase_db_local-stack:/tmp/storage-limits.sql'],['exec','supabase_db_local-stack','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-f','/tmp/storage-limits.sql']]){const r=spawnSync('docker',args,{encoding:'utf8'});if(r.status!==0)throw new Error('Local bucket limits failed: '+r.stderr);}
const actor=async role=>{const u=users.find(u=>u.role===role);const c=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});check(await c.auth.signInWithPassword(u));return {c,u};};
const {c:owner,u}=await actor('owner');const path=`${u.id}/storage-verify-${Date.now()}.txt`;
check(await owner.storage.from('documents').upload(path,new Blob(['Synthetic document recovery verification.'],{type:'text/plain'})));
check(await owner.storage.from('documents').createSignedUrl(path,600));
const {c:outsider}=await actor('individual');assert.ok((await outsider.storage.from('documents').createSignedUrl(path,600)).error,'Other company signed file');
assert.ok((await owner.storage.from('documents').upload(`${u.id}/blocked.html`,new Blob(['<script>'],{type:'text/html'}))).error,'Active HTML upload allowed');
assert.ok((await owner.storage.from('signatures').upload(`${u.id}/large.png`,new Blob([new Uint8Array(3*1024*1024)],{type:'image/png'}))).error,'Oversize signature allowed');
const bucket=check(await admin.storage.getBucket('documents'));assert.equal(bucket.file_size_limit,25*1024*1024);
const importLimits=fs.readFileSync('supabase/migrations/20261018122406_document_folder_import.sql','utf8').split('create index')[0];
const configured=spawnSync('docker',['exec','supabase_db_local-stack','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',importLimits],{encoding:'utf8'});if(configured.status!==0)throw new Error('Local document import limits failed');
assert.equal(check(await admin.storage.getBucket('documents')).file_size_limit,50*1024*1024);
const folder=check(await owner.from('document_folders').insert({project_id:'10000000-0000-0000-0000-000000000201',name:'اختبار روابط المستندات'}).select('id').single());
const expired=`${config.API_URL}/storage/v1/object/sign/documents/${path}?token=expired-test-token`;
const doc=check(await owner.from('documents').insert({folder_id:folder.id,name:'مستند اختبار الرابط',file_url:expired}).select('id').single());
fs.writeFileSync('.verification/local-stack/browser-document.json',JSON.stringify({folderId:folder.id,documentId:doc.id,name:'مستند اختبار الرابط',path,expiredUrl:expired},null,2));
fs.writeFileSync('verification-results/storage-real-local.json',JSON.stringify({passed:true,signedRead:true,otherCompanyDenied:true,htmlDenied:true,oversizeSignatureDenied:true,documentLimitMiB:50,productionTouched:false},null,2));
console.log('PASS real Storage: authorized signing, cross-company denial, MIME and size enforcement; expired-link browser fixture ready');

