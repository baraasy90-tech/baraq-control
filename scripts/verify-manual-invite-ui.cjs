const fs=require('node:fs'),assert=require('node:assert/strict');
if(!process.env.PLAYWRIGHT_MODULE)throw Error('Set PLAYWRIGHT_MODULE');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const user=JSON.parse(fs.readFileSync('.verification/local-stack/browser-users.json','utf8')).find(u=>u.role==='owner');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
 try{
  const context=await browser.newContext({serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']});
  let emailRequests=0;const errors=[];
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();
   if(url.pathname==='/functions/v1/send-invite-email')emailRequests++;
   return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4180/');await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).click();
  await page.getByLabel('البريد الإلكتروني',{exact:true}).fill(user.email);await page.getByLabel('كلمة المرور',{exact:true}).fill(user.password);await page.locator('button[type=submit]').click();
  await page.getByRole('button',{name:'تسجيل الخروج',exact:true}).waitFor();
  await page.goto('http://127.0.0.1:4180/control-panel');await page.getByRole('button',{name:'الدعوات والموظفين',exact:true}).click();
  await page.getByLabel('البريد الإلكتروني',{exact:true}).fill('synthetic-manual-'+Date.now()+'@example.invalid');
  await page.getByRole('button',{name:'إنشاء رابط دعوة',exact:true}).click();
  await page.getByText('تم إنشاء رابط الدعوة. انسخه وشاركه مع الشخص المدعو.',{exact:true}).waitFor();
  const input=page.getByLabel('رابط الدعوة الجديد',{exact:true});const link=await input.inputValue();
  assert.match(link,/^http:\/\/127\.0\.0\.1:4180\/join\/[A-Za-z0-9_-]+$/);
  await input.locator('..').getByRole('button',{name:'نسخ الرابط',exact:true}).click();
  await page.getByRole('status').filter({hasText:'تم نسخ رابط الدعوة.'}).waitFor();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),link);assert.equal(emailRequests,0);assert.deepEqual(errors,[]);
  fs.writeFileSync('verification-results/manual-invite-ui.json',JSON.stringify({passed:true,realBackend:true,linkCreated:true,clipboardVerified:true,emailRequests:0,clientErrors:errors},null,2));
  console.log('PASS manual invitation: real link created and copied without an email request');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
