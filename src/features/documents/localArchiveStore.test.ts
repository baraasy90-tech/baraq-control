import {expect,it} from 'vitest';import {validateLocalSegment} from './localArchiveStore';
it('rejects traversal and path separators before accessing device storage',()=>{for(const value of ['','..','.','a/b','a\\b','x\0','x.','x '])expect(()=>validateLocalSegment(value)).toThrow();expect(validateLocalSegment('مخطط.dwg')).toBe('مخطط.dwg');});
