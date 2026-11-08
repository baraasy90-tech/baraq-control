import {expect,it} from 'vitest';
import {indexLocalText,searchLocalText} from './localTextIndex';
const signal=()=>new AbortController().signal;
it('refuses an incomplete search after the index quota is exceeded',async()=>{
 const root={async *values(){for(let i=0;i<201;i++)yield {kind:'file',name:`.baraq-text-index-${i}.json`};},async getFileHandle(){return {async getFile(){return new File(['{}'],'invalid.json');}};}} as unknown as FileSystemDirectoryHandle;
 await expect(searchLocalText(root,'search',signal())).rejects.toThrow('200');
});
it('does not write a new index when its capacity is already reached',async()=>{
 const root={async *values(){for(let i=0;i<200;i++)yield {kind:'file',name:`.baraq-text-index-${i}.json`};},async getFileHandle(){throw new Error('Unexpected file access');}} as unknown as FileSystemDirectoryHandle;
 await expect(indexLocalText(root,[],'source.txt',signal())).rejects.toThrow('200');
});
it('does not index archive internal folders or traverse outside the destination',async()=>{
 const root={} as FileSystemDirectoryHandle;
 await expect(indexLocalText(root,['.baraq-recovery-example'],'recovery.json',signal())).rejects.toThrow();
 await expect(indexLocalText(root,[],'../source.txt',signal())).rejects.toThrow();
});
