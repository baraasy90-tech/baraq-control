import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=JSON.parse(fs.readFileSync('verification-results/schema-snapshot-20261012.json','utf8')).schema;
const extra=JSON.parse(fs.readFileSync('verification-results/schema-extra-20261012.json','utf8'));
const actual=JSON.parse(fs.readFileSync(process.argv[2]??'.verification/local-stack/local-schema.json','utf8').replace(/^\uFEFF/,''));
const normalize=value=>typeof value==='string'?value.replaceAll('\r\n','\n'):Array.isArray(value)?value.map(normalize):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,normalize(v)])):value;
const sorted=rows=>(rows??[]).map(normalize).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
const checks=[];
for(const list of [source.functions,actual.functions]) for(const f of list) if(f.acl) f.acl.sort();
// Dropped historical columns leave attnum gaps; compare the order of live columns.
for(const list of [extra.columns,actual.columns]){
 const counters=new Map();
 for(const c of [...list].sort((a,b)=>a.table.localeCompare(b.table)||a.position-b.position)){
  const next=(counters.get(c.table)??0)+1;counters.set(c.table,next);c.position=next;
 }
}
for(const key of ['tables','functions','policies','constraints','indexes','triggers','grants','columns']){
 const expected=key==='columns'?extra.columns:source[key];
 assert.deepEqual(sorted(actual[key]),sorted(expected),key+' differs from production metadata');
 checks.push({group:key,count:actual[key].length,passed:true});
}
fs.writeFileSync('verification-results/baseline-comparison.json',JSON.stringify({checks,source:'production schema metadata 2026-10-12',target:'isolated local Supabase',dataBackupVerified:false},null,2));
console.log(JSON.stringify(checks));
