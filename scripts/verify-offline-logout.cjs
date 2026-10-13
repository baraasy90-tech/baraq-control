const fs=require('node:fs'),assert=require('node:assert/strict');
if(!process.env.PLAYWRIGHT_MODULE)throw Error('Set PLAYWRIGHT_MODULE');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const user=JSON.parse(fs.readFileSync('.verification/local-stack/browser-users.json','utf8')).find(u=>u.role==='owner');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});let offline=false;const errors=[];
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();
   if(offline&&url.port==='54321')return route.abort('internetdisconnected');
   return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4180/');await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).click();
  await page.getByLabel('البريد الإلكتروني',{exact:true}).fill(user.email);await page.getByLabel('كلمة المرور',{exact:true}).fill(user.password);await page.locator('button[type=submit]').click();
  await page.getByRole('button',{name:'تسجيل الخروج',exact:true}).waitFor();
  await page.goto('http://127.0.0.1:4180/projects/10000000-0000-0000-0000-000000000201/budget');
  await page.getByRole('button',{name:'تسجيل الخروج',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('sb-')&&k.endsWith('-auth-token')).length),1);
  await page.evaluate(()=>sessionStorage.setItem('unrelated-test-setting','keep'));
  offline=true;await page.getByRole('button',{name:'تسجيل الخروج',exact:true}).click();await page.getByRole('button',{name:'نعم',exact:true}).click();
  await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('sb-')&&k.includes('-auth-token')).length),0);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('unrelated-test-setting')),'keep');
  assert.equal(await page.getByRole('button',{name:'تسجيل الخروج',exact:true}).count(),0);
  await page.reload();await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).waitFor();
  await page.goBack();await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'تسجيل الخروج',exact:true}).count(),0);assert.deepEqual(errors,[]);
  fs.writeFileSync('verification-results/offline-logout.json',JSON.stringify({passed:true,serverUnreachable:true,localCredentialsRemoved:true,reloadRemainsSignedOut:true,historyRemainsSignedOut:true,unrelatedStoragePreserved:true,clientErrors:errors},null,2));
  console.log('PASS offline logout: local credentials removed immediately, cached session cannot return after reload');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
