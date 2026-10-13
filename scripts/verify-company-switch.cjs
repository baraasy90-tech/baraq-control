const fs=require('node:fs'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
if(!process.env.PLAYWRIGHT_MODULE)throw Error('Set PLAYWRIGHT_MODULE');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const user=JSON.parse(fs.readFileSync('.verification/local-stack/browser-users.json','utf8')).find(u=>u.role==='member');
assert.match(user.id,/^[a-f0-9-]{36}$/i);
const sql=statement=>{const r=spawnSync('docker',['exec','supabase_db_local-stack','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',statement],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
(async()=>{
 const original=sql(`SELECT company_id FROM public.profiles WHERE id='${user.id}';`);assert.match(original,/^[a-f0-9-]{36}$/i);
 const targetName=sql("SELECT name FROM public.companies WHERE id='10000000-0000-0000-0000-000000000102';");
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  const page=await context.newPage();await page.clock.install();
  await page.goto('http://127.0.0.1:4180/');await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).click();
  await page.getByLabel('البريد الإلكتروني',{exact:true}).fill(user.email);await page.getByLabel('كلمة المرور',{exact:true}).fill(user.password);await page.locator('button[type=submit]').click();
  await page.getByRole('button',{name:'تسجيل الخروج',exact:true}).waitFor();
  await page.goto('http://127.0.0.1:4180/projects/10000000-0000-0000-0000-000000000201/budget');
  await page.getByRole('heading',{name:/Synthetic corporate project/}).waitFor();
  await page.evaluate(targetName=>{
   window.__scopeLeak=false;
   new MutationObserver(()=>{
    const text=document.body.innerText;
    if(text.includes(targetName)&&text.includes('Synthetic corporate project'))window.__scopeLeak=true;
   }).observe(document.body,{subtree:true,childList:true,characterData:true});
  },targetName);
  sql(`BEGIN;SET LOCAL session_replication_role=replica;UPDATE public.profiles SET company_id='10000000-0000-0000-0000-000000000102' WHERE id='${user.id}';COMMIT;`);
  // Exercise the actual profile polling interval. A visibilitychange event
  // while the document stays visible does not trigger a React Query refetch.
  await page.clock.fastForward(8 * 60_000 + 1000);
  await page.getByText(targetName,{exact:true}).first().waitFor({timeout:30000});
  assert.equal(new URL(page.url()).pathname,'/');
  assert.ok(!(await page.locator('body').innerText()).includes('Synthetic corporate project'));
  assert.equal(await page.evaluate(()=>window.__scopeLeak),false);
  fs.writeFileSync('verification-results/company-switch.json',JSON.stringify({passed:true,sameSignedInIdentity:true,oldTenantCacheRemoved:true,oldProjectRouteReplaced:true,noMixedTenantFrame:true},null,2));
  console.log('PASS company switch with same signed-in user: old cache and project route discarded');
 }finally{
  sql(`BEGIN;SET LOCAL session_replication_role=replica;UPDATE public.profiles SET company_id='${original}' WHERE id='${user.id}';COMMIT;`);
  await browser.close();
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
