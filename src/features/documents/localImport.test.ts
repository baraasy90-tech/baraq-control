import {expect,it} from 'vitest';
import {localImportReceipt,localImportJobs} from './localImport';
it('preserves local folder paths and empty directory entries',()=>{expect(localImportJobs([{path:['Project','Empty']},{path:['Project','a.rvt'],file:new File(['bytes'],'a.rvt')}]).map(job=>job.path)).toEqual([['Project','Empty'],['Project','a.rvt']]);});
it('does not impose cloud upload size limits on local files',()=>{expect(localImportJobs([{path:['large.rvt'],file:{name:'large.rvt',size:51*1024*1024,type:'application/octet-stream'} as File}])).toHaveLength(1);});
it('rejects duplicate names, traversal and file-directory collisions before copying',()=>{
 expect(()=>localImportJobs([{path:['../a.txt'],file:new File(['a'],'a.txt')}])).toThrow();
 expect(()=>localImportJobs([{path:['a.txt'],file:new File(['a'],'a.txt')},{path:['A.txt'],file:new File(['b'],'A.txt')}])).toThrow();
 expect(()=>localImportJobs([{path:['folder'],file:new File(['a'],'folder')},{path:['folder','a.txt'],file:new File(['a'],'a.txt')}])).toThrow();
});

it('does not label a partial folder copy complete or include source bytes in its report',()=>{const jobs=localImportJobs([{path:['Project']},{path:['Project','a.txt'],file:new File(['confidential payload'],'a.txt')}]);jobs[0].status='done';expect(localImportReceipt(jobs).complete).toBe(false);expect(JSON.stringify(localImportReceipt(jobs))).not.toContain('confidential payload');jobs[1].status='done';expect(localImportReceipt(jobs).complete).toBe(true);});
