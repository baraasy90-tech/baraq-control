const fs=require('node:fs'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
if(!process.env.PLAYWRIGHT_MODULE)throw Error('Set PLAYWRIGHT_MODULE');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const config=read('.verification/local-stack/connection.json');assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const user=read('.verification/local-stack/browser-users.json').find(u=>u.role==='owner');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64');
const check=r=>{if(r.error)throw r.error;return r.data;};
(async()=>{
 const client=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 check(await client.auth.signInWithPassword({email:user.email,password:user.password}));
 const profile=check(await client.from('profiles').select('company_id').eq('id',user.id).single());
 const signature=user.id+'/ui-signature-'+Date.now()+'.png';
 check(await client.storage.from('signatures').upload(signature,png,{contentType:'image/png'}));
 const project=check(await client.from('projects').insert({company_id:profile.company_id,name:'اختبار حفظ استلام '+Date.now(),manager_name:'مدير الاختبار',manager_signature_url:signature,department_id:'10000000-0000-0000-0000-000000000111'}).select('id').single());
 const activity=check(await client.from('activities').insert({project_id:project.id,name:'بند استلام اختباري',start_date:'2026-01-01',requires_receiving:true}).select('id').single());
 check(await client.rpc('save_checklist_atomic',{p_activity_id:activity.id,p_items:[{id:crypto.randomUUID(),text:'فحص الصورة المطلوبة',photo_required:true,order:1}]}));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});let lost=false;const ids=[],photoUploads=[],errors=[];
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();
   if(url.pathname.startsWith('/storage/v1/object/checklist-photos/')&&request.method()==='POST')photoUploads.push(url.pathname);
   if(url.pathname==='/rest/v1/rpc/save_receiving_submission'){
    ids.push(request.postDataJSON().p_submission_id);
    if(!lost){const response=await route.fetch();assert.equal(response.status(),200,await response.text());lost=true;return route.abort('connectionfailed');}
   }
   return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4180/');await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).click();
  await page.getByLabel('البريد الإلكتروني',{exact:true}).fill(user.email);await page.getByLabel('كلمة المرور',{exact:true}).fill(user.password);await page.locator('button[type=submit]').click();
  await page.getByRole('button',{name:'تسجيل الخروج',exact:true}).waitFor();
  await page.goto('http://127.0.0.1:4180/projects/'+project.id+'/receiving');
  await page.getByRole('button',{name:/بند استلام اختباري/}).click();await page.getByRole('button',{name:'تقديم استلام جديد',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByRole('checkbox').check();
  await dialog.locator('input[type=file]').first().setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:png});
  await dialog.getByRole('button',{name:'إرسال التقديم',exact:true}).click();
  await dialog.getByText('تعذّر إرسال التقديم — تحقق من الاتصال وحاول مجدداً',{exact:true}).waitFor();
  const first=check(await client.from('submissions').select('id').eq('activity_id',activity.id));assert.equal(first.length,1);
  await dialog.getByRole('button',{name:'إرسال التقديم',exact:true}).click();await dialog.waitFor({state:'hidden'});
  const after=check(await client.from('submissions').select('id').eq('activity_id',activity.id));
  assert.equal(after.length,1);assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);assert.equal(photoUploads.length,1);assert.deepEqual(errors,[]);
  fs.writeFileSync('verification-results/receiving-ui-real.json',JSON.stringify({passed:true,realBackend:true,responseLostAfterCommit:true,retryUsesSameId:true,submissions:1,photoUploads:1,clientErrors:errors},null,2));
  console.log('PASS real receiving UI: required photo, signature, lost response, exactly one submission and one upload');
 }finally{await browser.close();await client.auth.signOut();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
