import fs from 'node:fs';import assert from 'node:assert/strict';import {createClient} from '@supabase/supabase-js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));const config=read('.verification/local-stack/connection.json'),users=read('.verification/local-stack/browser-users.json'),document=read('.verification/local-stack/browser-document.json');
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const make=key=>createClient(config.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});const admin=make(config.SERVICE_ROLE_KEY);const check=r=>{if(r.error)throw new Error(r.error.message);return r.data;};
const checks=[];
for(const user of users){const c=make(config.ANON_KEY);check(await c.auth.signInWithPassword(user));assert.equal(check(await c.auth.getUser()).user.id,user.id);const projects=check(await c.from('projects').select('id'));assert.ok(!projects.some(p=>p.id===(user.role==='individual'?'10000000-0000-0000-0000-000000000201':'10000000-0000-0000-0000-000000000202')));checks.push({name:user.role+' Auth/REST after all upgrades',passed:true});}
const owner=users.find(u=>u.role==='owner');const c=make(config.ANON_KEY);check(await c.auth.signInWithPassword(owner));
for(const [table,payload]of [['projects',{name:'missing'}],['documents',{name:'missing'}]]){const r=await c.from(table).update(payload).eq('id','ffffffff-ffff-ffff-ffff-ffffffffffff').select('id').single();assert.equal(r.error?.code,'PGRST116');}
assert.equal((await c.from('documents').delete().eq('id','ffffffff-ffff-ffff-ffff-ffffffffffff').select('id').single()).error?.code,'PGRST116');checks.push({name:'zero-row edits and deletes are errors',passed:true});
const request=check(await c.from('material_requests').insert({project_id:'10000000-0000-0000-0000-000000000201',item_name:'Synthetic attachment verification',created_by:owner.id}).select('id').single());
const attachment=check(await c.from('material_request_attachments').insert({material_request_id:request.id,phase:'purchase',file_url:document.path,file_name:'Synthetic purchase file',uploaded_by:owner.id}).select('id,phase').single());assert.equal(attachment.phase,'purchase');
assert.ok((await c.from('material_request_attachments').insert({material_request_id:request.id,phase:'invalid',file_url:document.path,file_name:'invalid'})).error);checks.push({name:'purchase attachment phase exists and is constrained',passed:true});
check(await admin.from('platform_admins').insert({user_id:owner.id}));
try{const billing=check(await c.rpc('list_all_companies_billing'));assert.ok(billing.some(row=>row.is_individual===true));assert.ok(billing.some(row=>row.is_individual===false));checks.push({name:'billing reports individual/company distinction',passed:true});}finally{check(await admin.from('platform_admins').delete().eq('user_id',owner.id));}
const anonymous=make(config.ANON_KEY);assert.deepEqual(check(await anonymous.from('projects').select('id')),[]);assert.ok((await anonymous.rpc('list_all_companies_billing')).error);checks.push({name:'visitor cannot call privileged billing RPC',passed:true});
fs.writeFileSync('verification-results/api-regression-real-local.json',JSON.stringify({checks,productionTouched:false},null,2));
console.log('PASS local Auth/REST regression: '+checks.length+' role, schema and affected-row checks');
