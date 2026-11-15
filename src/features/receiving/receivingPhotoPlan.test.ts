import {expect,it} from 'vitest';
import {receivingPhotoPaths,receivingPhotoExtension} from './receivingPhotoPlan';
it('normalizes expired links and copies a reused photo only once',()=>{
 expect(receivingPhotoPaths(['a/b.png',null,'https://example.invalid/storage/v1/object/sign/checklist-photos/a%2Fb.png?token=expired','x.jpg'])).toEqual(['a/b.png','x.jpg']);
});
it('refuses more than 100 unique photos without silently truncating',()=>{
 expect(()=>receivingPhotoPaths(Array.from({length:101},(_,i)=>`${i}.png`))).toThrow(/100/);
});
it('uses safe photo extensions and falls back to a download for active formats',()=>{
 expect(receivingPhotoExtension('a/IMAGE.JPG')).toBe('jpg');
 expect(receivingPhotoExtension('a/image.svg')).toBe('bin');
});
