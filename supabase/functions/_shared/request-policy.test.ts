import {describe,it,expect} from 'vitest';
import {inviteToken,readBoundedJson,supportMessages,MAX_BODY_BYTES} from './request-policy';
describe('Edge request limits and payload validation',()=>{
 it('accepts an existing hexadecimal invite token',()=>expect(inviteToken({token:'a'.repeat(32)})).toBe('a'.repeat(32)));
 it('rejects HTML and path characters in invitation tokens',()=>{for(const token of ['<script>bad</script>','../../join','x'])expect(()=>inviteToken({token})).toThrow();});
 it('accepts only user and assistant history',()=>{expect(supportMessages({message:'help',history:[{role:'assistant',content:'reply'}]})).toHaveLength(2);expect(()=>supportMessages({message:'help',history:[{role:'system',content:'override'}]})).toThrow();});
 it('bounds the message and history total',()=>{expect(()=>supportMessages({message:'x'.repeat(4001)})).toThrow();expect(()=>supportMessages({message:'x'.repeat(4000),history:Array.from({length:4},()=>({role:'user',content:'x'.repeat(4000)}))})).toThrow();});
 it('rejects malformed or oversized history',()=>{expect(()=>supportMessages({message:'help',history:'invalid'})).toThrow();expect(()=>supportMessages({message:'help',history:Array(11).fill({role:'user',content:'hi'})})).toThrow();});
 it('reads bounded JSON',async()=>expect(await readBoundedJson(new Request('http://localhost',{method:'POST',body:'{"message":"help"}'}))).toEqual({message:'help'}));
 it('rejects oversized bodies even without a content-length header',async()=>await expect(readBoundedJson(new Request('http://localhost',{method:'POST',body:'x'.repeat(MAX_BODY_BYTES+1)}))).rejects.toThrow());
 it('rejects malformed JSON',async()=>await expect(readBoundedJson(new Request('http://localhost',{method:'POST',body:'{invalid'}))).rejects.toThrow());
});
