import { expect, it } from 'vitest';
import { droppedImportEntries, pickedImportEntries, directoryImportEntries, validateImportPath, type PickedDirectory } from './importEntries';
it('preserves picker folder hierarchy and rejects traversal',()=>{
  const file={name:'a.rvt',webkitRelativePath:'Project/Models/a.rvt'} as File;
  expect(pickedImportEntries([file])[0].path).toEqual(['Project','Models','a.rvt']);
  for(const path of [['..','a'],['a/b'],[''],['x\\y'],Array(65).fill('a')])expect(()=>validateImportPath(path)).toThrow();
});
it('drains every directory reader batch and preserves empty folders',async()=>{
  let calls=0;const fileEntry=(name:string)=>({name,isFile:true,isDirectory:false,file:(done:(file:File)=>void)=>done({name} as File)});
  const empty={name:'Empty',isFile:false,isDirectory:true,createReader:()=>({readEntries:(done:(entries:unknown[])=>void)=>done([])})};
  const root={name:'Project',isFile:false,isDirectory:true,createReader:()=>({readEntries:(done:(entries:unknown[])=>void)=>done(calls++===0?[fileEntry('a.dwg')]:calls===2?[fileEntry('b.xer'),empty]:[])})};
  const items=[{kind:'file',webkitGetAsEntry:()=>root,getAsFile:()=>null}] as unknown as DataTransferItemList;
  expect((await droppedImportEntries(items,[] as unknown as FileList)).map(entry=>entry.path.join('/'))).toEqual(['Project','Project/a.dwg','Project/b.xer','Project/Empty']);
});
it('fails the whole selection on directory read errors',async()=>{
  const items=[{kind:'file',getAsFile:()=>null,webkitGetAsEntry:()=>({name:'Project',isDirectory:true,createReader:()=>({readEntries:(_done:unknown,fail:(e:Error)=>void)=>fail(new Error('unreadable'))})})}] as unknown as DataTransferItemList;
  await expect(droppedImportEntries(items,[] as unknown as FileList)).rejects.toThrow('unreadable');
});
it('imports empty folders through the directory handle picker',async()=>{
  const empty:PickedDirectory={kind:'directory',name:'Empty',async *values(){}};
  const root:PickedDirectory={kind:'directory',name:'Project',async *values(){yield empty;yield {kind:'file',name:'a.rvt',getFile:async()=>({name:'a.rvt'} as File)};}};
  expect((await directoryImportEntries(root)).map(entry=>entry.path.join('/'))).toEqual(['Project','Project/Empty','Project/a.rvt']);
});
