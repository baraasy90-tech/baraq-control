const fs = require('node:fs');
const assert = require('node:assert/strict');
const {createClient} = require('@supabase/supabase-js');
const runtime = process.env.PLAYWRIGHT_MODULE;
if (!runtime) throw new Error('Set PLAYWRIGHT_MODULE to the installed Playwright module path');
const {chromium} = require(runtime);
const read = path => JSON.parse(fs.readFileSync(path,'utf8').replace(/^\uFEFF/,''));
const connection = read('.verification/local-stack/connection.json');
assert.equal(new URL(connection.API_URL).hostname,'127.0.0.1');
const user = read('.verification/local-stack/browser-users.json').find(u=>u.role==='owner');
const project = '10000000-0000-0000-0000-000000000201';
const name = 'اختبار حفظ عقد ' + Date.now();
(async()=>{
 const client=createClient(connection.API_URL,connection.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const login=await client.auth.signInWithPassword({email:user.email,password:user.password});
 if(login.error)throw login.error;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  let lostResponse=false;const requestIds=[];const errors=[];
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();
   if(url.pathname==='/rest/v1/rpc/save_contract_atomic'){
    const payload=route.request().postDataJSON();requestIds.push(payload.p_id);
    if(!lostResponse){
     const response=await route.fetch();assert.equal(response.status(),200);
     lostResponse=true;
     // The real database has committed; simulate losing its response, without faking data.
     return route.abort('connectionfailed');
    }
   }
   return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4180/');
  await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).click();
  await page.getByLabel('البريد الإلكتروني',{exact:true}).fill(user.email);
  await page.getByLabel('كلمة المرور',{exact:true}).fill(user.password);
  await page.locator('button[type=submit]').click();
  await page.getByRole('button',{name:'تسجيل الخروج',exact:true}).waitFor();
  await page.goto('http://127.0.0.1:4180/projects/'+project+'/contract');
  await page.getByRole('button',{name:'إضافة عقد',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('اسم العقد',{exact:true}).fill(name);
  await dialog.getByRole('button',{name:'إنشاء ومتابعة',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('[role=dialog] button')].some(b=>b.textContent.includes('إنشاء ومتابعة')&&!b.disabled));
  assert.equal(lostResponse,true);
  const saved=await client.from('contracts').select('id').eq('project_id',project).eq('contract_name',name);
  if(saved.error)throw saved.error;assert.equal(saved.data.length,1,'First request did not commit exactly once');
  await dialog.getByRole('button',{name:'إنشاء ومتابعة',exact:true}).click();
  await page.waitForURL('**/contract/'+saved.data[0].id);
  assert.equal(requestIds.length,2);assert.equal(requestIds[0],requestIds[1],'Retry changed draft identity');
  const after=await client.from('contracts').select('id').eq('project_id',project).eq('contract_name',name);
  if(after.error)throw after.error;assert.equal(after.data.length,1);assert.deepEqual(errors,[]);
  fs.writeFileSync('verification-results/contract-ui-real.json',JSON.stringify({passed:true,realBackend:true,responseLostAfterCommit:true,retryUsesSameId:true,rows:1,clientErrors:errors},null,2));
  console.log('PASS real contract UI: lost committed response, retry, exactly one contract');
 }finally{await browser.close();await client.auth.signOut();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
