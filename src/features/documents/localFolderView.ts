export interface LocalFolderRow {name:string;kind:'file'|'directory'}
const collator=new Intl.Collator('ar',{numeric:true,sensitivity:'base'});
const key=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('ar');
/** Display only: never changes names or paths used by filesystem operations. */
export function localFolderPage(rows:LocalFolderRow[],query:string,page:number){
 const term=key(query.trim());
 const matches=rows.filter(row=>!term||key(row.name).includes(term)).sort((a,b)=>
  a.kind!==b.kind?(a.kind==='directory'?-1:1):collator.compare(a.name,b.name)||a.name.localeCompare(b.name));
 const pages=Math.max(1,Math.ceil(matches.length/100));
 const current=Math.min(pages-1,Math.max(0,Number.isSafeInteger(page)?page:0));
 return {rows:matches.slice(current*100,(current+1)*100),total:matches.length,page:current,pages};
}
