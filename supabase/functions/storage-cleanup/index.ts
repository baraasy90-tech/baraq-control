import {createClient} from 'npm:@supabase/supabase-js@2.112.0';
import {readBoundedJson} from '../_shared/request-policy.ts';

// Server job only. Never invoke with a frontend key or expose the service-role credential.
Deno.serve(async(req:Request)=>{
 const json=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 if(req.method!=='POST')return json(405,{error:'POST required'});
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!key||req.headers.get('Authorization')!==`Bearer ${key}`)return json(401,{error:'Server authorization required'});
 let limit=20;
 if(req.body){try{const body=await readBoundedJson(req);if(!body||typeof body!=='object'||!('limit' in body)||typeof body.limit!=='number'||!Number.isInteger(body.limit)||body.limit<1||body.limit>50)return json(400,{error:'limit must be 1–50'});limit=body.limit;}catch{return json(400,{error:'Invalid request body'});}}
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10000)})}});
 const {error:scanError}=await admin.rpc('enqueue_storage_orphans',{p_limit:100,p_min_age_hours:24});
 if(scanError)return json(503,{error:'Orphan scan unavailable'});
 const {data:jobs,error}=await admin.rpc('claim_storage_cleanup',{p_limit:limit});
 if(error)return json(503,{error:'Cleanup queue unavailable'});
 let removed=0,failed=0;
 for(const job of jobs??[]){
  try{
   const result=await admin.storage.from(job.bucket).remove([job.path]);
   const {error:finishError}=await admin.rpc('finish_storage_cleanup',{p_id:job.id,p_error:result.error?'Storage removal failed':null});
   if(result.error||finishError)failed++;else removed++;
  }catch{
   failed++;
   try{await admin.rpc('finish_storage_cleanup',{p_id:job.id,p_error:'Storage connection failed'});}catch{/* Lease expiry permits a later retry. */}
  }
 }
 return json(failed?503:200,{processed:(jobs??[]).length,removed,failed});
});
