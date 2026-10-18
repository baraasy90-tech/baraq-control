const fs=require('fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const cfg=JSON.parse(fs.readFileSync('.verification/local-stack/connection.json','utf8'));
assert.equal(cfg.API_URL,'http://127.0.0.1:54321');
const users=JSON.parse(fs.readFileSync('.verification/local-stack/browser-users.json','utf8'));
const user=users.find(u=>u.role==='owner'),other=users.find(u=>u.role==='individual');
assert.ok(user.email.endsWith('@example.invalid')&&other.email.endsWith('@example.invalid'));
const make=key=>createClient(cfg.API_URL,key,{auth:{persistSession:false}}),client=make(cfg.ANON_KEY),outsider=make(cfg.ANON_KEY),admin=make(cfg.SERVICE_ROLE_KEY);
const ok=r=>{if(r.error)throw new Error(r.error.message);return r.data;};
let browser,projectId,sharedPath,foreignFolderId,foreignPath;const checks=[],errors=[];let stage='setup';
(async()=>{
 const signed=ok(await client.auth.signInWithPassword({email:user.email,password:user.password}));
 const foreignSigned=ok(await outsider.auth.signInWithPassword({email:other.email,password:other.password}));
 const companyId=ok(await client.from('profiles').select('company_id').eq('id',signed.user.id).single()).company_id;
 projectId=ok(await client.from('projects').insert({company_id:companyId,name:'Synthetic archive '+crypto.randomUUID()}).select('id').single()).id;
 try{
  const createFolder=async(name,parent=null)=>ok(await client.from('document_folders').insert({project_id:projectId,name,parent_folder_id:parent}).select('id').single()).id;
  const root=await createFolder('الأرشيف التجريبي'),child=await createFolder('عقود الاستشاري',root),misc=await createFolder('مراسلات',root);
  sharedPath=`${signed.user.id}/archive-${crypto.randomUUID()}.txt`;
  ok(await client.storage.from('documents').upload(sharedPath,Buffer.from('Synthetic archive content'),{contentType:'text/plain'}));
  const specialName='إعْتماد مخططات 100% [نهائي].PDF';
  ok(await client.from('documents').insert([{folder_id:child,name:specialName,file_url:sharedPath},{folder_id:misc,name:'محضر اجتماع.txt',file_url:sharedPath}]));
  for(let start=0;start<620;start+=100)ok(await client.from('documents').insert(Array.from({length:Math.min(100,620-start)},(_,i)=>({folder_id:child,name:`ArchiveBatch ${String(start+i).padStart(4,'0')}.txt`,file_url:sharedPath}))));
  const foreignProject=ok(await outsider.from('projects').select('id').limit(1).single());
  foreignFolderId=ok(await outsider.from('document_folders').insert({project_id:foreignProject.id,name:'Synthetic foreign archive '+crypto.randomUUID()}).select('id').single()).id;
  foreignPath=`${foreignSigned.user.id}/archive-${crypto.randomUUID()}.txt`;
  ok(await outsider.storage.from('documents').upload(foreignPath,Buffer.from('Synthetic foreign archive'),{contentType:'text/plain'}));
  ok(await outsider.from('documents').insert({folder_id:foreignFolderId,name:'ArchiveBatch FOREIGN.txt',file_url:foreignPath}));
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  await context.addInitScript(s=>sessionStorage.setItem('sb-127-auth-token',JSON.stringify(s)),signed.session);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const origin=`http://127.0.0.1:4180/projects/${projectId}/documents`;
  stage='tree';await page.goto(origin);const tree=page.getByRole('navigation',{name:'شجرة مجلدات المشروع'});
  await tree.getByRole('button',{name:'توسيع الأرشيف التجريبي',exact:true}).click();
  await tree.getByRole('button',{name:'فتح مجلد عقود الاستشاري',exact:true}).click();
  await page.waitForURL('**/documents?folder='+child);await page.getByRole('navigation',{name:'مسار المجلد الحالي'}).getByRole('button',{name:'عقود الاستشاري',exact:true}).waitFor();
  await page.reload();await page.getByRole('navigation',{name:'مسار المجلد الحالي'}).getByRole('button',{name:'عقود الاستشاري',exact:true}).waitFor();checks.push('nested-tree-navigation-and-folder-survives-reload');
  stage='search';const search=page.getByLabel('البحث في الأرشيف',{exact:true});await search.fill('اعتماد مخططات');
  let results=page.getByRole('region',{name:'نتائج بحث الأرشيف'});await results.getByRole('button',{name:specialName,exact:true}).waitFor();checks.push('Arabic-normalized-search-across-project');
  await page.getByLabel('نوع الملف',{exact:true}).selectOption('pdf');await results.getByRole('status').filter({hasText:'1 نتيجة'}).waitFor();checks.push('PDF-filter');
  await search.fill('100% [نهائي]');await results.getByRole('button',{name:specialName,exact:true}).waitFor();checks.push('literal-search-special-characters');
  await page.getByLabel('نوع الملف',{exact:true}).selectOption('all');await search.fill('استشاري');await results.getByText('الأرشيف التجريبي / عقود الاستشاري',{exact:true}).first().waitFor();checks.push('search-by-folder-path');
  await search.fill('محضر');await results.getByRole('button',{name:'محضر اجتماع.txt',exact:true}).waitFor();
  const opened=page.waitForEvent('popup');await results.getByRole('button',{name:'محضر اجتماع.txt',exact:true}).click();const tab=await opened;await tab.getByText('Synthetic archive content',{exact:true}).waitFor();await tab.close();checks.push('search-file-opens-fresh-private-link');
  await results.getByRole('button',{name:'فتح المجلد الحاوي',exact:true}).click();await page.waitForURL('**/documents?folder='+misc);assert.equal(await search.inputValue(),'');checks.push('search-result-opens-containing-folder');
  stage='pagination';await search.fill('ArchiveBatch');results=page.getByRole('region',{name:'نتائج بحث الأرشيف'});await results.getByRole('status').filter({hasText:'620 نتيجة'}).waitFor();assert.equal(await results.locator('li').count(),50);await results.getByRole('button',{name:/عرض المزيد/}).click();assert.equal(await results.locator('li').count(),100);checks.push('all-620-records-read-and-results-paginated');
  stage='upload';await page.getByRole('button',{name:'مسح البحث',exact:true}).click();await page.locator('input[type=file]').setInputFiles({name:'ArchiveNew.txt',mimeType:'text/plain',buffer:Buffer.from('New synthetic upload')});await page.getByRole('main').getByRole('button',{name:/^ArchiveNew\.txt/}).waitFor();
  await search.fill('ArchiveNew');results=page.getByRole('region',{name:'نتائج بحث الأرشيف'});await results.getByRole('button',{name:'ArchiveNew.txt',exact:true}).waitFor();checks.push('upload-invalidates-search-index');
  await page.getByRole('button',{name:'مسح البحث',exact:true}).click();const uploadedRow=page.getByRole('main').locator('div').filter({has:page.getByRole('button',{name:/^ArchiveNew\.txt/})});
  const deleteId=ok(await client.from('documents').select('id').eq('folder_id',misc).eq('name','ArchiveNew.txt').single()).id;
  // Exercise the existing delete UI and check that cached search does not resurrect the file.
  await uploadedRow.filter({has:page.getByRole('button',{name:'حذف',exact:true})}).last().getByRole('button',{name:'حذف',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'حذف نهائياً',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(ok(await client.from('documents').select('id').eq('id',deleteId)).length,0);await search.fill('ArchiveNew');await results.getByRole('status').filter({hasText:'0 نتيجة'}).waitFor();checks.push('delete-invalidates-search-index');
  stage='failure';await page.route('**/rest/v1/documents?*',r=>r.fulfill({status:503,contentType:'application/json',body:'{"message":"Synthetic archive read failure"}'}));
  await page.reload();await page.getByLabel('البحث في الأرشيف',{exact:true}).fill('محضر');await page.getByRole('button',{name:'إعادة البحث',exact:true}).waitFor();await page.unroute('**/rest/v1/documents?*');await page.getByRole('button',{name:'إعادة البحث',exact:true}).click();await page.getByRole('region',{name:'نتائج بحث الأرشيف'}).getByRole('button',{name:'محضر اجتماع.txt',exact:true}).waitFor();checks.push('failed-index-never-shown-as-empty-and-retry-recovers');
  stage='scope';assert.equal(ok(await outsider.from('documents').select('id').eq('folder_id',foreignFolderId)).length,1);
  assert.equal(ok(await client.from('documents').select('id').eq('folder_id',foreignFolderId)).length,0);
  await page.goto(origin+'?folder='+foreignFolderId);await page.getByRole('status').filter({hasText:'المجلد المطلوب غير متاح'}).waitFor();checks.push('foreign-folder-link-and-RLS-denied');
  stage='mobile';for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.goto(origin+'?folder='+child);await page.getByRole('navigation',{name:'شجرة مجلدات المشروع'}).waitFor();await page.getByLabel('البحث في الأرشيف',{exact:true}).fill('اعتماد');await page.getByRole('region',{name:'نتائج بحث الأرشيف'}).getByRole('button',{name:specialName,exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:`verification-results/archive-${width}.png`,fullPage:true});checks.push('responsive-archive-'+width);}
  assert.deepEqual(errors,[]);fs.writeFileSync('verification-results/document-archive.json',JSON.stringify({passed:true,checks,productionDataUsed:false,controlledReadFailure:true,errors},null,2));console.log(JSON.stringify({passed:true,checks}));
 }finally{
  if(browser)await browser.close();
  if(projectId){const folders=ok(await admin.from('document_folders').select('id').eq('project_id',projectId));const paths=[];for(const f of folders)paths.push(...ok(await admin.from('documents').select('file_url').eq('folder_id',f.id)).map(d=>d.file_url));ok(await admin.from('projects').delete().eq('id',projectId));if(sharedPath)paths.push(sharedPath);if(paths.length)ok(await admin.storage.from('documents').remove([...new Set(paths)]));}
  if(foreignFolderId)ok(await admin.from('document_folders').delete().eq('id',foreignFolderId));
  if(foreignPath)ok(await admin.storage.from('documents').remove([foreignPath]));
  await Promise.all([client.auth.signOut(),outsider.auth.signOut()]);
 }
})().catch(()=>{console.error('Archive verification failed at stage: '+stage);process.exitCode=1;});
