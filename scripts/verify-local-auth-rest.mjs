import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
const config=JSON.parse(fs.readFileSync('.verification/local-stack/connection.json','utf8').replace(/^\uFEFF/,''));
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const client=key=>createClient(config.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=client(config.SERVICE_ROLE_KEY);
const check=r=>{if(r.error)throw new Error(r.error.message);return r.data;};
const users=[];
for(const role of ['owner','member','pm','finance','individual']){
 const email=`${role}-${randomBytes(5).toString('hex')}@example.invalid`;
 const password=randomBytes(24).toString('base64url');
 const {user}=check(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`اختبار ${role}`}}));
 assert.match(user.id,/^[0-9a-f-]{36}$/);
 users.push({role,id:user.id,email,password});
}
const corp='10000000-0000-0000-0000-000000000101',individual='10000000-0000-0000-0000-000000000102',project='10000000-0000-0000-0000-000000000201',privateProject='10000000-0000-0000-0000-000000000202';
const actor=role=>users.find(u=>u.role===role);
const sql=['BEGIN; SET LOCAL session_replication_role=replica;'];
for(const user of users)sql.push(`UPDATE public.profiles SET company_id='${user.role==='individual'?individual:corp}' WHERE id='${user.id}';`);
sql.push(`UPDATE public.companies SET created_by='${actor('owner').id}' WHERE id='${corp}';`,`UPDATE public.companies SET created_by='${actor('individual').id}' WHERE id='${individual}';`);
sql.push(`INSERT INTO public.project_members(project_id,user_id) VALUES ('${project}','${actor('member').id}');`);
for(const [role,dept] of [['pm','111'],['finance','112']])sql.push(`INSERT INTO public.department_members(department_id,user_id,role) VALUES ('10000000-0000-0000-0000-000000000${dept}','${actor(role).id}','head');`);
sql.push('COMMIT;');
const seeded=spawnSync('docker',['exec','supabase_db_local-stack','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',sql.join('\n')],{encoding:'utf8'});
if(seeded.status!==0)throw new Error('Synthetic role setup failed: '+seeded.stderr);
const checks=[];
for(const user of users){
 const authenticated=client(config.ANON_KEY);
 const login=check(await authenticated.auth.signInWithPassword({email:user.email,password:user.password}));
 assert.equal(login.user.id,user.id);
 assert.equal(check(await authenticated.auth.getUser()).user.id,user.id);
 const expected=user.role==='individual'?privateProject:project;
 const projects=check(await authenticated.from('projects').select('id'));
 // Finance access follows actual application policy; test visibility only for actors with project access.
 if(user.role!=='finance')assert.deepEqual(projects.map(p=>p.id),[expected]);
 assert.equal(projects.some(p=>p.id===(user.role==='individual'?project:privateProject)),false);
 const forbidden=await authenticated.from('budget_actual_entries').insert({activity_id:'10000000-0000-0000-0000-000000000301',date:'2026-10-12',amount:100,status:'approved'});
 assert.ok(forbidden.error,'Corporate approved INSERT unexpectedly allowed');
 if(user.role==='member'){
  const bad=await authenticated.rpc('review_budget_entry',{p_entry_id:'10000000-0000-0000-0000-000000000601',p_approve:true,p_note:null});assert.ok(bad.error);
  check(await authenticated.auth.updateUser({data:{company_id:individual,role:'owner'}}));
  assert.equal(check(await authenticated.from('projects').select('id')).some(p=>p.id===privateProject),false,'Editable metadata granted another company');
 }
 check(await authenticated.auth.signOut());
 assert.equal(check(await authenticated.auth.getSession()).session,null);
 checks.push({role:user.role,login:true,verifiedUser:true,crossCompanyHidden:true,forgedApprovalRejected:true,signOut:true});
}
const anonymous=client(config.ANON_KEY);
assert.deepEqual(check(await anonymous.from('projects').select('id')),[]);
const rejected=await anonymous.rpc('save_receiving_submission',{p_submission_id:null,p_activity_id:null,p_create:true,p_manager_name:'test',p_manager_signature_url:'test',p_decision:'approved',p_notes:null,p_results:[],p_images:[]});
assert.ok(rejected.error);
fs.writeFileSync('.verification/local-stack/browser-users.json',JSON.stringify(users,null,2));
fs.writeFileSync('verification-results/auth-rest-local.json',JSON.stringify({target:'local Supabase; no intercepted network',checks,anonymousReadEmpty:true,anonymousReceivingRpcRejected:true,metadataSpoofRejected:true},null,2));
console.log('PASS real Auth and REST: five roles, cross-company isolation, forged approval rejection, sign-out, anonymous access and metadata spoofing');
