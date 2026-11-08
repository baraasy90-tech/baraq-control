import {expect,it} from 'vitest';
import {planImportCopy} from './importCopyPlan';
const file=(name:string)=>new File(['test'],name);
it('counts distinct parents, empty folders, bytes and source verification modes',()=>{
 expect(planImportCopy([{path:['Project','Empty']},{path:['Project','a.txt'],file:file('a.txt'),getCurrentFile:async()=>file('a.txt')},{path:['Project','b.txt'],file:file('b.txt')}])).toEqual({files:2,folders:2,bytes:8,liveSources:1,snapshotSources:1});
});
it('rejects duplicate files and case-equivalent path collisions before writing',()=>{
 expect(()=>planImportCopy([{path:['a.txt'],file:file('a.txt')},{path:['a.txt'],file:file('a.txt')}])).toThrow('تعارض');
 expect(()=>planImportCopy([{path:['Folder','a.txt'],file:file('a.txt')},{path:['folder','b.txt'],file:file('b.txt')}])).toThrow('تعارض');
});
it('rejects file-directory conflicts regardless of the ordering',()=>{
 for(const entries of [[{path:['same'],file:file('same')},{path:['same','a.txt'],file:file('a.txt')}],[{path:['same','a.txt'],file:file('a.txt')},{path:['same'],file:file('same')}]] )expect(()=>planImportCopy([...entries])).toThrow('تعارض');
});
it('rejects mismatched names and hidden oversized directory expansion',()=>{
 expect(()=>planImportCopy([{path:['other.txt'],file:file('a.txt')}])).toThrow('اسم الملف');
 expect(()=>planImportCopy(Array.from({length:2501},(_,i)=>({path:['folder-'+i,'a.txt'],file:file('a.txt')})))).toThrow('5000');
});

it('rejects an oversized source before the confirmation stage',()=>{expect(()=>planImportCopy([{path:['large.rvt'],file:{name:'large.rvt',size:50*1024*1024+1,type:'application/octet-stream'} as File}])).toThrow('50');});
