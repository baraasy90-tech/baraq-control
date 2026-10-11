import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
const root = new URL("../", import.meta.url);
const read = relative => fs.readFileSync(new URL(relative, root), "utf8");
import assert from "node:assert/strict";
const db=new PGlite();
const id=n=>"00000000-0000-0000-0000-"+String(n).padStart(12,"0");
const q=n=>"'"+id(n)+"'";
const tests=[];
async function test(name,run){await run();tests.push({name,passed:true});console.log("PASS",name);}
async function actor(n,role="authenticated"){await db.exec("reset role;set role "+role);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):""]);}
const one=async sql=>(await db.query(sql)).rows[0];
const denied=(run,pattern)=>assert.rejects(run,pattern);
await db.exec(read("supabase/tests/phase1-fixture.sql"));
const old=read("supabase/migrations/0044_close_rls_workflow_gaps.sql");
await db.exec(old.match(/create or replace function public.guard_protected_columns\(\)[\s\S]*?\$\$;/)[0]);
await db.exec(read("supabase/migrations/0075_budget_actual_entry_approval.sql"));
await actor(1);
await test("baseline reproduces forged approved budget insertion",async()=>{
await db.exec("insert into budget_actual_entries(id,activity_id,amount,status) values("+q(601)+","+q(301)+",100,'approved')");
assert.equal((await one("select status from budget_actual_entries where id="+q(601))).status,"approved");
});
await db.exec("reset role");
await db.exec(read("supabase/migrations/20261011150156_harden_payment_creation.sql"));
await db.exec(read("supabase/migrations/20261011150157_save_receiving_atomically.sql"));
await actor(1);
await test("upgrade preserves existing approved rows",async()=>assert.equal((await one("select status from budget_actual_entries where id="+q(601))).status,"approved"));
await test("member cannot insert approved corporate payment",()=>denied(()=>db.exec("insert into budget_actual_entries(activity_id,amount,status) values("+q(301)+",100,'approved')"),/حالة الاعتماد/));
await test("member cannot forge approver on draft",()=>denied(()=>db.exec("insert into budget_actual_entries(activity_id,amount,pm_reviewed_by) values("+q(301)+",100,"+q(2)+")"),/بيانات المعتمد/));
await test("normal payment starts in draft",async()=>{
await db.exec("insert into budget_actual_entries(id,activity_id,amount) values("+q(602)+","+q(301)+",100)");
assert.equal((await one("select status from budget_actual_entries where id="+q(602))).status,"draft");
});
await test("individual collaborator cannot self approve",()=>denied(()=>db.exec("insert into budget_actual_entries(activity_id,amount,status) values("+q(302)+",100,'approved')"),/حالة الاعتماد/));
await actor(4);
await test("individual owner can immediately approve positive payment",()=>db.exec("insert into budget_actual_entries(activity_id,amount,status) values("+q(302)+",100,'approved')"));
await test("individual owner cannot approve zero payment",()=>denied(()=>db.exec("insert into budget_actual_entries(activity_id,amount,status) values("+q(302)+",0,'approved')"),/مبلغ موجب/));
await test("RLS rejects another company",()=>denied(()=>db.exec("insert into budget_actual_entries(activity_id,amount) values("+q(301)+",100)"),/row-level security/));
await actor(1);
for(const [table,column,parent,initial] of [["contract_payments","contract_id",401,"pending"],["contract_extra_works","contract_id",401,"draft"],["contracts","project_id",201,"draft"],["material_requests","project_id",201,"draft"]]){
await test(table+" rejects forged approved state",()=>denied(()=>db.exec("insert into "+table+"(id,"+column+",status) values("+q(800+tests.length)+","+q(parent)+",'approved')"),/حالة الاعتماد/));
await test(table+" accepts normal initial state",()=>db.exec("insert into "+table+"(id,"+column+",status) values("+q(900+tests.length)+","+q(parent)+",'"+initial+"')"));
}
await test("contract cannot start settled",()=>denied(()=>db.exec("insert into contracts(id,project_id,settlement_status) values("+q(990)+","+q(201)+",'closed')"),/التسوية/));
await test("member cannot review submitted budget",async()=>{
await db.query("select submit_budget_entry($1)",[id(602)]);
await denied(()=>db.query("select review_budget_entry($1,true,null)",[id(602)]),/صلاحية اعتماد/);
});
await actor(2);
await test("PM advances exactly one stage",async()=>{
await db.query("select review_budget_entry($1,true,null)",[id(602)]);
assert.equal((await one("select status from budget_actual_entries where id="+q(602))).status,"pending_finance_approval");
await denied(()=>db.query("select review_budget_entry($1,true,null)",[id(602)]),/المالي النهائي/);
});
await actor(3);
await test("finance approval completes and repeated review fails",async()=>{
await db.query("select review_budget_entry($1,true,null)",[id(602)]);
await denied(()=>db.query("select review_budget_entry($1,true,null)",[id(602)]),/ليست بانتظار/);
});
await actor(1);
const save=(n,create=true,images=["photo"],decision="approved",items=[{checklist_item_id:id(501),checked:true,image_url:"required-photo"}],activity=301)=>
db.query("select * from save_receiving_submission($1,$2,$3,$4,$5,$6,$7,$8,$9)",[id(n),id(activity),create,"Manager","signature",decision,null,JSON.stringify(items),images]);
await test("receiving saves children and Riyadh date",async()=>{
await save(701);
assert.equal((await one("select count(*)::int as n from checklist_results where submission_id="+q(701))).n,1);
assert.equal((await one("select count(*)::int as n from submission_images where submission_id="+q(701))).n,1);
assert.equal((await one("select actual_end_date=(now() at time zone 'Asia/Riyadh')::date as ok from activities where id="+q(301))).ok,true);
});
await test("same form retry never duplicates",async()=>{
await save(701);
assert.equal((await one("select count(*)::int as n from submissions where id="+q(701))).n,1);
assert.equal((await one("select count(*)::int as n from submission_images where submission_id="+q(701))).n,1);
});
await test("changed retry cannot silently overwrite saved form",()=>denied(()=>save(701,true,["different"]),/سبق حفظ/));
await test("late image error rolls back new submission",async()=>{
await denied(()=>save(702,true,["FAIL"]),/check constraint/);
assert.equal((await one("select count(*)::int as n from submissions where id="+q(702))).n,0);
});
await test("failed edit preserves previous record and attachments",async()=>{
await denied(()=>save(701,false,["FAIL"],"rejected"),/check constraint/);
assert.equal((await one("select decision from submissions where id="+q(701))).decision,"approved");
assert.equal((await one("select image_url from submission_images where submission_id="+q(701))).image_url,"photo");
});
await test("foreign checklist item rejected",()=>denied(()=>save(701,false,[],"rejected",[{checklist_item_id:id(502),checked:true,image_url:"x"}]),/قائمة الاستلام/));
await test("required checklist photo enforced",()=>denied(()=>save(703,true,[],"approved",[{checklist_item_id:id(501),checked:true,image_url:null}]),/قائمة الاستلام/));
await test("incomplete checklist rejected",()=>denied(()=>save(703,true,[],"approved",[]),/قائمة الاستلام/));
await test("missing edit cannot report success",()=>denied(()=>save(799,false),/التقديم غير موجود/));
await actor(4);
await test("receiving respects project RLS",()=>denied(()=>save(703),/النشاط غير موجود/));
await actor(null,"anon");
await test("anon cannot execute receiving RPC",()=>denied(()=>save(703),/permission denied/));
await test("anon cannot execute approval RPC",()=>denied(()=>db.query("select submit_budget_entry($1)",[id(602)]),/permission denied/));
await db.exec("reset role");
await test("all approval RPCs include row locks",async()=>{
const rows=(await db.query("select pg_get_functiondef(oid) as definition from pg_proc where proname in ('submit_budget_entry','review_budget_entry','reset_budget_entry_to_draft','submit_contract_payment','review_contract_payment')")).rows;
assert.equal(rows.length,5);rows.forEach(r=>assert.match(r.definition,/for update of/));
});
fs.mkdirSync(new URL("verification-results/", root), {recursive:true});
fs.writeFileSync(new URL("verification-results/database.json", root),JSON.stringify({engine:"PGlite PostgreSQL",fixture:"isolated representative schema; not production",tests},null,2));
await db.close();console.log(tests.length+" SQL checks passed.");
