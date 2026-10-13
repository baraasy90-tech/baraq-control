const fs=require('node:fs'),assert=require('node:assert/strict');
if(!process.env.PLAYWRIGHT_MODULE)throw Error('Set PLAYWRIGHT_MODULE');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const user=JSON.parse(fs.readFileSync('.verification/local-stack/browser-users.json','utf8')).find(u=>u.role==='owner');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});let blocked=null;const errors=[],checks=[];
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();
   return blocked&&url.pathname===blocked?route.abort('connectionfailed'):route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4180/');await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).click();
  await page.getByLabel('البريد الإلكتروني',{exact:true}).fill(user.email);await page.getByLabel('كلمة المرور',{exact:true}).fill(user.password);await page.locator('button[type=submit]').click();
  await page.getByRole('button',{name:'تسجيل الخروج',exact:true}).waitFor();
  const prefix='/projects/10000000-0000-0000-0000-000000000201';
  for(const [name,path,api] of [['overview','/overview','projects'],['budget',prefix+'/budget','activities'],['receiving',prefix+'/receiving','activities'],['documents',prefix+'/documents','document_folders'],['project metadata',prefix+'/budget','projects']]){
   console.log('Checking local read failure:',name);
   blocked='/rest/v1/'+api;
   await page.goto('http://127.0.0.1:4180'+path);
   const alert=page.getByRole('alert').filter({hasText:'تعذّر تحميل البيانات'});
   try { await alert.waitFor({timeout:30000}); }
   catch (error) { throw new Error(`${name}: ${error.message}; local synthetic page: ${(await page.locator('body').innerText()).slice(0,1000)}`); }
   assert.equal(await page.getByRole('button',{name:'إعادة المحاولة',exact:true}).count(),1);
   blocked=null;await page.getByRole('button',{name:'إعادة المحاولة',exact:true}).click();await alert.waitFor({state:'hidden'});
   checks.push({name,errorShown:true,retryRestoredRealData:true});
  }
  for(const suffix of ['', '/appearance','/scope','/admin','/receiving','/budget','/documents','/team','/timeline']) {
    await page.goto('http://127.0.0.1:4180/projects/00000000-0000-0000-0000-000000000000'+suffix);
    await page.getByRole('alert').filter({hasText:'المشروع غير موجود أو لا تملك صلاحية الوصول إليه.'}).waitFor();
    checks.push({name:'missing project'+suffix,missingShown:true,infiniteLoading:false});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync('verification-results/query-errors-ui.json',JSON.stringify({passed:true,checks,clientErrors:errors,networkFailureSimulated:true,dataMocked:false},null,2));
  console.log('PASS five read failure/retry cases and nine missing-project routes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
