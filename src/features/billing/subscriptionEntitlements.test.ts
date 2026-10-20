import {describe,it,expect} from 'vitest';
import {entitlementDraft,parseEntitlementDraft,entitlementComplete,entitlementResponseSchema} from './subscriptionEntitlements';
describe('subscription commitments',()=>{
 it('leaves unapproved values unset rather than unlimited',()=>{expect(parseEntitlementDraft(entitlementDraft(null))).toEqual({package_name:null,max_file_mib:null,storage_gib:null,annual_transfer_gib:null,max_users:null});expect(entitlementComplete(null)).toBe(false);});
 it('rejects zero negative fractional and unsafe limits',()=>{for(const max_users of ['0','-1','1.5','1e3','Infinity','2147483648'])expect(()=>parseEntitlementDraft({...entitlementDraft(null),max_users})).toThrow();});
 it('checks file size against total storage with consistent units',()=>{expect(()=>parseEntitlementDraft({...entitlementDraft(null),max_file_mib:'1025',storage_gib:'1'})).toThrow();expect(parseEntitlementDraft({...entitlementDraft(null),max_file_mib:'1024',storage_gib:'1'}).max_file_mib).toBe(1024);});
 it('trims names and validates name length',()=>{expect(parseEntitlementDraft({...entitlementDraft(null),package_name:'  باقة سنوية  '}).package_name).toBe('باقة سنوية');expect(()=>parseEntitlementDraft({...entitlementDraft(null),package_name:'أ'.repeat(101)})).toThrow();});
 it('rejects malformed server data rather than presenting empty commitments',()=>{expect(()=>entitlementResponseSchema.parse({current:{max_users:-1},history:[]})).toThrow();expect(entitlementResponseSchema.parse({current:null,history:[]}).current).toBeNull();});
});
