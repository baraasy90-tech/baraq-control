import {it,expect,vi} from 'vitest';
import {createFileUploadCache} from './fileUploadCache';
it('reuploads after the server reports a missing cached file',async()=>{
 const upload=vi.fn().mockResolvedValueOnce('old').mockResolvedValueOnce('new');const cached=createFileUploadCache<object>(upload);const file={};
 expect(await cached(file)).toBe('old');cached.clear();expect(await cached(file)).toBe('new');expect(upload).toHaveBeenCalledTimes(2);
});
it('reuses one upload and the same path across concurrent calls and form retries',async()=>{
 const upload=vi.fn(async()=> 'actor/stable-path.png');const cached=createFileUploadCache(upload);const file={};
 expect(await Promise.all([cached(file),cached(file)])).toEqual(['actor/stable-path.png','actor/stable-path.png']);
 expect(await cached(file)).toBe('actor/stable-path.png');expect(upload).toHaveBeenCalledTimes(1);
});
it('retries a failed upload but never reuses another file result',async()=>{
 const upload=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('first').mockResolvedValueOnce('second');
 const cached=createFileUploadCache<object>(upload);const first={};
 await expect(cached(first)).rejects.toThrow('offline');expect(await cached(first)).toBe('first');expect(await cached({})).toBe('second');expect(upload).toHaveBeenCalledTimes(3);
});
