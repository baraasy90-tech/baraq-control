import {expect,it} from 'vitest';import {listLocalRecovery,validateLocalSegment} from './localArchiveStore';
it('rejects traversal and path separators before accessing device storage',()=>{for(const value of ['','..','.','a/b','a\\b','x\0','x.','x '])expect(()=>validateLocalSegment(value)).toThrow();expect(validateLocalSegment('مخطط.dwg')).toBe('مخطط.dwg');});

it('does not hide denied recovery access as an empty list',async()=>{
 const root={async *values(){yield {kind:'directory',name:'.baraq-recovery-00000000-0000-0000-0000-000000000000'};},async getDirectoryHandle(){throw new DOMException('Denied','NotAllowedError');}} as unknown as FileSystemDirectoryHandle;
 await expect(listLocalRecovery(root)).rejects.toMatchObject({name:'NotAllowedError'});
});
it('ignores incomplete recovery points without a descriptor',async()=>{
 const root={async *values(){yield {kind:'directory',name:'.baraq-recovery-00000000-0000-0000-0000-000000000000'};},async getDirectoryHandle(){return {async getFileHandle(){throw new DOMException('Missing','NotFoundError');}};}} as unknown as FileSystemDirectoryHandle;
 await expect(listLocalRecovery(root)).resolves.toEqual([]);
});
