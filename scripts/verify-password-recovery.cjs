const fs=require('fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const config=JSON.parse(fs.readFileSync('.verification/local-stack/connection.json','utf8'));
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1');
const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false}});
let stage='setup';
(async()=>{
 const id=crypto.randomUUID(),email=`recovery-${id}@example.invalid`,oldPassword=`Old-test-${id}`,newPassword=`New-test-${id}`;
 const created=await admin.auth.admin.createUser({email,password:oldPassword,email_confirm:true,user_metadata:{full_name:'Synthetic recovery user'}});
 if(created.error)throw created.error;
 const userId=created.data.user.id;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  const page=await context.newPage();let passwordUpdates=0;
  page.on('request',r=>{if(r.method()==='PUT'&&new URL(r.url()).pathname==='/auth/v1/user')passwordUpdates++;});
  stage='missing link';await page.goto('http://127.0.0.1:4180/reset-password');await page.getByRole('heading',{name:'رابط الاستعادة غير متاح'}).waitFor();
  stage='request';await page.goto('http://127.0.0.1:4180/');await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).click();
  await page.getByRole('button',{name:'نسيت كلمة المرور؟',exact:true}).click();
  await page.getByLabel('البريد الإلكتروني',{exact:true}).fill(email);await page.getByRole('button',{name:'إرسال رابط الاستعادة',exact:true}).click();
  await page.getByRole('status').filter({hasText:'إذا كان البريد مرتبطاً بحساب'}).waitFor();
  stage='local email';let message;
  for(let attempt=0;attempt<12&&!message;attempt++){
   const inbox=await(await fetch('http://127.0.0.1:54324/api/v1/messages')).json();
   message=inbox.messages.find(m=>m.To.some(t=>t.Address===email));
   if(!message)await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert.ok(message,'Recovery email must reach local mailbox');
  const mail=await(await fetch('http://127.0.0.1:54324/api/v1/message/'+message.ID)).json();
  const links=[...(mail.HTML??mail.Text??'').matchAll(/https?:\/\/[^\s"<>]+/g)].map(x=>x[0].replaceAll('&amp;','&'));
  const link=links.find(s=>s.includes('/auth/v1/verify')&&s.includes('type=recovery'));
  assert.ok(link);assert.equal(new URL(link).origin,config.API_URL);
  stage='valid link';await page.goto(link);await page.getByRole('heading',{name:'تعيين كلمة مرور جديدة'}).waitFor();
  assert.equal(new URL(page.url()).pathname,'/reset-password');assert.equal(new URL(page.url()).hash,'');
  stage='reload';await page.reload();await page.getByRole('heading',{name:'تعيين كلمة مرور جديدة'}).waitFor();
  stage='confirmation mismatch';await page.getByLabel('كلمة المرور الجديدة',{exact:true}).fill(newPassword);await page.getByLabel('تأكيد كلمة المرور الجديدة',{exact:true}).fill(newPassword+'different');
  await page.getByRole('button',{name:'حفظ كلمة المرور الجديدة',exact:true}).click();await page.getByText('كلمتا المرور غير متطابقتين.',{exact:true}).waitFor();assert.equal(passwordUpdates,0);
  const signedOut=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/auth/v1/logout');
  stage='save';await page.getByLabel('تأكيد كلمة المرور الجديدة',{exact:true}).fill(newPassword);await page.getByRole('button',{name:'حفظ كلمة المرور الجديدة',exact:true}).click();
  await page.getByRole('heading',{name:'تم تحديث كلمة المرور',exact:true}).waitFor();assert.equal(passwordUpdates,1);
  assert.equal((await signedOut).status(),204);
  await page.waitForFunction(()=>sessionStorage.getItem('sb-127-auth-token')===null);
  await page.getByRole('heading',{name:'تم تحديث كلمة المرور',exact:true}).waitFor();
  await page.getByRole('button',{name:'تسجيل الدخول بالكلمة الجديدة',exact:true}).click();await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).waitFor();
  stage='credential verification';
  const signIn=async password=>fetch(config.API_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:config.ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  assert.equal((await signIn(oldPassword)).status,400);
  const success=await signIn(newPassword);assert.equal(success.status,200);
  const newSession=await success.json();
  stage='normal session cannot reset';const normal=await browser.newContext({serviceWorkers:'block'});
  await normal.addInitScript(session=>sessionStorage.setItem('sb-127-auth-token',JSON.stringify(session)),newSession);
  const normalPage=await normal.newPage();await normalPage.goto('http://127.0.0.1:4180/reset-password');await normalPage.getByRole('heading',{name:'رابط الاستعادة غير متاح'}).waitFor();await normal.close();
  stage='used link';await page.goto(link);await page.getByRole('heading',{name:'رابط الاستعادة غير متاح'}).waitFor();assert.equal(await page.getByRole('button',{name:'حفظ كلمة المرور الجديدة'}).count(),0);
  fs.writeFileSync('verification-results/password-recovery.json',JSON.stringify({passed:true,actualLocalEmail:true,actualPasswordUpdated:true,successSurvivesSignOut:true,oldPasswordRejected:true,newPasswordAccepted:true,reloadSupported:true,mismatchedConfirmationBlocked:true,ordinarySessionRejected:true,usedLinkRejected:true,productionEmailSent:false},null,2));
  console.log('PASS actual local password recovery: email, redirect, reload, password update, old/new credentials, ordinary session and used link');
 }finally{await browser.close();await admin.auth.admin.deleteUser(userId);}
})().catch(()=>{console.error('Password recovery verification failed at stage: '+stage);process.exitCode=1});
