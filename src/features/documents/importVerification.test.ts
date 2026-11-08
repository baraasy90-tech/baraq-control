import {expect,it} from 'vitest';
import {buildImportReceipt,verifyImportedCopy} from './importVerification';
import type {ImportJob} from './importUpload';
it('verifies bytes and records the scope of the source check',async()=>{
 const source=new File(['copy bytes'],'model.rvt',{lastModified:100});
 expect(await verifyImportedCopy(source,new Blob(['copy bytes']))).toMatchObject({bytes:10,sourceCheck:'selected-snapshot',sourceRetained:true});
 expect(await verifyImportedCopy(source,new Blob(['copy bytes']),async()=>source)).toMatchObject({sourceCheck:'live-handle'});
});
it('rejects same-sized corruption and a changing live source',async()=>{
 const source=new File(['abcdef'],'a.txt',{lastModified:100});
 await expect(verifyImportedCopy(source,new Blob(['abcdeg']))).rejects.toThrow('بايتات');
 await expect(verifyImportedCopy(source,new Blob(['abcdef']),async()=>new File(['abcdeg'],'a.txt',{lastModified:100}))).rejects.toThrow('تغير');
});
it('does not certify partial or unverified copies in the receipt',()=>{
 const job={id:'synthetic',path:['a.txt'],file:new File(['a'],'a.txt'),status:'done'} as ImportJob;
 expect(buildImportReceipt([job],'project',null).complete).toBe(false);
 job.verification={bytes:1,crc32:'e8b7be43',verifiedAt:'test',sourceCheck:'selected-snapshot',sourceRetained:true};
 expect(buildImportReceipt([job],'project',null).complete).toBe(true);
 job.status='error';expect(buildImportReceipt([job],'project',null).files[0].verification).toBeNull();
});
