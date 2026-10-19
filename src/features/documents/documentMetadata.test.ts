import {describe,it,expect} from 'vitest';
import {cleanDocumentMetadata} from './documentMetadata';
import {searchArchive} from './archiveIndex';
import type {ProjectDocument} from '@/types/domain';
const empty={category:null,referenceNumber:null,description:null,documentDate:null};
describe('document metadata',()=>{
 it('keeps optional fields empty and trims entered text',()=>{expect(cleanDocumentMetadata({...empty,referenceNumber:'  RFI-01 ',description:'  اعتماد  '})).toEqual({...empty,referenceNumber:'RFI-01',description:'اعتماد'});expect(cleanDocumentMetadata({...empty,referenceNumber:' '})).toEqual(empty);});
 it('rejects impossible and noncanonical dates',()=>{for(const documentDate of ['2026-02-29','2026-04-31','0000-01-01','2026-1-1','infinity'])expect(()=>cleanDocumentMetadata({...empty,documentDate})).toThrow();expect(cleanDocumentMetadata({...empty,documentDate:'2024-02-29'}).documentDate).toBe('2024-02-29');});
 it('validates categories and limits before saving',()=>{expect(()=>cleanDocumentMetadata({...empty,category:'invalid' as 'drawing'})).toThrow();expect(()=>cleanDocumentMetadata({...empty,referenceNumber:'أ'.repeat(121)})).toThrow();expect(()=>cleanDocumentMetadata({...empty,description:'أ'.repeat(2001)})).toThrow();expect(()=>cleanDocumentMetadata({...empty,description:'أ'.repeat(2000)})).not.toThrow();});
 const folders=[{id:'f',projectId:'p',parentFolderId:null,name:'المشروع'}];
 const doc:ProjectDocument={id:'d',folderId:'f',name:'scan.pdf',fileUrl:'private',uploadedAt:'2026-10-19',category:'drawing',referenceNumber:'RFI-001',documentDate:'2026-10-19',description:'اعتماد سقف الطابق الأول'};
 it('finds user-entered descriptions references dates and category labels',()=>{for(const query of ['سقف اول','RFI-001','2026-10-19','مخططات'])expect(searchArchive(folders,[doc],query,'all').documents).toHaveLength(1);});
 it('combines classification and format filters without leaking foreign documents',()=>{const docs=[doc,{...doc,id:'foreign',folderId:'outside'}];expect(searchArchive(folders,docs,'RFI','pdf','drawing').documents.map(d=>d.id)).toEqual(['d']);expect(searchArchive(folders,docs,'','image','drawing').documents).toHaveLength(0);expect(searchArchive(folders,docs,'','all','report').documents).toHaveLength(0);expect(searchArchive(folders,docs,'','all','drawing').folders).toHaveLength(0);});
});
